package com.example.moviebooking.service;

import com.example.moviebooking.dto.TheatreShowDtos.*;
import com.example.moviebooking.exception.BadRequestException;
import com.example.moviebooking.exception.ResourceNotFoundException;
import com.example.moviebooking.model.*;
import com.example.moviebooking.repository.*;
import com.example.moviebooking.util.PricingCalculator;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TheatreShowService {

    private final TheatreRepository theatreRepository;
    private final ScreenRepository screenRepository;
    private final SeatRepository seatRepository;
    private final MovieShowRepository movieShowRepository;
    private final MovieRepository movieRepository;
    private final BookingSeatRepository bookingSeatRepository;

    @Value("${app.pricing.min-ticket-price:120.00}")
    private BigDecimal minTicketPrice;

    public List<TheatreResponse> getAllTheatres() {
        return theatreRepository.findAll().stream()
                .map(this::toTheatreResponse)
                .toList();
    }

    @Transactional
    public TheatreResponse createTheatre(TheatreRequest request) {
        BigDecimal typeMax = request.getType() == TheatreType.SINGLE_SCREEN
                ? PricingCalculator.SINGLE_SCREEN_MAX_CAP
                : PricingCalculator.MULTIPLEX_MAX_CAP;

        BigDecimal desiredMax = request.getMaxTicketPrice() != null
                ? request.getMaxTicketPrice()
                : typeMax;

        if (desiredMax.compareTo(typeMax) > 0) {
            throw new BadRequestException(String.format(
                    "Maximum ticket price for %s cannot exceed ₹%s",
                    request.getType(), typeMax));
        }

        Theatre theatre = Theatre.builder()
                .name(request.getName().trim())
                .city(request.getCity().trim())
                .type(request.getType())
                .maxTicketPrice(desiredMax)
                .build();

        return toTheatreResponse(theatreRepository.save(theatre));
    }

    public List<ScreenResponse> getScreensByTheatre(Long theatreId) {
        List<Screen> screens = (theatreId != null)
                ? screenRepository.findByTheatreIdOrderByIdAsc(theatreId)
                : screenRepository.findAll();

        return screens.stream().map(this::toScreenResponse).toList();
    }

    @Transactional
    public ScreenResponse createScreenWithSeats(ScreenRequest request) {
        Theatre theatre = theatreRepository.findById(request.getTheatreId())
                .orElseThrow(() -> new ResourceNotFoundException("Theatre not found with ID: " + request.getTheatreId()));

        Screen screen = Screen.builder()
                .name(request.getName().trim())
                .totalSeats(request.getTotalSeats())
                .theatreId(theatre.getId())
                .build();
        Screen savedScreen = screenRepository.save(screen);

        // Automatically generate seats in rows of 8 (last row PREMIUM, earlier rows REGULAR)
        int totalSeats = savedScreen.getTotalSeats();
        int seatsPerRow = 8;
        int totalRows = (int) Math.ceil((double) totalSeats / seatsPerRow);
        List<Seat> seatsToCreate = new ArrayList<>();

        int createdCount = 0;
        for (int r = 0; r < totalRows; r++) {
            char rowChar = (char) ('A' + r);
            SeatCategory category = (r == totalRows - 1) ? SeatCategory.PREMIUM : SeatCategory.REGULAR;
            for (int col = 1; col <= seatsPerRow && createdCount < totalSeats; col++) {
                seatsToCreate.add(Seat.builder()
                        .screenId(savedScreen.getId())
                        .seatNumber(rowChar + String.valueOf(col))
                        .category(category)
                        .status(SeatStatus.ACTIVE)
                        .build());
                createdCount++;
            }
        }
        seatRepository.saveAll(seatsToCreate);

        return toScreenResponse(savedScreen);
    }

    public List<ShowResponse> getShows(Long movieId) {
        List<MovieShow> shows = (movieId != null)
                ? movieShowRepository.findByMovieIdOrderByShowDateTimeAsc(movieId)
                : movieShowRepository.findAllByOrderByShowDateTimeAsc();

        return shows.stream().map(this::toShowResponse).toList();
    }

    public ShowResponse getShowById(Long showId) {
        MovieShow show = movieShowRepository.findById(showId)
                .orElseThrow(() -> new ResourceNotFoundException("Show not found with ID: " + showId));
        return toShowResponse(show);
    }

    @Transactional
    public ShowResponse createShow(ShowRequest request) {
        Movie movie = movieRepository.findById(request.getMovieId())
                .orElseThrow(() -> new ResourceNotFoundException("Movie not found with ID: " + request.getMovieId()));
        Screen screen = screenRepository.findById(request.getScreenId())
                .orElseThrow(() -> new ResourceNotFoundException("Screen not found with ID: " + request.getScreenId()));
        Theatre theatre = theatreRepository.findById(screen.getTheatreId())
                .orElseThrow(() -> new ResourceNotFoundException("Theatre not found"));

        BigDecimal cappedBasePrice = PricingCalculator.enforceTheatreCap(
                request.getBasePrice(), theatre.getType(), theatre.getMaxTicketPrice(), minTicketPrice);

        MovieShow show = MovieShow.builder()
                .movieId(movie.getId())
                .screenId(screen.getId())
                .showDateTime(request.getShowDateTime())
                .basePrice(cappedBasePrice)
                .build();

        return toShowResponse(movieShowRepository.save(show));
    }

    @Transactional
    public ShowResponse updateShow(Long showId, ShowRequest request) {
        MovieShow show = movieShowRepository.findById(showId)
                .orElseThrow(() -> new ResourceNotFoundException("Show not found with ID: " + showId));
        Movie movie = movieRepository.findById(request.getMovieId())
                .orElseThrow(() -> new ResourceNotFoundException("Movie not found with ID: " + request.getMovieId()));
        Screen screen = screenRepository.findById(request.getScreenId())
                .orElseThrow(() -> new ResourceNotFoundException("Screen not found with ID: " + request.getScreenId()));
        Theatre theatre = theatreRepository.findById(screen.getTheatreId())
                .orElseThrow(() -> new ResourceNotFoundException("Theatre not found"));

        BigDecimal cappedBasePrice = PricingCalculator.enforceTheatreCap(
                request.getBasePrice(), theatre.getType(), theatre.getMaxTicketPrice(), minTicketPrice);

        show.setMovieId(movie.getId());
        show.setScreenId(screen.getId());
        show.setShowDateTime(request.getShowDateTime());
        show.setBasePrice(cappedBasePrice);

        return toShowResponse(movieShowRepository.save(show));
    }

    @Transactional
    public void deleteShow(Long showId) {
        MovieShow show = movieShowRepository.findById(showId)
                .orElseThrow(() -> new ResourceNotFoundException("Show not found with ID: " + showId));
        movieShowRepository.delete(show);
    }

    public List<SeatAvailabilityResponse> getShowSeats(Long showId) {
        MovieShow show = movieShowRepository.findById(showId)
                .orElseThrow(() -> new ResourceNotFoundException("Show not found with ID: " + showId));
        Screen screen = screenRepository.findById(show.getScreenId())
                .orElseThrow(() -> new ResourceNotFoundException("Screen not found"));
        Theatre theatre = theatreRepository.findById(screen.getTheatreId())
                .orElseThrow(() -> new ResourceNotFoundException("Theatre not found"));
        Movie movie = movieRepository.findById(show.getMovieId())
                .orElseThrow(() -> new ResourceNotFoundException("Movie not found"));

        List<Seat> seats = seatRepository.findByScreenIdOrderBySeatNumberAsc(screen.getId());
        Set<Long> bookedSeatIds = bookingSeatRepository.findByShowId(showId).stream()
                .map(BookingSeat::getSeatId)
                .collect(Collectors.toSet());

        return seats.stream().map(seat -> {
            BigDecimal seatPrice = calculateSeatPriceForShow(show, movie, theatre, seat.getCategory());
            return SeatAvailabilityResponse.builder()
                    .seatId(seat.getId())
                    .seatNumber(seat.getSeatNumber())
                    .category(seat.getCategory())
                    .booked(bookedSeatIds.contains(seat.getId()) || seat.getStatus() != SeatStatus.ACTIVE)
                    .price(seatPrice)
                    .build();
        }).toList();
    }

    public BigDecimal calculateSeatPriceForShow(
            MovieShow show, Movie movie, Theatre theatre, SeatCategory seatCategory) {

        BigDecimal base = movie.getApprovedDynamicPrice() != null
                ? movie.getApprovedDynamicPrice()
                : show.getBasePrice();

        BigDecimal withCategory = (seatCategory == SeatCategory.PREMIUM)
                ? base.add(PricingCalculator.PREMIUM_SEAT_SURCHARGE)
                : base;

        return PricingCalculator.enforceTheatreCap(
                withCategory, theatre.getType(), theatre.getMaxTicketPrice(), minTicketPrice);
    }

    private TheatreResponse toTheatreResponse(Theatre theatre) {
        return TheatreResponse.builder()
                .id(theatre.getId())
                .name(theatre.getName())
                .city(theatre.getCity())
                .type(theatre.getType())
                .maxTicketPrice(theatre.getMaxTicketPrice())
                .build();
    }

    private ScreenResponse toScreenResponse(Screen screen) {
        Theatre theatre = theatreRepository.findById(screen.getTheatreId()).orElse(null);
        return ScreenResponse.builder()
                .id(screen.getId())
                .name(screen.getName())
                .totalSeats(screen.getTotalSeats())
                .theatreId(screen.getTheatreId())
                .theatreName(theatre != null ? theatre.getName() : "Unknown")
                .theatreType(theatre != null ? theatre.getType() : null)
                .build();
    }

    private ShowResponse toShowResponse(MovieShow show) {
        Movie movie = movieRepository.findById(show.getMovieId())
                .orElseThrow(() -> new ResourceNotFoundException("Movie not found"));
        Screen screen = screenRepository.findById(show.getScreenId())
                .orElseThrow(() -> new ResourceNotFoundException("Screen not found"));
        Theatre theatre = theatreRepository.findById(screen.getTheatreId())
                .orElseThrow(() -> new ResourceNotFoundException("Theatre not found"));

        BigDecimal regularPrice = calculateSeatPriceForShow(show, movie, theatre, SeatCategory.REGULAR);
        BigDecimal premiumPrice = calculateSeatPriceForShow(show, movie, theatre, SeatCategory.PREMIUM);

        return ShowResponse.builder()
                .id(show.getId())
                .movieId(movie.getId())
                .movieTitle(movie.getTitle())
                .screenId(screen.getId())
                .screenName(screen.getName())
                .theatreId(theatre.getId())
                .theatreName(theatre.getName())
                .city(theatre.getCity())
                .theatreType(theatre.getType())
                .theatreMaxPrice(theatre.getMaxTicketPrice())
                .showDateTime(show.getShowDateTime())
                .basePrice(show.getBasePrice())
                .effectiveTicketPrice(regularPrice)
                .premiumTicketPrice(premiumPrice)
                .build();
    }
}
