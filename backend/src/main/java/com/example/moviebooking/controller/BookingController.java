package com.example.moviebooking.controller;

import com.example.moviebooking.dto.BookingDtos.*;
import com.example.moviebooking.model.AppUser;
import com.example.moviebooking.service.AuthService;
import com.example.moviebooking.service.BookingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
@Tag(name = "4. Bookings", description = "Customer seat booking with mock payment and booking history")
public class BookingController {

    private final BookingService bookingService;
    private final AuthService authService;

    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    @Operation(summary = "Customer: Book selected seats for a show with mock payment")
    public ResponseEntity<BookingResponse> createBooking(
            @Valid @RequestBody BookingRequest request,
            Authentication authentication) {
        AppUser user = authService.getAuthenticatedEntity(authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(bookingService.createBooking(user.getId(), request));
    }

    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'ADMIN')")
    @Operation(summary = "Get booking history for the logged-in user")
    public ResponseEntity<List<BookingResponse>> getMyBookings(Authentication authentication) {
        AppUser user = authService.getAuthenticatedEntity(authentication.getName());
        return ResponseEntity.ok(bookingService.getUserBookings(user.getId()));
    }

    @GetMapping("/{bookingReference}")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'ADMIN')")
    @Operation(summary = "Get booking confirmation details by reference code")
    public ResponseEntity<BookingResponse> getBookingByReference(
            @PathVariable String bookingReference,
            Authentication authentication) {
        AppUser user = authService.getAuthenticatedEntity(authentication.getName());
        return ResponseEntity.ok(
                bookingService.getBookingByReference(bookingReference, user.getId(), user.getRole()));
    }
}
