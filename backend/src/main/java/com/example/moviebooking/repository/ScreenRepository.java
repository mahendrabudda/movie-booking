package com.example.moviebooking.repository;

import com.example.moviebooking.model.Screen;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ScreenRepository extends JpaRepository<Screen, Long> {
    List<Screen> findByTheatreIdOrderByIdAsc(Long theatreId);
}
