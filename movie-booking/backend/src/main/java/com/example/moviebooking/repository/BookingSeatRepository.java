package com.example.moviebooking.repository;

import com.example.moviebooking.model.BookingSeat;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BookingSeatRepository extends JpaRepository<BookingSeat, Long> {
    List<BookingSeat> findByBookingId(Long bookingId);
    boolean existsByShowIdAndSeatIdAndConfirmedActiveTrue(Long showId, Long seatId);
}
