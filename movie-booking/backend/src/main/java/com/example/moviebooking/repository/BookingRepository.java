package com.example.moviebooking.repository;

import com.example.moviebooking.model.Booking;
import com.example.moviebooking.model.BookingStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface BookingRepository extends JpaRepository<Booking, Long> {
    Optional<Booking> findByIdempotencyKey(String idempotencyKey);
    Optional<Booking> findByBookingReference(String bookingReference);
    Page<Booking> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
    List<Booking> findByShowIdAndStatus(Long showId, BookingStatus status);
    List<Booking> findByShowScreenTheatreIdOrderByCreatedAtDesc(Long theatreId);
}
