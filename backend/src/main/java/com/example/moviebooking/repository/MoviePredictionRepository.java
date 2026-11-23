package com.example.moviebooking.repository;

import com.example.moviebooking.model.MoviePrediction;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MoviePredictionRepository extends JpaRepository<MoviePrediction, Long> {
    List<MoviePrediction> findByMovieIdOrderByCreatedAtDesc(Long movieId);
}
