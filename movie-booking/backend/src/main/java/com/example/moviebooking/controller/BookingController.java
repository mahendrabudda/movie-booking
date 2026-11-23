package com.example.moviebooking.controller;

import com.example.moviebooking.dto.BookingDtos.*;
import com.example.moviebooking.security.AuthenticatedUser;
import com.example.moviebooking.service.BookingService;
import com.example.moviebooking.service.SeatHoldService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/bookings")
@PreAuthorize("hasRole('CUSTOMER')")
public class BookingController {

    private final SeatHoldService seatHoldService;
    private final BookingService bookingService;

    public BookingController(SeatHoldService seatHoldService, BookingService bookingService) {
        this.seatHoldService = seatHoldService;
        this.bookingService = bookingService;
    }

    @PostMapping("/hold")
    public ResponseEntity<HoldSeatsResponse> holdSeats(
            @Valid @RequestBody HoldSeatsRequest request,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.ok(seatHoldService.holdSeats(request, user.getId()));
    }

    @PostMapping("/initiate")
    public ResponseEntity<BookingInitResponse> initiateBooking(
            @Valid @RequestBody InitiateBookingRequest request,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(bookingService.initiateBooking(request, user.getId()));
    }

    @PostMapping("/confirm")
    public ResponseEntity<BookingSummaryDto> confirmPayment(
            @Valid @RequestBody ConfirmPaymentRequest request,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.ok(bookingService.confirmPayment(request, user));
    }

    @PostMapping("/{bookingId}/cancel")
    public ResponseEntity<BookingSummaryDto> cancelBooking(
            @PathVariable Long bookingId,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.ok(bookingService.cancelBooking(bookingId, user));
    }

    @GetMapping("/my")
    public ResponseEntity<Page<BookingSummaryDto>> listMyBookings(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.ok(bookingService.listCustomerBookings(user.getId(), PageRequest.of(page, size)));
    }

    @GetMapping("/{bookingId}")
    public ResponseEntity<BookingSummaryDto> getBooking(
            @PathVariable Long bookingId,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.ok(bookingService.getBookingForUser(bookingId, user));
    }

    @GetMapping("/{bookingId}/ticket/pdf")
    public ResponseEntity<byte[]> downloadTicketPdf(
            @PathVariable Long bookingId,
            @AuthenticationPrincipal AuthenticatedUser user) {
        byte[] pdfBytes = bookingService.downloadTicketPdf(bookingId, user);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=ticket-" + bookingId + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfBytes);
    }
}
