package com.example.moviebooking.repository;

import com.example.moviebooking.model.Theatre;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TheatreRepository extends JpaRepository<Theatre, Long> {
    List<Theatre> findByActiveTrue();
    List<Theatre> findByCityIgnoreCaseAndActiveTrue(String city);
}
