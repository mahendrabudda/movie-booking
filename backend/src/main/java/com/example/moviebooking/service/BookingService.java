package com.example.moviebooking.service;

import com.example.moviebooking.dto.BookingDtos.*;
import com.example.moviebooking.exception.BadRequestException;
import com.example.moviebooking.exception.ResourceNotFoundException;
import com.example.moviebooking.model.*;
import com.example.moviebooking.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository bookingRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final MovieShowRepository movieShowRepository;
    private final MovieRepository movieRepository;
    private final ScreenRepository screenRepository;
    private final TheatreRepository theatreRepository;
    private final SeatRepository seatRepository;
    private final TheatreShowService theatreShowService;

    @Transactional
    public BookingResponse createBooking(Long userId, BookingRequest request) {
        MovieShow show = movieShowRepository.findById(request.getShowId())
                .orElseThrow(() -> new ResourceNotFoundException("Show not found with ID: " + request.getShowId()));
        Movie movie = movieRepository.findById(show.getMovieId())
                .orElseThrow(() -> new ResourceNotFoundException("Movie not found"));
        Screen screen = screenRepository.findById(show.getScreenId())
                .orElseThrow(() -> new ResourceNotFoundException("Screen not found"));
        Theatre theatre = theatreRepository.findById(screen.getTheatreId())
                .orElseThrow(() -> new ResourceNotFoundException("Theatre not found"));

        List<Long> uniqueSeatIds = request.getSeatIds().stream().distinct().toList();
        if (uniqueSeatIds.size() != request.getSeatIds().size()) {
            throw new BadRequestException("Duplicate seat IDs were provided in the booking request");
        }

        List<Seat> selectedSeats = seatRepository.findAllById(uniqueSeatIds);
        if (selectedSeats.size() != uniqueSeatIds.size()) {
            throw new BadRequestException("One or more selected seats do not exist");
        }

        BigDecimal totalAmount = BigDecimal.ZERO;
        Map<Long, BigDecimal> seatPriceMap = new HashMap<>();

        for (Seat seat : selectedSeats) {
            if (!seat.getScreenId().equals(screen.getId())) {
                throw new BadRequestException("Seat " + seat.getSeatNumber() + " does not belong to this show's screen");
            }
            if (seat.getStatus() != SeatStatus.ACTIVE) {
                throw new BadRequestException("Seat " + seat.getSeatNumber() + " is currently unavailable");
            }
            if (bookingSeatRepository.existsByShowIdAndSeatId(show.getId(), seat.getId())) {
                throw new BadRequestException("Seat " + seat.getSeatNumber() + " is already booked for this show");
            }

            BigDecimal seatPrice = theatreShowService.calculateSeatPriceForShow(
                    show, movie, theatre, seat.getCategory());
            seatPriceMap.put(seat.getId(), seatPrice);
            totalAmount = totalAmount.add(seatPrice);
        }

        // Mock Payment confirmation
        String bookingReference = "BK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        String paymentRef = "MOCK-PAY-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        Booking booking = Booking.builder()
                .bookingReference(bookingReference)
                .userId(userId)
                .showId(show.getId())
                .totalAmount(totalAmount)
                .bookingStatus(BookingStatus.CONFIRMED)
                .paymentReference(paymentRef)
                .build();

        Booking savedBooking = bookingRepository.save(booking);

        List<BookingSeat> bookingSeats = new ArrayList<>();
        for (Seat seat : selectedSeats) {
            BookingSeat bookingSeat = BookingSeat.builder()
                    .bookingId(savedBooking.getId())
                    .showId(show.getId())
                    .seatId(seat.getId())
                    .seatNumber(seat.getSeatNumber())
                    .seatCategory(seat.getCategory())
                    .price(seatPriceMap.get(seat.getId()))
                    .build();
            bookingSeats.add(bookingSeat);
        }
        bookingSeatRepository.saveAll(bookingSeats);

        return toBookingResponse(savedBooking, movie, theatre, screen, bookingSeats);
    }

    public List<BookingResponse> getUserBookings(Long userId) {
        List<Booking> bookings = bookingRepository.findByUserIdOrderByCreatedAtDesc(userId);
        return bookings.stream().map(this::enrichBookingResponse).toList();
    }

    public BookingResponse getBookingByReference(String bookingReference, Long userId, Role role) {
        Booking booking = bookingRepository.findByBookingReference(bookingReference)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + bookingReference));

        if (role != Role.ADMIN && !booking.getUserId().equals(userId)) {
            throw new BadRequestException("You are not authorized to view this booking");
        }
        return enrichBookingResponse(booking);
    }

    private BookingResponse enrichBookingResponse(Booking booking) {
        MovieShow show = movieShowRepository.findById(booking.getShowId()).orElse(null);
        Movie movie = (show != null) ? movieRepository.findById(show.getMovieId()).orElse(null) : null;
        Screen screen = (show != null) ? screenRepository.findById(show.getScreenId()).orElse(null) : null;
        Theatre theatre = (screen != null) ? theatreRepository.findById(screen.getTheatreId()).orElse(null) : null;
        List<BookingSeat> seats = bookingSeatRepository.findByBookingId(booking.getId());

        return toBookingResponse(booking, movie, theatre, screen, seats);
    }

    private BookingResponse toBookingResponse(
            Booking booking,
            Movie movie,
            Theatre theatre,
            Screen screen,
            List<BookingSeat> seats) {

        MovieShow show = movieShowRepository.findById(booking.getShowId()).orElse(null);

        List<BookedSeatDto> seatDtos = seats.stream()
                .map(s -> BookedSeatDto.builder()
                        .seatId(s.getSeatId())
                        .seatNumber(s.getSeatNumber())
                        .category(s.getSeatCategory().name())
                        .price(s.getPrice())
                        .build())
                .toList();

        return BookingResponse.builder()
                .id(booking.getId())
                .bookingReference(booking.getBookingReference())
                .userId(booking.getUserId())
                .showId(booking.getShowId())
                .movieTitle(movie != null ? movie.getTitle() : "Unknown Movie")
                .theatreName(theatre != null ? theatre.getName() : "Unknown Theatre")
                .screenName(screen != null ? screen.getName() : "Unknown Screen")
                .showDateTime(show != null ? show.getShowDateTime() : null)
                .seats(seatDtos)
                .totalAmount(booking.getTotalAmount())
                .bookingStatus(booking.getBookingStatus())
                .paymentReference(booking.getPaymentReference())
                .createdAt(booking.getCreatedAt())
                .build();
    }
}
