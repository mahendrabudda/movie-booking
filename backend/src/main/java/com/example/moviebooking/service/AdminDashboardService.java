package com.example.moviebooking.service;

import com.example.moviebooking.dto.AiPricingDtos.AdminDashboardSummary;
import com.example.moviebooking.model.Role;
import com.example.moviebooking.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AdminDashboardService {

    private final MovieRepository movieRepository;
    private final TheatreRepository theatreRepository;
    private final MovieShowRepository movieShowRepository;
    private final BookingRepository bookingRepository;
    private final AppUserRepository appUserRepository;

    public AdminDashboardSummary getSummary() {
        return AdminDashboardSummary.builder()
                .totalMovies(movieRepository.count())
                .totalTheatres(theatreRepository.count())
                .totalShows(movieShowRepository.count())
                .totalBookings(bookingRepository.count())
                .totalCustomers(appUserRepository.countByRole(Role.CUSTOMER))
                .build();
    }
}
