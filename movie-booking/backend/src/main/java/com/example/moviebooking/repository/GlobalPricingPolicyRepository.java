package com.example.moviebooking.repository;

import com.example.moviebooking.model.GlobalPricingPolicy;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GlobalPricingPolicyRepository extends JpaRepository<GlobalPricingPolicy, Long> {
}
