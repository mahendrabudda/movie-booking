package com.example.moviebooking.service;

import com.example.moviebooking.dto.AiPricingDtos.*;
import com.example.moviebooking.exception.ExternalServiceException;
import com.example.moviebooking.exception.ResourceNotFoundException;
import com.example.moviebooking.model.Movie;
import com.example.moviebooking.model.MoviePrediction;
import com.example.moviebooking.model.PopularityCategory;
import com.example.moviebooking.model.TheatreType;
import com.example.moviebooking.repository.MoviePredictionRepository;
import com.example.moviebooking.repository.MovieRepository;
import com.example.moviebooking.util.PricingCalculator;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AiPricingService {

    private final MovieRepository movieRepository;
    private final MoviePredictionRepository moviePredictionRepository;
    private final RestTemplate restTemplate;

    @Value("${app.ml.service-url:http://localhost:8000}")
    private String mlServiceUrl;

    @Value("${app.pricing.min-ticket-price:120.00}")
    private BigDecimal minTicketPrice;

    @Value("${app.pricing.single-screen-max:350.00}")
    private BigDecimal singleScreenMax;

    @Value("${app.pricing.multiplex-max:450.00}")
    private BigDecimal multiplexMax;

    @Transactional
    public PredictionResponse predictTicketPrice(Long movieId, PredictionTriggerRequest request) {
        Movie movie = movieRepository.findById(movieId)
                .orElseThrow(() -> new ResourceNotFoundException("Movie not found with ID: " + movieId));

        FastApiPredictionRequest fastApiPayload = FastApiPredictionRequest.builder()
                .averageMovieRating(request.getAverageMovieRating().doubleValue())
                .genre(request.getGenre().trim().toUpperCase())
                .language(request.getLanguage().trim().toUpperCase())
                .daysSinceRelease(request.getDaysSinceRelease())
                .movieDuration(request.getMovieDuration())
                .expectedDemand(request.getExpectedDemand().doubleValue())
                .currentOccupancy(request.getCurrentOccupancy().doubleValue())
                .build();

        FastApiPredictionResponse mlResult;
        try {
            String endpoint = mlServiceUrl.endsWith("/")
                    ? mlServiceUrl + "predict"
                    : mlServiceUrl + "/predict";
            ResponseEntity<FastApiPredictionResponse> response =
                    restTemplate.postForEntity(endpoint, fastApiPayload, FastApiPredictionResponse.class);
            mlResult = response.getBody();
            if (mlResult == null || mlResult.getPredictedCategory() == null) {
                throw new ExternalServiceException("FastAPI ML service returned an empty prediction response.");
            }
        } catch (RestClientException ex) {
            throw new ExternalServiceException(
                    "FastAPI ML service at " + mlServiceUrl + " is currently unreachable. Start the Python ML service (uvicorn app:app --port 8000) and retry.",
                    ex);
        }

        PopularityCategory category = PopularityCategory.valueOf(mlResult.getPredictedCategory().trim().toUpperCase());
        BigDecimal confidence = BigDecimal.valueOf(mlResult.getConfidence()).setScale(4, RoundingMode.HALF_UP);

        TheatreType targetType = "SINGLE_SCREEN".equalsIgnoreCase(request.getTheatreTypeCap())
                ? TheatreType.SINGLE_SCREEN
                : TheatreType.MULTIPLEX;

        BigDecimal maxCap = (targetType == TheatreType.SINGLE_SCREEN) ? singleScreenMax : multiplexMax;

        BigDecimal recommendedPrice = PricingCalculator.calculateRecommendedPrice(
                movie.getBasePrice(), category, minTicketPrice, maxCap);

        BigDecimal singleScreenPrice = PricingCalculator.calculateRecommendedPrice(
                movie.getBasePrice(), category, minTicketPrice, singleScreenMax);
        BigDecimal multiplexPrice = PricingCalculator.calculateRecommendedPrice(
                movie.getBasePrice(), category, minTicketPrice, multiplexMax);

        MoviePrediction prediction = MoviePrediction.builder()
                .movieId(movie.getId())
                .averageMovieRating(request.getAverageMovieRating())
                .genre(fastApiPayload.getGenre())
                .language(fastApiPayload.getLanguage())
                .daysSinceRelease(request.getDaysSinceRelease())
                .movieDuration(request.getMovieDuration())
                .expectedDemand(request.getExpectedDemand())
                .currentOccupancy(request.getCurrentOccupancy())
                .predictedCategory(category)
                .confidence(confidence)
                .basePrice(movie.getBasePrice())
                .recommendedPrice(recommendedPrice)
                .approved(false)
                .build();

        MoviePrediction saved = moviePredictionRepository.save(prediction);
        return toPredictionResponse(
                saved, movie.getTitle(), singleScreenPrice, multiplexPrice, mlResult.getClassProbabilities());
    }

    public List<PredictionResponse> getPredictionsForMovie(Long movieId) {
        Movie movie = movieRepository.findById(movieId)
                .orElseThrow(() -> new ResourceNotFoundException("Movie not found with ID: " + movieId));

        return moviePredictionRepository.findByMovieIdOrderByCreatedAtDesc(movieId).stream()
                .map(p -> {
                    BigDecimal singleScreenPrice = PricingCalculator.calculateRecommendedPrice(
                            p.getBasePrice(), p.getPredictedCategory(), minTicketPrice, singleScreenMax);
                    BigDecimal multiplexPrice = PricingCalculator.calculateRecommendedPrice(
                            p.getBasePrice(), p.getPredictedCategory(), minTicketPrice, multiplexMax);
                    return toPredictionResponse(p, movie.getTitle(), singleScreenPrice, multiplexPrice, null);
                })
                .toList();
    }

    @Transactional
    public PredictionResponse approvePrediction(Long predictionId, ApprovePredictionRequest request) {
        MoviePrediction prediction = moviePredictionRepository.findById(predictionId)
                .orElseThrow(() -> new ResourceNotFoundException("Prediction not found with ID: " + predictionId));

        Movie movie = movieRepository.findById(prediction.getMovieId())
                .orElseThrow(() -> new ResourceNotFoundException("Movie not found with ID: " + prediction.getMovieId()));

        BigDecimal finalApprovedPrice = (request != null && request.getCustomApprovedPrice() != null)
                ? request.getCustomApprovedPrice()
                : prediction.getRecommendedPrice();

        // Enforce global multiplex ceiling and minimum floor
        finalApprovedPrice = PricingCalculator.enforceTheatreCap(
                finalApprovedPrice, TheatreType.MULTIPLEX, multiplexMax, minTicketPrice);

        prediction.setApprovedPrice(finalApprovedPrice);
        prediction.setApproved(true);
        MoviePrediction savedPrediction = moviePredictionRepository.save(prediction);

        movie.setApprovedDynamicPrice(finalApprovedPrice);
        movieRepository.save(movie);

        BigDecimal singleScreenPrice = PricingCalculator.calculateRecommendedPrice(
                prediction.getBasePrice(), prediction.getPredictedCategory(), minTicketPrice, singleScreenMax);
        BigDecimal multiplexPrice = PricingCalculator.calculateRecommendedPrice(
                prediction.getBasePrice(), prediction.getPredictedCategory(), minTicketPrice, multiplexMax);

        return toPredictionResponse(
                savedPrediction, movie.getTitle(), singleScreenPrice, multiplexPrice, null);
    }

    private PredictionResponse toPredictionResponse(
            MoviePrediction p,
            String movieTitle,
            BigDecimal singleScreenPrice,
            BigDecimal multiplexPrice,
            Map<String, Double> classProbabilities) {

        return PredictionResponse.builder()
                .id(p.getId())
                .movieId(p.getMovieId())
                .movieTitle(movieTitle)
                .averageMovieRating(p.getAverageMovieRating())
                .genre(p.getGenre())
                .language(p.getLanguage())
                .daysSinceRelease(p.getDaysSinceRelease())
                .movieDuration(p.getMovieDuration())
                .expectedDemand(p.getExpectedDemand())
                .currentOccupancy(p.getCurrentOccupancy())
                .predictedCategory(p.getPredictedCategory())
                .multiplierApplied(p.getPredictedCategory().getDefaultMultiplier())
                .confidence(p.getConfidence())
                .basePrice(p.getBasePrice())
                .recommendedPrice(p.getRecommendedPrice())
                .singleScreenCappedPrice(singleScreenPrice)
                .multiplexCappedPrice(multiplexPrice)
                .approvedPrice(p.getApprovedPrice())
                .approved(p.getApproved())
                .classProbabilities(classProbabilities)
                .createdAt(p.getCreatedAt())
                .build();
    }
}
