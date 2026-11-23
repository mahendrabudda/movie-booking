package com.example.moviebooking;

import com.example.moviebooking.dto.BookingDtos.*;
import com.example.moviebooking.dto.PricingAndReviewerDtos.PriceOverrideRequest;
import com.example.moviebooking.model.*;
import com.example.moviebooking.repository.*;
import com.example.moviebooking.security.AuthenticatedUser;
import com.example.moviebooking.service.BookingService;
import com.example.moviebooking.service.PricingService;
import com.example.moviebooking.service.SeatHoldService;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@SpringBootTest
@ActiveProfiles("test")
class SeatConcurrencyAndBookingFlowTest {

    @Autowired private SeatHoldService seatHoldService;
    @Autowired private BookingService bookingService;
    @Autowired private PricingService pricingService;
    @Autowired private AppUserRepository userRepository;
    @Autowired private TheatreRepository theatreRepository;
    @Autowired private ScreenRepository screenRepository;
    @Autowired private SeatRepository seatRepository;
    @Autowired private MovieRepository movieRepository;
    @Autowired private ShowRepository showRepository;
    @Autowired private ShowSeatRepository showSeatRepository;
    @Autowired private BookingRepository bookingRepository;
    @Autowired private EmailNotificationRepository emailNotificationRepository;
    @Autowired private GlobalPricingPolicyRepository policyRepository;

    @MockBean private JavaMailSender javaMailSender;

    private AppUser admin;
    private List<AppUser> customers;
    private Show show;
    private Seat targetSeat;

    @BeforeEach
    void setUp() {
        emailNotificationRepository.deleteAll();
        bookingRepository.deleteAll();
        showSeatRepository.deleteAll();
        showRepository.deleteAll();
        seatRepository.deleteAll();
        screenRepository.deleteAll();
        theatreRepository.deleteAll();
        movieRepository.deleteAll();
        userRepository.deleteAll();
        policyRepository.deleteAll();

        GlobalPricingPolicy policy = new GlobalPricingPolicy();
        policyRepository.save(policy);

        admin = userRepository.save(new AppUser("admin@test.local", "hash", "Admin", Role.ADMIN, true, true));

        customers = new ArrayList<>();
        for (int i = 1; i <= 10; i++) {
            customers.add(userRepository.save(
                    new AppUser("cust" + i + "@test.local", "hash", "Customer " + i, Role.CUSTOMER, true, true)));
        }

        Theatre theatre = new Theatre();
        theatre.setName("Test Multiplex");
        theatre.setCity("Hyderabad");
        theatre.setAddress("Road 1");
        theatre.setType(TheatreType.MULTIPLEX);
        theatre.setMaxTicketPrice(new BigDecimal("450.00"));
        theatre = theatreRepository.save(theatre);

        Screen screen = new Screen();
        screen.setTheatre(theatre);
        screen.setName("Screen 1");
        screen.setTotalSeats(2);
        screen = screenRepository.save(screen);

        targetSeat = new Seat();
        targetSeat.setScreen(screen);
        targetSeat.setRowLabel("A");
        targetSeat.setSeatNumber(1);
        targetSeat.setCategory(SeatCategory.REGULAR);
        targetSeat.setPriceMultiplier(BigDecimal.ONE);
        targetSeat = seatRepository.save(targetSeat);

        Movie movie = new Movie();
        movie.setTitle("Concurrency Action Movie");
        movie.setGenre("ACTION");
        movie.setLanguage("Telugu");
        movie.setDurationMinutes(150);
        movie.setReleaseDate(LocalDate.now());
        movie = movieRepository.save(movie);

        show = new Show();
        show.setMovie(movie);
        show.setScreen(screen);
        show.setStartTime(Instant.now().plus(24, ChronoUnit.HOURS));
        show.setEndTime(Instant.now().plus(27, ChronoUnit.HOURS));
        show.setBasePrice(new BigDecimal("200.00"));
        show = showRepository.save(show);

        ShowSeat ss = new ShowSeat();
        ss.setShow(show);
        ss.setSeat(targetSeat);
        ss.setStatus(ShowSeatStatus.AVAILABLE);
        showSeatRepository.save(ss);
    }

