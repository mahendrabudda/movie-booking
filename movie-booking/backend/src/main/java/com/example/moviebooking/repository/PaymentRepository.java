package com.example.moviebooking.repository;

import com.example.moviebooking.model.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByIdempotencyKey(String idempotencyKey);
    Optional<Payment> findByGatewayOrderId(String gatewayOrderId);
    Optional<Payment> findFirstByBookingIdOrderByCreatedAtDesc(Long bookingId);
}
