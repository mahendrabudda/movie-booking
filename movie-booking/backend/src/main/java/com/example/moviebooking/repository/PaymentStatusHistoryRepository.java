package com.example.moviebooking.repository;

import com.example.moviebooking.model.PaymentStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentStatusHistoryRepository extends JpaRepository<PaymentStatusHistory, Long> {
}
