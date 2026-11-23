package com.example.moviebooking.service;

import com.example.moviebooking.config.AppProperties;
import com.example.moviebooking.dto.BookingDtos.HoldSeatsRequest;
import com.example.moviebooking.dto.BookingDtos.HoldSeatsResponse;
import com.example.moviebooking.exception.BadRequestException;
import com.example.moviebooking.exception.ConflictException;
import com.example.moviebooking.exception.ResourceNotFoundException;
import com.example.moviebooking.model.*;
import com.example.moviebooking.repository.AppUserRepository;
import com.example.moviebooking.repository.ShowRepository;
import com.example.moviebooking.repository.ShowSeatRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;

@Service
public class SeatHoldService {

    private final ShowSeatRepository showSeatRepository;
    private final ShowRepository showRepository;
    private final AppUserRepository userRepository;
    private final PricingService pricingService;
    private final AppProperties appProperties;

    public SeatHoldService(ShowSeatRepository showSeatRepository,
                           ShowRepository showRepository,
                           AppUserRepository userRepository,
                           PricingService pricingService,
                           AppProperties appProperties) {
        this.showSeatRepository = showSeatRepository;
        this.showRepository = showRepository;
        this.userRepository = userRepository;
        this.pricingService = pricingService;
        this.appProperties = appProperties;
    }

    /**
     * All-or-nothing seat hold inside a single @Transactional method using
     * SELECT ... FOR UPDATE (@Lock(LockModeType.PESSIMISTIC_WRITE)).
     * Locks rows ordered by seat ID to avoid deadlocks, treats expired holds as available,
     * and snapshots the current dynamic seat price onto ShowSeat.lockedPrice so subsequent
     * AI or admin price updates never alter an active hold.
     */
    @Transactional
    public HoldSeatsResponse holdSeats(HoldSeatsRequest request, Long userId) {
        List<Long> uniqueSeatIds = new ArrayList<>(new LinkedHashSet<>(request.seatIds()));
        if (uniqueSeatIds.isEmpty()) {
            throw new BadRequestException("At least one seat must be selected.");
        }

        Show show = showRepository.findById(request.showId())
                .orElseThrow(() -> new ResourceNotFoundException("Show not found: " + request.showId()));
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        List<ShowSeat> lockedRows = showSeatRepository.findAndLockByShowIdAndSeatIds(show.getId(), uniqueSeatIds);
        if (lockedRows.size() != uniqueSeatIds.size()) {
            throw new BadRequestException("One or more requested seats do not belong to show ID " + show.getId());
        }

        Instant now = Instant.now();
        Instant expiresAt = now.plus(appProperties.getBooking().getHoldExpiryMinutes(), ChronoUnit.MINUTES);

        for (ShowSeat ss : lockedRows) {
            boolean canAcquire = ss.isEffectivelyAvailable(now) || ss.isHeldByUser(userId, now);
            if (!canAcquire) {
                throw new ConflictException("Seat " + ss.getSeat().getSeatCode() + " is already held or booked.");
            }
        }

        BigDecimal subtotal = BigDecimal.ZERO;
        List<String> seatCodes = new ArrayList<>(lockedRows.size());

        for (ShowSeat ss : lockedRows) {
            BigDecimal lockedSeatPrice = pricingService.calculateSeatDynamicPrice(
                    show, ss.getSeat().getPriceMultiplier());
            ss.setStatus(ShowSeatStatus.HELD);
            ss.setHeldBy(user);
            ss.setHoldExpiresAt(expiresAt);
            ss.setLockedPrice(lockedSeatPrice);
            subtotal = subtotal.add(lockedSeatPrice);
            seatCodes.add(ss.getSeat().getSeatCode());
        }

        showSeatRepository.saveAll(lockedRows);

        return new HoldSeatsResponse(show.getId(), uniqueSeatIds, seatCodes, subtotal, expiresAt);
    }

    /**
     * Scheduled background cleanup job that releases expired holds every 30 seconds.
     */
    @Scheduled(fixedDelayString = "${app.booking.hold-cleanup-ms:30000}")
    @Transactional
    public int releaseExpiredHoldsJob() {
        return showSeatRepository.releaseExpiredHolds(Instant.now());
    }
}
