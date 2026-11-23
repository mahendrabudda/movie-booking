package com.example.moviebooking.controller;

import com.example.moviebooking.dto.AiPricingDtos.*;
import com.example.moviebooking.service.AdminDashboardService;
import com.example.moviebooking.service.AiPricingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
@Tag(name = "5. Admin & AI Dynamic Pricing", description = "Admin summary metrics and AI-driven dynamic ticket price prediction & approval")
public class AdminPricingController {

    private final AiPricingService aiPricingService;
    private final AdminDashboardService adminDashboardService;

    @GetMapping("/dashboard/summary")
    @Operation(summary = "Admin: Get total counts for movies, theatres, shows, bookings, and customers")
    public ResponseEntity<AdminDashboardSummary> getDashboardSummary() {
        return ResponseEntity.ok(adminDashboardService.getSummary());
    }

    @PostMapping("/pricing/predict/{movieId}")
    @Operation(summary = "Admin: Trigger FastAPI ML prediction for a movie and compute recommended ticket price")
    public ResponseEntity<PredictionResponse> predictPrice(
            @PathVariable Long movieId,
            @Valid @RequestBody PredictionTriggerRequest request) {
        return ResponseEntity.ok(aiPricingService.predictTicketPrice(movieId, request));
    }

    @GetMapping("/pricing/{movieId}")
    @Operation(summary = "Admin: View AI pricing prediction history for a movie")
    public ResponseEntity<List<PredictionResponse>> getPredictionsForMovie(@PathVariable Long movieId) {
        return ResponseEntity.ok(aiPricingService.getPredictionsForMovie(movieId));
    }

    @PostMapping("/pricing/approve/{predictionId}")
    @Operation(summary = "Admin: Approve an AI-recommended price and apply it to the movie")
    public ResponseEntity<PredictionResponse> approvePrediction(
            @PathVariable Long predictionId,
            @RequestBody(required = false) ApprovePredictionRequest request) {
        return ResponseEntity.ok(aiPricingService.approvePrediction(predictionId, request));
    }
}
