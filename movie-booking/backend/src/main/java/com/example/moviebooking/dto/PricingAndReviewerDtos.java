package com.example.moviebooking.dto;

import com.example.moviebooking.model.PredictionCategory;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

public class PricingAndReviewerDtos {

    public record AssignReviewersRequest(
        @NotEmpty @Size(min = 10, max = 10, message = "Exactly 10 distinct reviewers must be assigned")
        List<Long> reviewerIds
    ) {}

    public record AssignManagerRequest(
        @NotNull Long managerId,
        @NotNull Long theatreId
    ) {}

    public record SubmitReviewerRatingRequest(
        @Min(1) @Max(10) int rating,
        @Size(max = 500) String reviewNotes
    ) {}

    public record AdminCorrectRatingRequest(
        @Min(1) @Max(10) int newRating,
        @NotBlank @Size(min = 5, max = 500) String reason
    ) {}

    public record ReviewerAssignedMovieDto(
        Long movieId,
        String movieTitle,
        String genre,
        String language,
        boolean submitted,
        Integer submittedRating,
        String reviewNotes,
        Instant submittedAt
    ) {}

    public record MovieRatingProgressDto(
        Long movieId,
        String movieTitle,
        long assignedReviewersCount,
        long submittedRatingsCount,
        boolean readyForPrediction,
        List<ReviewerRatingItemDto> ratings
    ) {}

    public record ReviewerRatingItemDto(
        Long ratingId,
        Long reviewerId,
        String reviewerEmail,
        String reviewerName,
        Integer rating,
        String reviewNotes,
        Instant submittedAt
    ) {}

    public record MlPredictRequestPayload(
        double mean_rating,
        double median_rating,
        double std_dev_rating,
        int min_rating,
        int max_rating,
        int count_ratings_gte_8,
        String genre,
        String language,
        int days_since_release
    ) {}

    public record MlPredictResponsePayload(
        String predicted_class,
        double confidence,
        Map<String, Double> probabilities,
        String model_version
    ) {}

    public record PredictionResultDto(
        Long predictionId,
        Long movieId,
        String movieTitle,
        String ratingsSnapshot,
        BigDecimal meanRating,
        BigDecimal medianRating,
        BigDecimal stdDevRating,
        int minRating,
        int maxRating,
        int countHighRatings,
        PredictionCategory predictedClass,
        BigDecimal confidence,
        String modelVersion,
        BigDecimal recommendedMultiplier,
        BigDecimal referenceBasePrice,
        BigDecimal finalSingleScreenPreview,
        BigDecimal finalMultiplexPreview,
        Instant createdAt
    ) {}

    public record PriceOverrideRequest(
        @NotNull @DecimalMin("50.00") BigDecimal overridePrice,
        @NotBlank @Size(min = 5, max = 500) String reason
    ) {}

    public record ManualCategoryApprovalRequest(
        @NotNull PredictionCategory category,
        @NotBlank @Size(min = 5, max = 500) String reason
    ) {}

    public record GlobalPricingPolicyDto(
        @NotNull @DecimalMin("50.00") BigDecimal minTicketPrice,
        @NotNull @DecimalMin("100.00") BigDecimal singleScreenMaxPrice,
        @NotNull @DecimalMin("100.00") BigDecimal multiplexMaxPrice,
        @NotNull @DecimalMin("0.10") BigDecimal flopMultiplier,
        @NotNull @DecimalMin("0.10") BigDecimal belowAverageMultiplier,
        @NotNull @DecimalMin("0.10") BigDecimal averageMultiplier,
        @NotNull @DecimalMin("0.10") BigDecimal hitMultiplier,
        @NotNull @DecimalMin("0.10") BigDecimal superhitMultiplier,
        @NotNull @DecimalMin("0.10") BigDecimal blockbusterMultiplier,
        boolean industryHitUsesTheatreMax
    ) {}

    public record AuditLogDto(
        Long id,
        String actionType,
        String entityType,
        Long entityId,
        String actorEmail,
        String oldValue,
        String newValue,
        String reason,
        Instant createdAt
    ) {}
}
