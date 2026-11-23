package com.example.moviebooking.repository;

import com.example.moviebooking.model.Show;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.Instant;
import java.util.List;

public interface ShowRepository extends JpaRepository<Show, Long> {

    List<Show> findByMovieIdAndActiveTrueOrderByStartTimeAsc(Long movieId);

    List<Show> findByScreenTheatreIdOrderByStartTimeDesc(Long theatreId);

    @Query("""
        SELECT COUNT(s) > 0 FROM Show s
        WHERE s.screen.id = :screenId
          AND s.active = true
          AND s.startTime < :endTime
          AND s.endTime > :startTime
    """)
    boolean existsOverlappingShow(@Param("screenId") Long screenId,
                                  @Param("startTime") Instant startTime,
                                  @Param("endTime") Instant endTime);
}
