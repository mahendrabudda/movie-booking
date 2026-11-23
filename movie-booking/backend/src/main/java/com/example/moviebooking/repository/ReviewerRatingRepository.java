package com.example.moviebooking.repository;

import com.example.moviebooking.model.ReviewerRating;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ReviewerRatingRepository extends JpaRepository<ReviewerRating, Long> {
    boolean existsByMovieIdAndReviewerId(Long movieId, Long reviewerId);
    Optional<ReviewerRating> findByMovieIdAndReviewerId(Long movieId, Long reviewerId);
    List<ReviewerRating> findByMovieIdOrderBySubmittedAtAsc(Long movieId);
    long countByMovieId(Long movieId);
}