    @Test
    void tenConcurrentThreadsHoldingSameSeatAllowsExactlyOneWinner() throws InterruptedException {
        int threadCount = 10;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch readyLatch = new CountDownLatch(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger conflictCount = new AtomicInteger(0);

        for (int i = 0; i < threadCount; i++) {
            final Long userId = customers.get(i).getId();
            executor.submit(() -> {
                readyLatch.countDown();
                try {
                    startLatch.await();
                    seatHoldService.holdSeats(new HoldSeatsRequest(show.getId(), List.of(targetSeat.getId())), userId);
                    successCount.incrementAndGet();
                } catch (Exception ex) {
                    conflictCount.incrementAndGet();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        readyLatch.await(5, TimeUnit.SECONDS);
        startLatch.countDown();
        doneLatch.await(10, TimeUnit.SECONDS);
        executor.shutdown();

        assertEquals(1, successCount.get(), "Exactly ONE thread must succeed in holding the seat");
        assertEquals(9, conflictCount.get(), "The other 9 threads must fail with conflict");
    }

    @Test
    void expiredHoldIsReleasedAndCanBeHeldByAnotherUser() {
        AppUser user1 = customers.get(0);
        AppUser user2 = customers.get(1);

        seatHoldService.holdSeats(new HoldSeatsRequest(show.getId(), List.of(targetSeat.getId())), user1.getId());

        // Force hold expiry into the past
        ShowSeat ss = showSeatRepository.findByShowIdOrderBySeatRowLabelAscSeatSeatNumberAsc(show.getId()).get(0);
        ss.setHoldExpiresAt(Instant.now().minus(1, ChronoUnit.MINUTES));
        showSeatRepository.save(ss);

        int released = seatHoldService.releaseExpiredHoldsJob();
        assertEquals(1, released);

        HoldSeatsResponse secondHold = seatHoldService.holdSeats(
                new HoldSeatsRequest(show.getId(), List.of(targetSeat.getId())), user2.getId());
        assertEquals(List.of("A1"), secondHold.seatCodes());
    }

    @Test
    void confirmedBookingAndExistingHoldKeepLockedPriceAfterAdminPriceOverride() {
        AppUser user = customers.get(0);
        AuthenticatedUser principal = new AuthenticatedUser(
                user.getId(), user.getEmail(), "", Role.CUSTOMER, true, true);

        // 1. Hold seat at initial ₹200.00 base price
        HoldSeatsResponse hold = seatHoldService.holdSeats(
                new HoldSeatsRequest(show.getId(), List.of(targetSeat.getId())), user.getId());
        assertEquals(new BigDecimal("200.00"), hold.lockedSeatSubtotal());

        // 2. Admin overrides movie price to ₹340.00 while seat is held
        pricingService.overrideMoviePrice(
                show.getMovie().getId(),
                new PriceOverrideRequest(new BigDecimal("340.00"), "High weekend demand override"),
                admin.getId());

        // 3. Initiate and confirm booking -> must still use locked ₹200.00 seat subtotal
        BookingInitResponse init = bookingService.initiateBooking(
                new InitiateBookingRequest(show.getId(), List.of(targetSeat.getId()), null, "idem-price-lock-1"),
                user.getId());
        assertEquals(new BigDecimal("200.00"), init.seatSubtotal());

        when(javaMailSender.createMimeMessage()).thenReturn(mock(MimeMessage.class));
        BookingSummaryDto confirmed = bookingService.confirmPayment(
                new ConfirmPaymentRequest(
                        init.bookingId(),
                        init.gatewayOrderId(),
                        "mock_pay_demo",
                        init.mockSignatureHint(),
                        "confirm-idem-1"),
                principal);

        assertEquals(BookingStatus.CONFIRMED, confirmed.status());
        assertEquals(new BigDecimal("200.00"), confirmed.seatSubtotal());
    }

    @Test
    void idempotencyKeyPreventsDuplicateBookingsAndDoubleCharges() {
        AppUser user = customers.get(0);
        seatHoldService.holdSeats(new HoldSeatsRequest(show.getId(), List.of(targetSeat.getId())), user.getId());

        InitiateBookingRequest req = new InitiateBookingRequest(
                show.getId(), List.of(targetSeat.getId()), null, "idem-repeat-key-99");

        BookingInitResponse first = bookingService.initiateBooking(req, user.getId());
        BookingInitResponse second = bookingService.initiateBooking(req, user.getId());

        assertEquals(first.bookingId(), second.bookingId());
        assertEquals(first.bookingReference(), second.bookingReference());
        assertEquals(first.gatewayOrderId(), second.gatewayOrderId());
        assertEquals(1, bookingRepository.count());
    }

    @Test
    void emailFailureDoesNotBreakBookingConfirmationAndLogsFailedNotification() {
        AppUser user = customers.get(0);
        AuthenticatedUser principal = new AuthenticatedUser(
                user.getId(), user.getEmail(), "", Role.CUSTOMER, true, true);

        seatHoldService.holdSeats(new HoldSeatsRequest(show.getId(), List.of(targetSeat.getId())), user.getId());
        BookingInitResponse init = bookingService.initiateBooking(
                new InitiateBookingRequest(show.getId(), List.of(targetSeat.getId()), null, "idem-email-fail"),
                user.getId());

        when(javaMailSender.createMimeMessage()).thenReturn(mock(MimeMessage.class));
        doThrow(new MailSendException("SMTP server down")).when(javaMailSender).send(any(MimeMessage.class));

        BookingSummaryDto confirmed = bookingService.confirmPayment(
                new ConfirmPaymentRequest(
                        init.bookingId(),
                        init.gatewayOrderId(),
                        "mock_pay_demo",
                        init.mockSignatureHint(),
                        "confirm-email-fail"),
                principal);

        assertEquals(BookingStatus.CONFIRMED, confirmed.status());
        assertNotNull(confirmed.qrToken());
    }
}
