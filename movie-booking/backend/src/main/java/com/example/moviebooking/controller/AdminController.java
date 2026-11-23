package com.example.moviebooking.controller;

import com.example.moviebooking.dto.AuthDtos.*;
import com.example.moviebooking.dto.CatalogDtos.*;
import com.example.moviebooking.dto.PricingAndReviewerDtos.*;
import com.example.moviebooking.model.GlobalPricingPolicy;
import com.example.moviebooking.repository.AuditLogRepository;
import com.example.moviebooking.security.AuthenticatedUser;
import com.example.moviebooking.service.AuthService;
import com.example.moviebooking.service.CatalogService;
import com.example.moviebooking.service.PricingService;
import com.example.moviebooking.service.ReviewerService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AuthService authService;
    private final CatalogService catalogService;
    private final ReviewerService reviewerService;
    private final PricingService pricingService;
    private final AuditLogRepository auditLogRepository;

    public AdminController(AuthService authService,
                           CatalogService catalogService,
                           ReviewerService reviewerService,
                           PricingService pricingService,
                           AuditLogRepository auditLogRepository) {
        this.authService = authService;
        this.catalogService = catalogService;
        this.reviewerService = reviewerService;
        this.pricingService = pricingService;
        this.auditLogRepository = auditLogRepository;
    }

    @GetMapping("/users")
    public ResponseEntity<List<UserSummaryDto>> listUsers() {
        return ResponseEntity.ok(authService.listAllUsers());
    }

    @PostMapping("/users")
    public ResponseEntity<UserSummaryDto> createPrivilegedUser(
            @Valid @RequestBody CreatePrivilegedUserRequest request,
            @AuthenticationPrincipal AuthenticatedUser admin) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(authService.createPrivilegedUser(request, admin.getId()));
    }

    @PatchMapping("/users/{userId}/status")
    public ResponseEntity<UserSummaryDto> updateUserStatus(
            @PathVariable Long userId,
            @RequestParam boolean active,
            @RequestParam(defaultValue = "true") boolean approved,
            @AuthenticationPrincipal AuthenticatedUser admin) {
        return ResponseEntity.ok(authService.updateUserStatus(userId, active, approved, admin.getId()));
    }

    @PostMapping("/theatres")
    public ResponseEntity<TheatreResponse> createTheatre(@Valid @RequestBody TheatreRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(catalogService.createTheatre(request));
    }

    @PatchMapping("/theatres/{theatreId}")
    public ResponseEntity<TheatreResponse> updateTheatre(
            @PathVariable Long theatreId,
            @RequestParam boolean active,
            @RequestParam(required = false) BigDecimal maxTicketPrice) {
        return ResponseEntity.ok(catalogService.updateTheatreStatus(theatreId, active, maxTicketPrice));
    }

    @PostMapping("/theatres/assign-manager")
    public ResponseEntity<Void> assignManagerToTheatre(
            @Valid @RequestBody AssignManagerRequest request,
            @AuthenticationPrincipal AuthenticatedUser admin) {
        authService.assignManagerToTheatre(request, admin.getId());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/movies")
    public ResponseEntity<MovieResponse> createMovie(@Valid @RequestBody MovieRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(catalogService.createMovie(request));
    }

    @PostMapping("/movies/{movieId}/assign-reviewers")
    public ResponseEntity<Void> assignTenReviewers(
            @PathVariable Long movieId,
            @Valid @RequestBody AssignReviewersRequest request,
            @AuthenticationPrincipal AuthenticatedUser admin) {
        reviewerService.assignTenReviewersToMovie(movieId, request, admin.getId());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/movies/{movieId}/ratings-progress")
    public ResponseEntity<MovieRatingProgressDto> getRatingProgress(@PathVariable Long movieId) {
        return ResponseEntity.ok(reviewerService.getMovieRatingProgress(movieId));
    }

    @PatchMapping("/ratings/{ratingId}/correct")
    public ResponseEntity<ReviewerRatingItemDto> correctReviewerRating(
            @PathVariable Long ratingId,
            @Valid @RequestBody AdminCorrectRatingRequest request,
            @AuthenticationPrincipal AuthenticatedUser admin) {
        return ResponseEntity.ok(reviewerService.adminCorrectRating(ratingId, request, admin.getId()));
    }

    @PostMapping("/movies/{movieId}/predict-price")
    public ResponseEntity<PredictionResultDto> triggerPrediction(
            @PathVariable Long movieId,
            @AuthenticationPrincipal AuthenticatedUser admin) {
        return ResponseEntity.ok(pricingService.triggerMoviePrediction(movieId, admin.getId()));
    }

    @PostMapping("/movies/{movieId}/manual-category")
    public ResponseEntity<Void> manualCategoryApproval(
            @PathVariable Long movieId,
            @Valid @RequestBody ManualCategoryApprovalRequest request,
            @AuthenticationPrincipal AuthenticatedUser admin) {
        pricingService.manualCategoryFallback(movieId, request, admin.getId());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/movies/{movieId}/override-price")
    public ResponseEntity<Void> overridePrice(
            @PathVariable Long movieId,
            @Valid @RequestBody PriceOverrideRequest request,
            @AuthenticationPrincipal AuthenticatedUser admin) {
        pricingService.overrideMoviePrice(movieId, request, admin.getId());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/pricing-policy")
    public ResponseEntity<GlobalPricingPolicy> getPricingPolicy() {
        return ResponseEntity.ok(pricingService.getActivePolicy());
    }

    @PutMapping("/pricing-policy")
    public ResponseEntity<GlobalPricingPolicy> updatePricingPolicy(
            @Valid @RequestBody GlobalPricingPolicyDto dto,
            @AuthenticationPrincipal AuthenticatedUser admin) {
        return ResponseEntity.ok(pricingService.updateGlobalPolicy(dto, admin.getId()));
    }

    @GetMapping("/audit-logs")
    public ResponseEntity<List<AuditLogDto>> getAuditLogs() {
        List<AuditLogDto> logs = auditLogRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(a -> new AuditLogDto(
                        a.getId(),
                        a.getActionType(),
                        a.getEntityType(),
                        a.getEntityId(),
                        a.getActorUser().getEmail(),
                        a.getOldValue(),
                        a.getNewValue(),
                        a.getReason(),
                        a.getCreatedAt()
                )).toList();
        return ResponseEntity.ok(logs);
    }
}
