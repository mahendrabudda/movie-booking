package com.example.moviebooking.controller;

import com.example.moviebooking.dto.TheatreShowDtos.*;
import com.example.moviebooking.service.TheatreShowService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Tag(name = "3. Theatres, Screens & Shows", description = "Browse theatres/shows/seats and Admin theatre/screen/show management")
public class TheatreShowController {

    private final TheatreShowService theatreShowService;

    @GetMapping("/theatres")
    @Operation(summary = "Get all theatres")
    public ResponseEntity<List<TheatreResponse>> getAllTheatres() {
        return ResponseEntity.ok(theatreShowService.getAllTheatres());
    }

    @PostMapping("/theatres")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Admin: Add a theatre (SINGLE_SCREEN max ₹350 / MULTIPLEX max ₹450)")
    public ResponseEntity<TheatreResponse> createTheatre(@Valid @RequestBody TheatreRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(theatreShowService.createTheatre(request));
    }

    @GetMapping("/theatres/screens")
    @Operation(summary = "Get screens (optionally filtered by theatreId)")
    public ResponseEntity<List<ScreenResponse>> getScreens(@RequestParam(required = false) Long theatreId) {
        return ResponseEntity.ok(theatreShowService.getScreensByTheatre(theatreId));
    }

    @PostMapping("/theatres/screens")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Admin: Add a screen and automatically initialize its seats")
    public ResponseEntity<ScreenResponse> createScreen(@Valid @RequestBody ScreenRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(theatreShowService.createScreenWithSeats(request));
    }

    @GetMapping("/shows")
    @Operation(summary = "Get available shows (optionally filtered by movieId)")
    public ResponseEntity<List<ShowResponse>> getShows(@RequestParam(required = false) Long movieId) {
        return ResponseEntity.ok(theatreShowService.getShows(movieId));
    }

    @GetMapping("/shows/{id}")
    @Operation(summary = "Get show details by ID")
    public ResponseEntity<ShowResponse> getShowById(@PathVariable Long id) {
        return ResponseEntity.ok(theatreShowService.getShowById(id));
    }

    @GetMapping("/shows/{id}/seats")
    @Operation(summary = "Get seat layout and real-time booking availability for a show")
    public ResponseEntity<List<SeatAvailabilityResponse>> getShowSeats(@PathVariable Long id) {
        return ResponseEntity.ok(theatreShowService.getShowSeats(id));
    }

    @PostMapping("/shows")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Admin: Create a movie show")
    public ResponseEntity<ShowResponse> createShow(@Valid @RequestBody ShowRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(theatreShowService.createShow(request));
    }

    @PutMapping("/shows/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Admin: Update a movie show")
    public ResponseEntity<ShowResponse> updateShow(
            @PathVariable Long id,
            @Valid @RequestBody ShowRequest request) {
        return ResponseEntity.ok(theatreShowService.updateShow(id, request));
    }

    @DeleteMapping("/shows/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Admin: Delete a movie show")
    public ResponseEntity<Map<String, String>> deleteShow(@PathVariable Long id) {
        theatreShowService.deleteShow(id);
        return ResponseEntity.ok(Map.of("message", "Show deleted successfully"));
    }
}
