package com.example.moviebooking.dto;

import com.example.moviebooking.model.PopularityCategory;
import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

public class AiPricingDtos {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PredictionTriggerRequest {
        @NotNull(message = "Average movie rating is required")
        @DecimalMin(value = "1.0")
        @DecimalMax(value = "10.0")
        private BigDecimal averageMovieRating;

        @NotBlank(message = "Genre is required")
        private String genre;

        @NotBlank(message = "Language is required")
        private String language;

        @NotNull(message = "Days since release is required")
        @Min(0)
        @Max(3650)
        private Integer daysSinceRelease;

        @NotNull(message = "Movie duration is required")
        @Min(40)
        @Max(300)
        private Integer movieDuration;

        @NotNull(message = "Expected demand is required")
        @DecimalMin(value = "0.0")
        @DecimalMax(value = "100.0")
        private BigDecimal expectedDemand;

        @NotNull(message = "Current occupancy is required")
        @DecimalMin(value = "0.0")
        @DecimalMax(value = "100.0")
        private BigDecimal currentOccupancy;

        private String theatreTypeCap; // Optional: SINGLE_SCREEN or MULTIPLEX
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class FastApiPredictionRequest {
        private double averageMovieRating;
        private String genre;
        private String language;
        private int daysSinceRelease;
        private int movieDuration;
        private double expectedDemand;
        private double currentOccupancy;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class FastApiPredictionResponse {
        private String predictedCategory;
        private double confidence;
        private Map<String, Double> classProbabilities;
        private Map<String, Object> modelInfo;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PredictionResponse {
        private Long id;
        private Long movieId;
        private String movieTitle;
        private BigDecimal averageMovieRating;
        private String genre;
        private String language;
        private Integer daysSinceRelease;
        private Integer movieDuration;
        private BigDecimal expectedDemand;
        private BigDecimal currentOccupancy;
        private PopularityCategory predictedCategory;
        private BigDecimal multiplierApplied;
        private BigDecimal confidence;
        private BigDecimal basePrice;
        private BigDecimal recommendedPrice;
        private BigDecimal singleScreenCappedPrice;
        private BigDecimal multiplexCappedPrice;
        private BigDecimal approvedPrice;
        private Boolean approved;
        private Map<String, Double> classProbabilities;
        private LocalDateTime createdAt;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ApprovePredictionRequest {
        private BigDecimal customApprovedPrice;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AdminDashboardSummary {
        private long totalMovies;
        private long totalTheatres;
        private long totalShows;
        private long totalBookings;
        private long totalCustomers;
    }
}
