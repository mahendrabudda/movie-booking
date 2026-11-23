package com.example.moviebooking.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

public class MovieDtos {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MovieRequest {
        @NotBlank(message = "Movie title is required")
        @Size(max = 200)
        private String title;

        @NotBlank(message = "Description is required")
        private String description;

        @NotBlank(message = "Genre is required")
        private String genre;

        @NotBlank(message = "Language is required")
        private String language;

        @NotNull(message = "Duration in minutes is required")
        @Min(value = 40, message = "Duration must be at least 40 minutes")
        @Max(value = 300, message = "Duration cannot exceed 300 minutes")
        private Integer duration;

        @NotNull(message = "Release date is required")
        private LocalDate releaseDate;

        @NotBlank(message = "Poster URL is required")
        private String posterUrl;

        @NotNull(message = "Rating is required")
        @DecimalMin(value = "1.0", message = "Rating must be at least 1.0")
        @DecimalMax(value = "10.0", message = "Rating cannot exceed 10.0")
        private BigDecimal rating;

        @NotNull(message = "Base ticket price is required")
        @DecimalMin(value = "50.00", message = "Base price must be at least ₹50")
        @DecimalMax(value = "450.00", message = "Base price cannot exceed ₹450")
        private BigDecimal basePrice;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MovieResponse {
        private Long id;
        private String title;
        private String description;
        private String genre;
        private String language;
        private Integer duration;
        private LocalDate releaseDate;
        private String posterUrl;
        private BigDecimal rating;
        private BigDecimal basePrice;
        private BigDecimal approvedDynamicPrice;
        private BigDecimal effectivePrice;
    }
}
