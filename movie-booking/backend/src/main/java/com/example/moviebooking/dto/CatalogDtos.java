package com.example.moviebooking.dto;

import com.example.moviebooking.model.PredictionCategory;
import com.example.moviebooking.model.SeatCategory;
import com.example.moviebooking.model.ShowSeatStatus;
import com.example.moviebooking.model.TheatreType;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public class CatalogDtos {

    public record MovieRequest(
        @NotBlank String title,
        String description,
        @NotBlank String genre,
        @NotBlank String language,
        @Min(30) @Max(360) int durationMinutes,
        @NotNull LocalDate releaseDate
    ) {}

    public record MovieResponse(
        Long id,
        String title,
        String description,
        String genre,
        String language,
        int durationMinutes,
        LocalDate releaseDate,
        PredictionCategory predictedCategory,
        BigDecimal predictedMultiplier,
        BigDecimal overridePrice,
        boolean active
    ) {}

    public record TheatreRequest(
        @NotBlank String name,
        @NotBlank String city,
        @NotBlank String address,
        @NotNull TheatreType type,
        BigDecimal maxTicketPrice
    ) {}

    public record TheatreResponse(
        Long id,
        String name,
        String city,
        String address,
        TheatreType type,
        BigDecimal maxTicketPrice,
        boolean active
    ) {}

    public record ScreenRequest(
        @NotBlank String name,
        @Min(1) @Max(26) int rowsCount,
        @Min(1) @Max(30) int seatsPerRow
    ) {}

    public record ScreenResponse(
        Long id,
        Long theatreId,
        String theatreName,
        String name,
        int totalSeats
    ) {}

    public record ShowRequest(
        @NotNull Long movieId,
        @NotNull Long screenId,
        @NotNull Instant startTime,
        @NotNull @DecimalMin("50.00") BigDecimal basePrice
    ) {}

    public record ShowResponse(
        Long id,
        Long movieId,
        String movieTitle,
        Long theatreId,
        String theatreName,
        TheatreType theatreType,
        BigDecimal theatreMaxPrice,
        Long screenId,
        String screenName,
        Instant startTimeUtc,
        Instant endTimeUtc,
        String startTimeIst,
        String endTimeIst,
        BigDecimal basePrice,
        BigDecimal dynamicRegularPrice,
        PredictionCategory appliedCategory
    ) {}

    public record ShowSeatDto(
        Long showSeatId,
        Long seatId,
        String seatCode,
        String rowLabel,
        int seatNumber,
        SeatCategory category,
        ShowSeatStatus status,
        BigDecimal currentPrice,
        Instant holdExpiresAt
    ) {}

    public record CustomerReviewRequest(
        @Min(1) @Max(5) int rating,
        @NotBlank @Size(max = 1000) String comment
    ) {}

    public record CustomerReviewResponse(
        Long id,
        Long movieId,
        String customerName,
        int rating,
        String comment,
        Instant createdAt
    ) {}
}
