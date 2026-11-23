package com.example.moviebooking.repository;

import com.example.moviebooking.model.Movie;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface MovieRepository extends JpaRepository<Movie, Long> {

    @Query("""
        SELECT DISTINCT m FROM Movie m
        LEFT JOIN Show s ON s.movie.id = m.id AND s.active = true
        LEFT JOIN Screen sc ON s.screen.id = sc.id
        LEFT JOIN Theatre t ON sc.theatre.id = t.id
        WHERE m.active = true
          AND (:genre IS NULL OR LOWER(m.genre) = LOWER(:genre))
          AND (:language IS NULL OR LOWER(m.language) = LOWER(:language))
          AND (:city IS NULL OR LOWER(t.city) = LOWER(:city))
    """)
    List<Movie> searchMovies(@Param("city") String city,
                             @Param("language") String language,
                             @Param("genre") String genre);
}
