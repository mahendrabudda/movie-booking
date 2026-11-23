package com.example.moviebooking.repository;

import com.example.moviebooking.model.EmailNotification;
import com.example.moviebooking.model.NotificationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface EmailNotificationRepository extends JpaRepository<EmailNotification, Long> {
    List<EmailNotification> findByStatusAndRetryCountLessThan(NotificationStatus status, int maxRetries);
    List<EmailNotification> findByBookingId(Long bookingId);
}
