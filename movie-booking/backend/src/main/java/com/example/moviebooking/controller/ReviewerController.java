package com.example.moviebooking.controller;

import com.example.moviebooking.dto.PricingAndReviewerDtos.*;
import com.example.moviebooking.security.AuthenticatedUser;
import com.example.moviebooking.service.ReviewerService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reviewer")
@PreAuthorize("hasRole('MOVIE_REVIEWER')")
public class ReviewerController {

    private final ReviewerService reviewerService;

    public ReviewerController(ReviewerService reviewerService) {
        this.reviewerService = reviewerService;
    }

    @GetMapping("/movies")
    public ResponseEntity<List<ReviewerAssignedMovieDto>> getMyAssignedMovies(
            @AuthenticationPrincipal AuthenticatedUser reviewer) {
        return ResponseEntity.ok(reviewerService.getAssignedMoviesForReviewer(reviewer.getId()));
    }

    @PostMapping("/movies/{movieId}/ratings")
    public ResponseEntity<ReviewerRatingItemDto> submitOfficialRating(
            @PathVariable Long movieId,
            @Valid @RequestBody SubmitReviewerRatingRequest request,
            @AuthenticationPrincipal AuthenticatedUser reviewer) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(reviewerService.submitRating(movieId, reviewer.getId(), request));
    }
}
