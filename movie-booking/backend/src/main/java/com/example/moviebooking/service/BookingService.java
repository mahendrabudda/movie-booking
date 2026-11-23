package com.example.moviebooking.service;

import com.example.moviebooking.config.AppProperties;
import com.example.moviebooking.dto.BookingDtos.*;
import com.example.moviebooking.email.TicketEmailService;
import com.example.moviebooking.exception.BadRequestException;
import com.example.moviebooking.exception.ConflictException;
import com.example.moviebooking.exception.ResourceNotFoundException;
import com.example.moviebooking.model.*;
import com.example.moviebooking.repository.*;
import com.example.moviebooking.security.AuthenticatedUser;
import com.example.moviebooking.security.OwnershipVerifier;
import com.example.moviebooking.util.PdfTicketGenerator;
import com.example.moviebooking.util.QrCodeHelper;
import com.example.moviebooking.util.TimeUtil;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class BookingService {

    private final BookingRepository bookingRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final BookingStatusHistoryRepository bookingStatusHistoryRepository;
    private final PaymentRepository paymentRepository;
    private final PaymentStatusHistoryRepository paymentStatusHistoryRepository;
    private final RefundRepository refundRepository;
    private final ShowRepository showRepository;
    private final ShowSeatRepository showSeatRepository;
    private final CouponRepository couponRepository;
    private final AppUserRepository userRepository;
    private final TheatreRepository theatreRepository;
    private final PaymentGateway paymentGateway;
    private final PricingService pricingService;
    private final QrCodeHelper qrCodeHelper;
    private final PdfTicketGenerator pdfTicketGenerator;
    private final TicketEmailService ticketEmailService;
    private final OwnershipVerifier ownershipVerifier;
    private final AppProperties appProperties;

    public BookingService(BookingRepository bookingRepository,
                          BookingSeatRepository bookingSeatRepository,
                          BookingStatusHistoryRepository bookingStatusHistoryRepository,
                          PaymentRepository paymentRepository,
                          PaymentStatusHistoryRepository paymentStatusHistoryRepository,
                          RefundRepository refundRepository,
                          ShowRepository showRepository,
                          ShowSeatRepository showSeatRepository,
                          CouponRepository couponRepository,
                          AppUserRepository userRepository,
                          TheatreRepository theatreRepository,
                          PaymentGateway paymentGateway,
                          PricingService pricingService,
                          QrCodeHelper qrCodeHelper,
                          PdfTicketGenerator pdfTicketGenerator,
                          TicketEmailService ticketEmailService,
                          OwnershipVerifier ownershipVerifier,
                          AppProperties appProperties) {
        this.bookingRepository = bookingRepository;
        this.bookingSeatRepository = bookingSeatRepository;
        this.bookingStatusHistoryRepository = bookingStatusHistoryRepository;
        this.paymentRepository = paymentRepository;
        this.paymentStatusHistoryRepository = paymentStatusHistoryRepository;
        this.refundRepository = refundRepository;
        this.showRepository = showRepository;
        this.showSeatRepository = showSeatRepository;
        this.couponRepository = couponRepository;
        this.userRepository = userRepository;
        this.theatreRepository = theatreRepository;
        this.paymentGateway = paymentGateway;
        this.pricingService = pricingService;
        this.qrCodeHelper = qrCodeHelper;
        this.pdfTicketGenerator = pdfTicketGenerator;
        this.ticketEmailService = ticketEmailService;
        this.ownershipVerifier = ownershipVerifier;
        this.appProperties = appProperties;
    }

    /**
     * Initiates a booking from HELD seats.
     * Enforces idempotency via idempotencyKey so repeated calls return the same order without double-charging.
     */
    @Transactional
    public BookingInitResponse initiateBooking(InitiateBookingRequest request, Long userId) {
        Optional<Booking> existingOpt = bookingRepository.findByIdempotencyKey(request.idempotencyKey());
        if (existingOpt.isPresent()) {
            Booking existing = existingOpt.get();
            if (!existing.getUser().getId().equals(userId)) {
                throw new ConflictException("Idempotency key conflict with another user.");
            }
            Payment existingPayment = paymentRepository.findFirstByBookingIdOrderByCreatedAtDesc(existing.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Payment not found for booking"));
            return new BookingInitResponse(
                    existing.getId(),
                    existing.getBookingReference(),
                    existing.getStatus(),
                    existing.getSeatSubtotal(),
                    existing.getConvenienceFee(),
                    existing.getGstAmount(),
                    existing.getDiscountAmount(),
                    existing.getTotalAmount(),
                    existingPayment.getProvider(),
                    existingPayment.getGatewayOrderId(),
                    null
            );
        }

        List<Long> uniqueSeatIds = new ArrayList<>(new LinkedHashSet<>(request.seatIds()));
        Show show = showRepository.findById(request.showId())
                .orElseThrow(() -> new ResourceNotFoundException("Show not found: " + request.showId()));
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        List<ShowSeat> lockedSeats = showSeatRepository.findAndLockByShowIdAndSeatIds(show.getId(), uniqueSeatIds);
        if (lockedSeats.size() != uniqueSeatIds.size()) {
            throw new BadRequestException("Invalid seats selected for show.");
        }

        Instant now = Instant.now();
        BigDecimal seatSubtotal = BigDecimal.ZERO;

        for (ShowSeat ss : lockedSeats) {
            if (!ss.isHeldByUser(userId, now)) {
                throw new ConflictException("Seat " + ss.getSeat().getSeatCode()
                        + " is not currently held by you or the hold has expired.");
            }
            BigDecimal seatPrice = ss.getLockedPrice() != null
                    ? ss.getLockedPrice()
                    : pricingService.calculateSeatDynamicPrice(show, ss.getSeat().getPriceMultiplier());
            seatSubtotal = seatSubtotal.add(seatPrice);
        }

        BigDecimal discountAmount = BigDecimal.ZERO;
        String appliedCouponCode = null;
        if (request.couponCode() != null && !request.couponCode().isBlank()) {
            Coupon coupon = validateAndApplyCoupon(request.couponCode().trim(), seatSubtotal, now);
            discountAmount = calculateCouponDiscount(coupon, seatSubtotal);
            appliedCouponCode = coupon.getCode();
        }

        BigDecimal discountedSubtotal = seatSubtotal.subtract(discountAmount).max(BigDecimal.ZERO);
        BigDecimal convenienceFee = discountedSubtotal
                .multiply(appProperties.getBooking().getConvenienceFeePercent())
                .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        BigDecimal gstAmount = convenienceFee
                .multiply(appProperties.getBooking().getGstPercent())
                .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        BigDecimal totalAmount = discountedSubtotal.add(convenienceFee).add(gstAmount).setScale(2, RoundingMode.HALF_UP);

        String bookingRef = "MB-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();

        Booking booking = new Booking();
        booking.setBookingReference(bookingRef);
        booking.setIdempotencyKey(request.idempotencyKey());
        booking.setUser(user);
        booking.setShow(show);
        booking.setStatus(BookingStatus.PAYMENT_PENDING);
        booking.setSeatSubtotal(seatSubtotal);
        booking.setConvenienceFee(convenienceFee);
        booking.setGstAmount(gstAmount);
        booking.setDiscountAmount(discountAmount);
        booking.setTotalAmount(totalAmount);
        booking.setCouponCode(appliedCouponCode);
        booking = bookingRepository.save(booking);

        for (ShowSeat ss : lockedSeats) {
            BookingSeat bs = new BookingSeat();
            bs.setBooking(booking);
            bs.setShow(show);
            bs.setSeat(ss.getSeat());
            bs.setSeatLabel(ss.getSeat().getSeatCode());
            bs.setPrice(ss.getLockedPrice());
            bs.setConfirmedActive(false);
            bookingSeatRepository.save(bs);
        }

        bookingStatusHistoryRepository.save(new BookingStatusHistory(
                booking, BookingStatus.HELD, BookingStatus.PAYMENT_PENDING, "Booking initiated from held seats"));

        PaymentGateway.GatewayOrder gatewayOrder = paymentGateway.createOrder(bookingRef, totalAmount);

        Payment payment = new Payment();
        payment.setBooking(booking);
        payment.setIdempotencyKey("pay_init_" + request.idempotencyKey());
        payment.setProvider(gatewayOrder.provider());
        payment.setGatewayOrderId(gatewayOrder.orderId());
        payment.setAmount(totalAmount);
        payment.setStatus(PaymentStatus.CREATED);
        payment = paymentRepository.save(payment);

        paymentStatusHistoryRepository.save(new PaymentStatusHistory(
                payment, null, PaymentStatus.CREATED, "Gateway order created: " + gatewayOrder.orderId()));

        return new BookingInitResponse(
                booking.getId(),
                booking.getBookingReference(),
                booking.getStatus(),
                booking.getSeatSubtotal(),
                booking.getConvenienceFee(),
                booking.getGstAmount(),
                booking.getDiscountAmount(),
                booking.getTotalAmount(),
                gatewayOrder.provider(),
                gatewayOrder.orderId(),
                gatewayOrder.signatureHint()
        );
    }

    /**
     * Verifies payment signature and confirms the booking if seats are still held by the user and not expired.
     * Idempotent: repeated calls with an already confirmed booking return the confirmed booking summary.
     */
    @Transactional
    public BookingSummaryDto confirmPayment(ConfirmPaymentRequest request, AuthenticatedUser actor) {
        Booking booking = bookingRepository.findById(request.bookingId())
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + request.bookingId()));

        ownershipVerifier.verifyBookingOwnership(actor, booking);

        if (booking.getStatus() == BookingStatus.CONFIRMED) {
            return toBookingSummary(booking);
        }
        if (booking.getStatus() != BookingStatus.PAYMENT_PENDING) {
            throw new ConflictException("Booking cannot be confirmed from status: " + booking.getStatus());
        }

        Payment payment = paymentRepository.findByGatewayOrderId(request.gatewayOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Payment order not found: " + request.gatewayOrderId()));

        List<BookingSeat> bookingSeats = bookingSeatRepository.findByBookingId(booking.getId());
        List<Long> seatIds = bookingSeats.stream().map(bs -> bs.getSeat().getId()).toList();
        List<ShowSeat> lockedShowSeats = showSeatRepository.findAndLockByShowIdAndSeatIds(
                booking.getShow().getId(), seatIds);

        Instant now = Instant.now();
        for (ShowSeat ss : lockedShowSeats) {
            if (!ss.isHeldByUser(booking.getUser().getId(), now)) {
                booking.setStatus(BookingStatus.EXPIRED);
                bookingRepository.save(booking);
                bookingStatusHistoryRepository.save(new BookingStatusHistory(
                        booking, BookingStatus.PAYMENT_PENDING, BookingStatus.EXPIRED, "Hold expired prior to payment confirmation"));
                throw new ConflictException("Seat hold expired before payment could be confirmed.");
            }
        }

        boolean signatureValid = paymentGateway.verifySignature(
                request.gatewayOrderId(), request.gatewayPaymentId(), request.gatewaySignature());

        if (!signatureValid) {
            payment.setStatus(PaymentStatus.FAILED);
            payment.setUpdatedAt(now);
            paymentRepository.save(payment);
            paymentStatusHistoryRepository.save(new PaymentStatusHistory(
                    payment, PaymentStatus.CREATED, PaymentStatus.FAILED, "Invalid payment signature"));

            booking.setStatus(BookingStatus.FAILED);
            bookingRepository.save(booking);
            bookingStatusHistoryRepository.save(new BookingStatusHistory(
                    booking, BookingStatus.PAYMENT_PENDING, BookingStatus.FAILED, "Payment signature verification failed"));
            throw new BadRequestException("Payment signature verification failed.");
        }

        for (ShowSeat ss : lockedShowSeats) {
            ss.setStatus(ShowSeatStatus.BOOKED);
            ss.setHoldExpiresAt(null);
        }
        showSeatRepository.saveAll(lockedShowSeats);

        for (BookingSeat bs : bookingSeats) {
            bs.setConfirmedActive(true);
        }
        bookingSeatRepository.saveAll(bookingSeats);

        String qrToken = qrCodeHelper.generateSignedToken(
                booking.getBookingReference(), booking.getShow().getId(), now.getEpochSecond());

        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setQrToken(qrToken);
        booking.setConfirmedAt(now);
        booking = bookingRepository.save(booking);

        bookingStatusHistoryRepository.save(new BookingStatusHistory(
                booking, BookingStatus.PAYMENT_PENDING, BookingStatus.CONFIRMED, "Payment verified and seats booked"));

        payment.setGatewayPaymentId(request.gatewayPaymentId());
        payment.setGatewaySignature(request.gatewaySignature());
        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setUpdatedAt(now);
        paymentRepository.save(payment);

        paymentStatusHistoryRepository.save(new PaymentStatusHistory(
                payment, PaymentStatus.CREATED, PaymentStatus.SUCCESS, "Payment verified"));

        // Asynchronously send PDF ticket email; email failure never breaks booking confirmation
        ticketEmailService.sendBookingConfirmationAsync(booking.getId());

        return toBookingSummary(booking);
    }

    /**
     * Cancels a CONFIRMED booking before the configurable cutoff (default 2 hours before show),
     * releases seats, and creates a mock Refund record.
     */
    @Transactional
    public BookingSummaryDto cancelBooking(Long bookingId, AuthenticatedUser actor) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + bookingId));

        ownershipVerifier.verifyBookingOwnership(actor, booking);

        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new BadRequestException("Only CONFIRMED bookings can be cancelled.");
        }

        Instant cutoff = booking.getShow().getStartTime()
                .minus(appProperties.getBooking().getCancellationCutoffHours(), ChronoUnit.HOURS);
        Instant now = Instant.now();
        if (now.isAfter(cutoff)) {
            throw new BadRequestException("Cancellation is only allowed at least "
                    + appProperties.getBooking().getCancellationCutoffHours() + " hours before showtime.");
        }

        List<BookingSeat> bookingSeats = bookingSeatRepository.findByBookingId(booking.getId());
        List<Long> seatIds = bookingSeats.stream().map(bs -> bs.getSeat().getId()).toList();
        List<ShowSeat> lockedShowSeats = showSeatRepository.findAndLockByShowIdAndSeatIds(
                booking.getShow().getId(), seatIds);

        for (ShowSeat ss : lockedShowSeats) {
            ss.setStatus(ShowSeatStatus.AVAILABLE);
            ss.setHeldBy(null);
            ss.setHoldExpiresAt(null);
            ss.setLockedPrice(null);
        }
        showSeatRepository.saveAll(lockedShowSeats);

        for (BookingSeat bs : bookingSeats) {
            bs.setConfirmedActive(false);
        }
        bookingSeatRepository.saveAll(bookingSeats);

        booking.setStatus(BookingStatus.CANCELLED);
        booking.setCancelledAt(now);
        booking = bookingRepository.save(booking);

        bookingStatusHistoryRepository.save(new BookingStatusHistory(
                booking, BookingStatus.CONFIRMED, BookingStatus.CANCELLED, "Cancelled by user before cutoff"));

        paymentRepository.findFirstByBookingIdOrderByCreatedAtDesc(booking.getId()).ifPresent(payment -> {
            payment.setStatus(PaymentStatus.REFUNDED);
            payment.setUpdatedAt(now);
            paymentRepository.save(payment);
            paymentStatusHistoryRepository.save(new PaymentStatusHistory(
                    payment, PaymentStatus.SUCCESS, PaymentStatus.REFUNDED, "Mock refund processed"));

            Refund refund = new Refund();
            refund.setBooking(booking);
            refund.setPayment(payment);
            refund.setAmount(booking.getTotalAmount());
            refund.setStatus(RefundStatus.PROCESSED);
            refund.setReason("Customer cancellation before cutoff");
            refundRepository.save(refund);
        });

        return toBookingSummary(booking);
    }

    @Transactional(readOnly = true)
    public Page<BookingSummaryDto> listCustomerBookings(Long userId, Pageable pageable) {
        return bookingRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(this::toBookingSummary);
    }

    @Transactional(readOnly = true)
    public BookingSummaryDto getBookingForUser(Long bookingId, AuthenticatedUser actor) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + bookingId));
        ownershipVerifier.verifyBookingOwnership(actor, booking);
        return toBookingSummary(booking);
    }

    @Transactional(readOnly = true)
    public byte[] downloadTicketPdf(Long bookingId, AuthenticatedUser actor) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + bookingId));
        ownershipVerifier.verifyBookingOwnership(actor, booking);
        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new BadRequestException("Ticket PDF is available only for CONFIRMED bookings.");
        }
        List<String> seatLabels = bookingSeatRepository.findByBookingId(booking.getId())
                .stream().map(BookingSeat::getSeatLabel).toList();
        return pdfTicketGenerator.generateTicketPdf(booking, seatLabels);
    }

    /**
     * Validates a ticket QR token at theatre entrance (THEATRE_MANAGER of that theatre or ADMIN).
     * Ensures a ticket can be checked in only once.
     */
    @Transactional
    public TicketValidationResponse validateAndCheckInTicket(String qrToken, AuthenticatedUser staffUser) {
        String bookingRef;
        try {
            bookingRef = qrCodeHelper.verifyAndExtractBookingRef(qrToken);
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException(ex.getMessage());
        }

        Booking booking = bookingRepository.findByBookingReference(bookingRef)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found for QR token"));

        Long theatreId = booking.getShow().getScreen().getTheatre().getId();
        ownershipVerifier.verifyTheatreAccess(staffUser, theatreId);

        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new BadRequestException("Ticket is not active (status=" + booking.getStatus() + ")");
        }
        if (booking.isCheckedIn()) {
            throw new ConflictException("Ticket " + bookingRef + " has already been checked in at "
                    + TimeUtil.formatIst(booking.getCheckedInAt()));
        }

        AppUser staff = userRepository.findById(staffUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Staff user not found"));
        booking.setCheckedIn(true);
        booking.setCheckedInAt(Instant.now());
        booking.setCheckedInBy(staff);
        bookingRepository.save(booking);

        List<String> seats = bookingSeatRepository.findByBookingId(booking.getId())
                .stream().map(BookingSeat::getSeatLabel).toList();

        return new TicketValidationResponse(
                true,
                booking.getBookingReference(),
                booking.getShow().getMovie().getTitle(),
                booking.getShow().getScreen().getTheatre().getName(),
                booking.getShow().getScreen().getName(),
                seats,
                booking.getCheckedInAt(),
                "Ticket verified and checked in."
        );
    }

    @Transactional(readOnly = true)
    public TheatreAnalyticsDto getTheatreAnalytics(Long theatreId, AuthenticatedUser actor) {
        ownershipVerifier.verifyTheatreAccess(actor, theatreId);
        Theatre theatre = theatreRepository.findById(theatreId)
                .orElseThrow(() -> new ResourceNotFoundException("Theatre not found: " + theatreId));

        List<Show> shows = showRepository.findByScreenTheatreIdOrderByStartTimeDesc(theatreId);
        List<Booking> bookings = bookingRepository.findByShowScreenTheatreIdOrderByCreatedAtDesc(theatreId);

        long confirmedCount = 0;
        long totalSeatsBooked = 0;
        BigDecimal totalRevenue = BigDecimal.ZERO;

        for (Booking b : bookings) {
            if (b.getStatus() == BookingStatus.CONFIRMED) {
                confirmedCount++;
                totalRevenue = totalRevenue.add(b.getTotalAmount());
                totalSeatsBooked += bookingSeatRepository.findByBookingId(b.getId()).size();
            }
        }

        long totalCapacity = shows.stream().mapToLong(s -> s.getScreen().getTotalSeats()).sum();
        double occupancyPct = totalCapacity > 0
                ? Math.round((totalSeatsBooked * 10000.0) / totalCapacity) / 100.0
                : 0.0;

        return new TheatreAnalyticsDto(
                theatre.getId(),
                theatre.getName(),
                shows.size(),
                confirmedCount,
                totalSeatsBooked,
                totalCapacity,
                occupancyPct,
                totalRevenue
        );
    }

    private Coupon validateAndApplyCoupon(String code, BigDecimal subtotal, Instant now) {
        Coupon coupon = couponRepository.findByCodeIgnoreCaseAndActiveTrue(code)
                .orElseThrow(() -> new BadRequestException("Invalid or inactive coupon code: " + code));
        if (coupon.getExpiresAt().isBefore(now)) {
            throw new BadRequestException("Coupon has expired: " + code);
        }
        if (coupon.getUsedCount() >= coupon.getUsageLimit()) {
            throw new BadRequestException("Coupon usage limit reached: " + code);
        }
        if (subtotal.compareTo(coupon.getMinOrderAmount()) < 0) {
            throw new BadRequestException("Minimum order amount for coupon " + code + " is INR " + coupon.getMinOrderAmount());
        }
        coupon.setUsedCount(coupon.getUsedCount() + 1);
        return couponRepository.save(coupon);
    }

    private BigDecimal calculateCouponDiscount(Coupon coupon, BigDecimal subtotal) {
        BigDecimal discount;
        if (coupon.getDiscountType() == DiscountType.PERCENTAGE) {
            discount = subtotal.multiply(coupon.getDiscountValue())
                    .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        } else {
            discount = coupon.getDiscountValue();
        }
        if (coupon.getMaxDiscount() != null && discount.compareTo(coupon.getMaxDiscount()) > 0) {
            discount = coupon.getMaxDiscount();
        }
        return discount.min(subtotal).setScale(2, RoundingMode.HALF_UP);
    }

    public BookingSummaryDto toBookingSummary(Booking b) {
        List<String> seats = bookingSeatRepository.findByBookingId(b.getId())
                .stream().map(BookingSeat::getSeatLabel).toList();
        return new BookingSummaryDto(
                b.getId(),
                b.getBookingReference(),
                b.getShow().getId(),
                b.getShow().getMovie().getTitle(),
                b.getShow().getScreen().getTheatre().getName(),
                b.getShow().getScreen().getName(),
                b.getShow().getStartTime(),
                TimeUtil.formatIst(b.getShow().getStartTime()),
                seats,
                b.getStatus(),
                b.getSeatSubtotal(),
                b.getConvenienceFee(),
                b.getGstAmount(),
                b.getDiscountAmount(),
                b.getTotalAmount(),
                b.getQrToken(),
                b.isCheckedIn(),
                b.getCreatedAt()
        );
    }
}
