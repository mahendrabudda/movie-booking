package com.example.moviebooking.dto;

import com.example.moviebooking.model.BookingStatus;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public class BookingDtos {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BookingRequest {
        @NotNull(message = "Show ID is required")
        private Long showId;

        @NotEmpty(message = "Select at least one seat")
        private List<Long> seatIds;

        private String mockPaymentMethod;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BookedSeatDto {
        private Long seatId;
        private String seatNumber;
        private String category;
        private BigDecimal price;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BookingResponse {
        private Long id;
        private String bookingReference;
        private Long userId;
        private Long showId;
        private String movieTitle;
        private String theatreName;
        private String screenName;
        private LocalDateTime showDateTime;
        private List<BookedSeatDto> seats;
        private BigDecimal totalAmount;
        private BookingStatus bookingStatus;
        private String paymentReference;
        private LocalDateTime createdAt;
    }
}
