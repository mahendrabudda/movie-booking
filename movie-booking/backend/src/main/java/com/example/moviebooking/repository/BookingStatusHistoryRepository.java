package com.example.moviebooking.repository;

import com.example.moviebooking.model.BookingStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BookingStatusHistoryRepository extends JpaRepository<BookingStatusHistory, Long> {
    List<BookingStatusHistory> findByBookingIdOrderByChangedAtAsc(Long bookingId);
}
