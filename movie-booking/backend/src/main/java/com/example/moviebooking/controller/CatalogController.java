package com.example.moviebooking.controller;

import com.example.moviebooking.dto.CatalogDtos.*;
import com.example.moviebooking.security.AuthenticatedUser;
import com.example.moviebooking.service.CatalogService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class CatalogController {

    private final CatalogService catalogService;

    public CatalogController(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @GetMapping("/movies")
    public ResponseEntity<List<MovieResponse>> searchMovies(
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String language,
            @RequestParam(required = false) String genre) {
        return ResponseEntity.ok(catalogService.searchMovies(city, language, genre));
    }

    @GetMapping("/movies/{id}")
    public ResponseEntity<MovieResponse> getMovie(@PathVariable Long id) {
        return ResponseEntity.ok(catalogService.getMovie(id));
    }

    @GetMapping("/movies/{id}/shows")
    public ResponseEntity<List<ShowResponse>> getShowsForMovie(@PathVariable Long id) {
        return ResponseEntity.ok(catalogService.listShowsForMovie(id));
    }

    @GetMapping("/shows/{showId}/seats")
    public ResponseEntity<List<ShowSeatDto>> getShowSeats(@PathVariable Long showId) {
        return ResponseEntity.ok(catalogService.getShowSeatMap(showId));
    }

    @GetMapping("/theatres")
    public ResponseEntity<List<TheatreResponse>> listTheatres(@RequestParam(required = false) String city) {
        return ResponseEntity.ok(catalogService.listTheatres(city));
    }

    @GetMapping("/movies/{id}/reviews")
    public ResponseEntity<List<CustomerReviewResponse>> getCustomerReviews(@PathVariable Long id) {
        return ResponseEntity.ok(catalogService.listCustomerReviews(id));
    }

    @PostMapping("/customer/movies/{id}/reviews")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<CustomerReviewResponse> submitCustomerReview(
            @PathVariable Long id,
            @Valid @RequestBody CustomerReviewRequest request,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(catalogService.addCustomerReview(id, user.getId(), request));
    }
}
