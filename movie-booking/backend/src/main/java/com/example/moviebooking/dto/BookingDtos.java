package com.example.moviebooking.dto;

import com.example.moviebooking.model.BookingStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public class BookingDtos {

    public record HoldSeatsRequest(
        @NotNull Long showId,
        @NotEmpty List<Long> seatIds
    ) {}

    public record HoldSeatsResponse(
        Long showId,
        List<Long> heldSeatIds,
        List<String> seatCodes,
        BigDecimal lockedSeatSubtotal,
        Instant holdExpiresAt
    ) {}

    public record InitiateBookingRequest(
        @NotNull Long showId,
        @NotEmpty List<Long> seatIds,
        String couponCode,
        @NotBlank String idempotencyKey
    ) {}

    public record BookingInitResponse(
        Long bookingId,
        String bookingReference,
        BookingStatus status,
        BigDecimal seatSubtotal,
        BigDecimal convenienceFee,
        BigDecimal gstAmount,
        BigDecimal discountAmount,
        BigDecimal totalAmount,
        String paymentProvider,
        String gatewayOrderId,
        String mockSignatureHint
    ) {}

    public record ConfirmPaymentRequest(
        @NotNull Long bookingId,
        @NotBlank String gatewayOrderId,
        @NotBlank String gatewayPaymentId,
        @NotBlank String gatewaySignature,
        @NotBlank String idempotencyKey
    ) {}

    public record BookingSummaryDto(
        Long id,
        String bookingReference,
        Long showId,
        String movieTitle,
        String theatreName,
        String screenName,
        Instant startTimeUtc,
        String startTimeIst,
        List<String> seats,
        BookingStatus status,
        BigDecimal seatSubtotal,
        BigDecimal convenienceFee,
        BigDecimal gstAmount,
        BigDecimal discountAmount,
        BigDecimal totalAmount,
        String qrToken,
        boolean checkedIn,
        Instant createdAt
    ) {}

    public record TicketValidationRequest(
        @NotBlank String qrToken
    ) {}

    public record TicketValidationResponse(
        boolean valid,
        String bookingReference,
        String movieTitle,
        String theatreName,
        String screenName,
        List<String> seats,
        Instant checkedInAt,
        String message
    ) {}

    public record TheatreAnalyticsDto(
        Long theatreId,
        String theatreName,
        long totalShows,
        long confirmedBookingsCount,
        long totalSeatsBooked,
        long totalSeatCapacity,
        double occupancyPercentage,
        BigDecimal totalRevenue
    ) {}
}
