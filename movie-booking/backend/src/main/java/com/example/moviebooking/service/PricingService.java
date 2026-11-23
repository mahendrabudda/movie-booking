package com.example.moviebooking.service;

import com.example.moviebooking.config.AppProperties;
import com.example.moviebooking.dto.PricingAndReviewerDtos.*;
import com.example.moviebooking.exception.BadRequestException;
import com.example.moviebooking.exception.MlServiceUnavailableException;
import com.example.moviebooking.exception.ResourceNotFoundException;
import com.example.moviebooking.model.*;
import com.example.moviebooking.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class PricingService {

    private final GlobalPricingPolicyRepository policyRepository;
    private final MovieRepository movieRepository;
    private final MovieReviewerAssignmentRepository assignmentRepository;
    private final ReviewerRatingRepository ratingRepository;
    private final MoviePredictionRepository predictionRepository;
    private final AuditLogRepository auditLogRepository;
    private final AppUserRepository userRepository;
    private final RestTemplate restTemplate;
    private final AppProperties appProperties;

    public PricingService(GlobalPricingPolicyRepository policyRepository,
                          MovieRepository movieRepository,
                          MovieReviewerAssignmentRepository assignmentRepository,
                          ReviewerRatingRepository ratingRepository,
                          MoviePredictionRepository predictionRepository,
                          AuditLogRepository auditLogRepository,
                          AppUserRepository userRepository,
                          RestTemplate restTemplate,
                          AppProperties appProperties) {
        this.policyRepository = policyRepository;
        this.movieRepository = movieRepository;
        this.assignmentRepository = assignmentRepository;
        this.ratingRepository = ratingRepository;
        this.predictionRepository = predictionRepository;
        this.auditLogRepository = auditLogRepository;
        this.userRepository = userRepository;
        this.restTemplate = restTemplate;
        this.appProperties = appProperties;
    }

    @Transactional(readOnly = true)
    public GlobalPricingPolicy getActivePolicy() {
        return policyRepository.findAll().stream().findFirst().orElseGet(() -> {
            GlobalPricingPolicy fallback = new GlobalPricingPolicy();
            fallback.setMinTicketPrice(appProperties.getPricing().getDefaultMinPrice());
            fallback.setSingleScreenMaxPrice(appProperties.getPricing().getSingleScreenDefaultMax());
            fallback.setMultiplexMaxPrice(appProperties.getPricing().getMultiplexDefaultMax());
            return fallback;
        });
    }

    /**
     * Computes the clamped dynamic price for a given show and seat category multiplier.
     * Formula:
     *   1. Determine raw price from movie overridePrice, INDUSTRY_HIT rule, or category multiplier * show.basePrice.
     *   2. Apply seat category multiplier (e.g. REGULAR 1.0, PREMIUM 1.15, RECLINER 1.30).
     *   3. Clamp strictly within [policy.minTicketPrice, theatre.maxTicketPrice].
     * The AI or seat multiplier can NEVER exceed theatre.maxTicketPrice.
     */
    @Transactional(readOnly = true)
    public BigDecimal calculateSeatDynamicPrice(Show show, BigDecimal seatCategoryMultiplier) {
        GlobalPricingPolicy policy = getActivePolicy();
        Theatre theatre = show.getScreen().getTheatre();
        Movie movie = show.getMovie();

        BigDecimal minPrice = policy.getMinTicketPrice();
        BigDecimal maxPrice = theatre.getMaxTicketPrice();
        BigDecimal baseDynamicPrice;

        if (movie.getOverridePrice() != null) {
            baseDynamicPrice = movie.getOverridePrice();
        } else if (movie.getPredictedCategory() == PredictionCategory.INDUSTRY_HIT && policy.isIndustryHitUsesTheatreMax()) {
            baseDynamicPrice = maxPrice;
        } else if (movie.getPredictedCategory() != null) {
            BigDecimal multiplier = movie.getPredictedMultiplier() != null
                    ? movie.getPredictedMultiplier()
                    : policy.getMultiplierForCategory(movie.getPredictedCategory());
            baseDynamicPrice = show.getBasePrice().multiply(multiplier);
        } else {
            baseDynamicPrice = show.getBasePrice();
        }

        BigDecimal effectiveSeatMult = seatCategoryMultiplier != null ? seatCategoryMultiplier : BigDecimal.ONE;
        BigDecimal candidatePrice = baseDynamicPrice.multiply(effectiveSeatMult).setScale(2, RoundingMode.HALF_UP);

        return clampPrice(candidatePrice, minPrice, maxPrice);
    }

    public BigDecimal clampPrice(BigDecimal candidatePrice, BigDecimal minPrice, BigDecimal maxPrice) {
        if (candidatePrice.compareTo(minPrice) < 0) {
            return minPrice.setScale(2, RoundingMode.HALF_UP);
        }
        if (candidatePrice.compareTo(maxPrice) > 0) {
            return maxPrice.setScale(2, RoundingMode.HALF_UP);
        }
        return candidatePrice.setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Triggers the AI prediction for a movie.
     * Gate: Refuses to run unless exactly 10 assigned reviewers exist and all 10 have submitted ratings.
     */
    @Transactional
    public PredictionResultDto triggerMoviePrediction(Long movieId, Long adminUserId) {
        Movie movie = movieRepository.findById(movieId)
                .orElseThrow(() -> new ResourceNotFoundException("Movie not found: " + movieId));
        AppUser admin = userRepository.findById(adminUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin not found: " + adminUserId));

        long assignedCount = assignmentRepository.countByMovieId(movieId);
        List<ReviewerRating> ratings = ratingRepository.findByMovieIdOrderBySubmittedAtAsc(movieId);

        if (assignedCount != 10 || ratings.size() != 10) {
            throw new BadRequestException(String.format(
                    "Prediction gate refused: Movie requires exactly 10 assigned reviewers and 10 submitted ratings (current: %d assigned, %d submitted).",
                    assignedCount, ratings.size()));
        }

        int[] values = ratings.stream().mapToInt(ReviewerRating::getRating).sorted().toArray();
        double mean = Arrays.stream(values).average().orElse(0.0);
        double median = (values[4] + values[5]) / 2.0;
        double variance = Arrays.stream(values).mapToDouble(v -> Math.pow(v - mean, 2)).average().orElse(0.0);
        double stdDev = Math.sqrt(variance);
        int min = values[0];
        int max = values[values.length - 1];
        int countGte8 = (int) Arrays.stream(values).filter(v -> v >= 8).count();
        int daysSinceRelease = (int) Math.max(0, ChronoUnit.DAYS.between(movie.getReleaseDate(), LocalDate.now()));

        MlPredictRequestPayload payload = new MlPredictRequestPayload(
                round2(mean), round2(median), round2(stdDev),
                min, max, countGte8,
                movie.getGenre(), movie.getLanguage(), daysSinceRelease
        );

        MlPredictResponsePayload mlResponse;
        try {
            String url = appProperties.getMlService().getUrl() + "/predict";
            mlResponse = restTemplate.postForObject(url, payload, MlPredictResponsePayload.class);
            if (mlResponse == null || mlResponse.predicted_class() == null) {
                throw new MlServiceUnavailableException("ML service returned an empty prediction response.");
            }
        } catch (RestClientException ex) {
            throw new MlServiceUnavailableException(
                    "AI Pricing ML Service is currently unreachable at " + appProperties.getMlService().getUrl()
                    + ". Please start the FastAPI service or use the manual category approval endpoint.", ex);
        }

        PredictionCategory predictedCategory = PredictionCategory.valueOf(mlResponse.predicted_class());
        GlobalPricingPolicy policy = getActivePolicy();
        BigDecimal multiplier = policy.getMultiplierForCategory(predictedCategory);

        BigDecimal refBase = new BigDecimal("200.00");
        BigDecimal singleScreenPreview = predictedCategory == PredictionCategory.INDUSTRY_HIT
                ? policy.getSingleScreenMaxPrice()
                : clampPrice(refBase.multiply(multiplier), policy.getMinTicketPrice(), policy.getSingleScreenMaxPrice());
        BigDecimal multiplexPreview = predictedCategory == PredictionCategory.INDUSTRY_HIT
                ? policy.getMultiplexMaxPrice()
                : clampPrice(refBase.multiply(multiplier), policy.getMinTicketPrice(), policy.getMultiplexMaxPrice());

        String snapshot = Arrays.stream(values).mapToObj(String::valueOf).collect(Collectors.joining(","));

        MoviePrediction prediction = new MoviePrediction();
        prediction.setMovie(movie);
        prediction.setRatingsSnapshot(snapshot);
        prediction.setMeanRating(BigDecimal.valueOf(mean).setScale(2, RoundingMode.HALF_UP));
        prediction.setMedianRating(BigDecimal.valueOf(median).setScale(2, RoundingMode.HALF_UP));
        prediction.setStdDevRating(BigDecimal.valueOf(stdDev).setScale(2, RoundingMode.HALF_UP));
        prediction.setMinRating(min);
        prediction.setMaxRating(max);
        prediction.setCountHighRatings(countGte8);
        prediction.setDaysSinceRelease(daysSinceRelease);
        prediction.setPredictedClass(predictedCategory);
        prediction.setConfidence(BigDecimal.valueOf(mlResponse.confidence()).setScale(4, RoundingMode.HALF_UP));
        prediction.setModelVersion(mlResponse.model_version() != null ? mlResponse.model_version() : "v1.0-rf");
        prediction.setRecommendedMultiplier(multiplier);
        prediction.setReferenceBasePrice(refBase);
        prediction.setFinalReferencePrice(singleScreenPreview);
        prediction.setTriggeredBy(admin);
        prediction = predictionRepository.save(prediction);

        String oldCat = movie.getPredictedCategory() != null ? movie.getPredictedCategory().name() : "NONE";
        movie.setPredictedCategory(predictedCategory);
        movie.setPredictedMultiplier(multiplier);
        movieRepository.save(movie);

        auditLogRepository.save(new AuditLog(
                "AI_PRICE_PREDICTION",
                "MOVIE",
                movie.getId(),
                admin,
                "category=" + oldCat,
                "category=" + predictedCategory.name() + ", confidence=" + prediction.getConfidence() + ", snapshot=[" + snapshot + "]",
                "Triggered AI dynamic pricing prediction after 10 reviewer ratings"
        ));

        return new PredictionResultDto(
                prediction.getId(),
                movie.getId(),
                movie.getTitle(),
                snapshot,
                prediction.getMeanRating(),
                prediction.getMedianRating(),
                prediction.getStdDevRating(),
                min,
                max,
                countGte8,
                predictedCategory,
                prediction.getConfidence(),
                prediction.getModelVersion(),
                multiplier,
                refBase,
                singleScreenPreview,
                multiplexPreview,
                prediction.getCreatedAt()
        );
    }

    @Transactional
    public void manualCategoryFallback(Long movieId, ManualCategoryApprovalRequest request, Long adminUserId) {
        Movie movie = movieRepository.findById(movieId)
                .orElseThrow(() -> new ResourceNotFoundException("Movie not found: " + movieId));
        AppUser admin = userRepository.findById(adminUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin not found: " + adminUserId));

        long assignedCount = assignmentRepository.countByMovieId(movieId);
        long submittedCount = ratingRepository.countByMovieId(movieId);
        if (assignedCount != 10 || submittedCount != 10) {
            throw new BadRequestException("Manual category approval still requires all 10 assigned reviewer ratings to be submitted.");
        }

        GlobalPricingPolicy policy = getActivePolicy();
        BigDecimal multiplier = policy.getMultiplierForCategory(request.category());
        String oldCat = movie.getPredictedCategory() != null ? movie.getPredictedCategory().name() : "NONE";

        movie.setPredictedCategory(request.category());
        movie.setPredictedMultiplier(multiplier);
        movieRepository.save(movie);

        auditLogRepository.save(new AuditLog(
                "MANUAL_CATEGORY_APPROVAL",
                "MOVIE",
                movie.getId(),
                admin,
                "category=" + oldCat,
                "category=" + request.category().name() + ", multiplier=" + multiplier,
                request.reason()
        ));
    }

    @Transactional
    public void overrideMoviePrice(Long movieId, PriceOverrideRequest request, Long adminUserId) {
        Movie movie = movieRepository.findById(movieId)
                .orElseThrow(() -> new ResourceNotFoundException("Movie not found: " + movieId));
        AppUser admin = userRepository.findById(adminUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin not found: " + adminUserId));

        GlobalPricingPolicy policy = getActivePolicy();
        if (request.overridePrice().compareTo(policy.getMinTicketPrice()) < 0
                || request.overridePrice().compareTo(policy.getMultiplexMaxPrice()) > 0) {
            throw new BadRequestException("Override price must be between global min (" + policy.getMinTicketPrice()
                    + ") and multiplex max (" + policy.getMultiplexMaxPrice() + ")");
        }

        String oldVal = movie.getOverridePrice() != null ? movie.getOverridePrice().toPlainString() : "NONE";
        movie.setOverridePrice(request.overridePrice());
        movieRepository.save(movie);

        auditLogRepository.save(new AuditLog(
                "PRICE_OVERRIDE",
                "MOVIE",
                movie.getId(),
                admin,
                "overridePrice=" + oldVal,
                "overridePrice=" + request.overridePrice().toPlainString(),
                request.reason()
        ));
    }

    @Transactional
    public GlobalPricingPolicy updateGlobalPolicy(GlobalPricingPolicyDto dto, Long adminUserId) {
        AppUser admin = userRepository.findById(adminUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin not found: " + adminUserId));
        GlobalPricingPolicy policy = getActivePolicy();
        String oldSummary = "min=" + policy.getMinTicketPrice()
                + ", singleMax=" + policy.getSingleScreenMaxPrice()
                + ", multiplexMax=" + policy.getMultiplexMaxPrice();

        policy.setMinTicketPrice(dto.minTicketPrice());
        policy.setSingleScreenMaxPrice(dto.singleScreenMaxPrice());
        policy.setMultiplexMaxPrice(dto.multiplexMaxPrice());
        policy.setFlopMultiplier(dto.flopMultiplier());
        policy.setBelowAverageMultiplier(dto.belowAverageMultiplier());
        policy.setAverageMultiplier(dto.averageMultiplier());
        policy.setHitMultiplier(dto.hitMultiplier());
        policy.setSuperhitMultiplier(dto.superhitMultiplier());
        policy.setBlockbusterMultiplier(dto.blockbusterMultiplier());
        policy.setIndustryHitUsesTheatreMax(dto.industryHitUsesTheatreMax());
        policy.setUpdatedAt(Instant.now());
        policy = policyRepository.save(policy);

        auditLogRepository.save(new AuditLog(
                "UPDATE_GLOBAL_PRICING_POLICY",
                "GLOBAL_PRICING_POLICY",
                policy.getId(),
                admin,
                oldSummary,
                "min=" + policy.getMinTicketPrice() + ", singleMax=" + policy.getSingleScreenMaxPrice()
                        + ", multiplexMax=" + policy.getMultiplexMaxPrice(),
                "Admin updated global pricing policy"
        ));
        return policy;
    }

    private double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
