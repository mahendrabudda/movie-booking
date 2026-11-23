package com.example.moviebooking.controller;

import com.example.moviebooking.dto.BookingDtos.*;
import com.example.moviebooking.dto.CatalogDtos.*;
import com.example.moviebooking.security.AuthenticatedUser;
import com.example.moviebooking.service.BookingService;
import com.example.moviebooking.service.CatalogService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/manager")
@PreAuthorize("hasAnyRole('THEATRE_MANAGER', 'ADMIN')")
public class TheatreManagerController {

    private final CatalogService catalogService;
    private final BookingService bookingService;

    public TheatreManagerController(CatalogService catalogService, BookingService bookingService) {
        this.catalogService = catalogService;
        this.bookingService = bookingService;
    }

    @GetMapping("/theatres")
    public ResponseEntity<List<TheatreResponse>> getMyAssignedTheatres(
            @AuthenticationPrincipal AuthenticatedUser manager) {
        return ResponseEntity.ok(catalogService.listManagerTheatres(manager.getId()));
    }

    @GetMapping("/theatres/{theatreId}/screens")
    public ResponseEntity<List<ScreenResponse>> getScreens(
            @PathVariable Long theatreId,
            @AuthenticationPrincipal AuthenticatedUser manager) {
        return ResponseEntity.ok(catalogService.listScreensByTheatre(theatreId, manager));
    }

    @PostMapping("/theatres/{theatreId}/screens")
    public ResponseEntity<ScreenResponse> createScreen(
            @PathVariable Long theatreId,
            @Valid @RequestBody ScreenRequest request,
            @AuthenticationPrincipal AuthenticatedUser manager) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(catalogService.createScreenWithSeats(theatreId, request, manager));
    }

    @PostMapping("/shows")
    public ResponseEntity<ShowResponse> createShow(
            @Valid @RequestBody ShowRequest request,
            @AuthenticationPrincipal AuthenticatedUser manager) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(catalogService.createShow(request, manager));
    }

    @GetMapping("/theatres/{theatreId}/analytics")
    public ResponseEntity<TheatreAnalyticsDto> getTheatreAnalytics(
            @PathVariable Long theatreId,
            @AuthenticationPrincipal AuthenticatedUser manager) {
        return ResponseEntity.ok(bookingService.getTheatreAnalytics(theatreId, manager));
    }

    @PostMapping("/tickets/validate")
    public ResponseEntity<TicketValidationResponse> validateTicket(
            @Valid @RequestBody TicketValidationRequest request,
            @AuthenticationPrincipal AuthenticatedUser staffUser) {
        return ResponseEntity.ok(bookingService.validateAndCheckInTicket(request.qrToken(), staffUser));
    }
}
