package com.example.moviebooking.repository;

import com.example.moviebooking.model.ManagerTheatre;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ManagerTheatreRepository extends JpaRepository<ManagerTheatre, Long> {
    boolean existsByManagerIdAndTheatreId(Long managerId, Long theatreId);
    List<ManagerTheatre> findByManagerId(Long managerId);
}
