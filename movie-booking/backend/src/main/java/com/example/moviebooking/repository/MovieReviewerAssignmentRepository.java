package com.example.moviebooking.repository;

import com.example.moviebooking.model.MovieReviewerAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MovieReviewerAssignmentRepository extends JpaRepository<MovieReviewerAssignment, Long> {
    boolean existsByMovieIdAndReviewerId(Long movieId, Long reviewerId);
    long countByMovieId(Long movieId);
    List<MovieReviewerAssignment> findByMovieId(Long movieId);
    List<MovieReviewerAssignment> findByReviewerId(Long reviewerId);
}
