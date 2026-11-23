package com.example.moviebooking.repository;

import com.example.moviebooking.model.CustomerReview;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CustomerReviewRepository extends JpaRepository<CustomerReview, Long> {
    List<CustomerReview> findByMovieIdOrderByCreatedAtDesc(Long movieId);
    boolean existsByMovieIdAndUserId(Long movieId, Long userId);
}
