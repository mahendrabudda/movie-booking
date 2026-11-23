package com.example.moviebooking.dto;

import com.example.moviebooking.model.SeatCategory;
import com.example.moviebooking.model.TheatreType;
import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public class TheatreShowDtos {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TheatreRequest {
        @NotBlank(message = "Theatre name is required")
        private String name;

        @NotBlank(message = "City is required")
        private String city;

        @NotNull(message = "Theatre type (SINGLE_SCREEN or MULTIPLEX) is required")
        private TheatreType type;

        @DecimalMin(value = "100.00", message = "Maximum ticket price must be at least ₹100")
        private BigDecimal maxTicketPrice;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TheatreResponse {
        private Long id;
        private String name;
        private String city;
        private TheatreType type;
        private BigDecimal maxTicketPrice;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ScreenRequest {
        @NotBlank(message = "Screen name is required")
        private String name;

        @NotNull(message = "Total seats is required")
        @Min(value = 8, message = "Screen must have at least 8 seats")
        @Max(value = 120, message = "Screen cannot exceed 120 seats in MVP")
        private Integer totalSeats;

        @NotNull(message = "Theatre ID is required")
        private Long theatreId;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ScreenResponse {
        private Long id;
        private String name;
        private Integer totalSeats;
        private Long theatreId;
        private String theatreName;
        private TheatreType theatreType;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ShowRequest {
        @NotNull(message = "Movie ID is required")
        private Long movieId;

        @NotNull(message = "Screen ID is required")
        private Long screenId;

        @NotNull(message = "Show date and time is required")
        private LocalDateTime showDateTime;

        @NotNull(message = "Base ticket price is required")
        @DecimalMin(value = "80.00", message = "Base ticket price must be at least ₹80")
        private BigDecimal basePrice;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ShowResponse {
        private Long id;
        private Long movieId;
        private String movieTitle;
        private Long screenId;
        private String screenName;
        private Long theatreId;
        private String theatreName;
        private String city;
        private TheatreType theatreType;
        private BigDecimal theatreMaxPrice;
        private LocalDateTime showDateTime;
        private BigDecimal basePrice;
        private BigDecimal effectiveTicketPrice;
        private BigDecimal premiumTicketPrice;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SeatAvailabilityResponse {
        private Long seatId;
        private String seatNumber;
        private SeatCategory category;
        private boolean booked;
        private BigDecimal price;
    }
}
