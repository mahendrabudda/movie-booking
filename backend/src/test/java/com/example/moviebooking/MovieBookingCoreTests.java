package com.example.moviebooking;

import com.example.moviebooking.dto.AiPricingDtos.*;
import com.example.moviebooking.dto.AuthDtos.*;
import com.example.moviebooking.dto.BookingDtos.*;
import com.example.moviebooking.dto.MovieDtos.*;
import com.example.moviebooking.exception.BadRequestException;
import com.example.moviebooking.model.*;
import com.example.moviebooking.repository.*;
import com.example.moviebooking.security.CustomUserDetailsService;
import com.example.moviebooking.security.JwtAuthenticationFilter;
import com.example.moviebooking.security.JwtTokenProvider;
import com.example.moviebooking.security.SecurityConfig;
import com.example.moviebooking.service.*;
import com.example.moviebooking.util.PricingCalculator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MovieBookingCoreTests {

    @Mock
    private AppUserRepository appUserRepository;

    @Mock
    private MovieRepository movieRepository;

    @Mock
    private MovieShowRepository movieShowRepository;

    @Mock
    private ScreenRepository screenRepository;

    @Mock
    private TheatreRepository theatreRepository;

    @Mock
    private SeatRepository seatRepository;

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private BookingSeatRepository bookingSeatRepository;

    @Mock
    private MoviePredictionRepository moviePredictionRepository;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private RestTemplate restTemplate;

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final JwtTokenProvider jwtTokenProvider = new JwtTokenProvider(
            "dGhpcy1pcy1hLWRldi1zZWNyZXQta2V5LWZvci1tb3ZpZS1ib29raW5nLWhhY2thdGhvbi1tdnAtMjU2Yml0cw==",
            86400000L,
            "cinepulse_token"
    );

    @Test
    @DisplayName("1. Customer registration always assigns CUSTOMER role and hashes password with BCrypt")
    void testCustomerRegistrationAndBCryptVerification() {
        AuthService authService = new AuthService(
                appUserRepository, passwordEncoder, jwtTokenProvider, authenticationManager);

        RegisterRequest request = RegisterRequest.builder()
                .fullName("Mahendra Budda")
                .email("mahendra@example.com")
                .password("Secret@123")
                .build();

        when(appUserRepository.existsByEmailIgnoreCase("mahendra@example.com")).thenReturn(false);
        when(appUserRepository.save(any(AppUser.class))).thenAnswer(inv -> {
            AppUser u = inv.getArgument(0);
            u.setId(10L);
            return u;
        });

        AuthResponse response = authService.registerCustomer(request);

        assertNotNull(response.getAccessToken());
        assertEquals(Role.CUSTOMER, response.getUser().getRole());

        ArgumentCaptor<AppUser> captor = ArgumentCaptor.forClass(AppUser.class);
        verify(appUserRepository).save(captor.capture());
        AppUser saved = captor.getValue();
        assertNotEquals("Secret@123", saved.getPasswordHash());
        assertTrue(passwordEncoder.matches("Secret@123", saved.getPasswordHash()));
    }

    @Test
    @DisplayName("2. Login authenticates credentials and returns valid JWT token")
    void testLoginReturnsValidJwt() {
        AuthService authService = new AuthService(
                appUserRepository, passwordEncoder, jwtTokenProvider, authenticationManager);

        AppUser existingUser = AppUser.builder()
                .id(1L)
                .fullName("Demo Customer")
                .email("customer@cinepulse.com")
                .passwordHash(passwordEncoder.encode("Customer@123"))
                .role(Role.CUSTOMER)
                .build();

        when(appUserRepository.findByEmailIgnoreCase("customer@cinepulse.com"))
                .thenReturn(Optional.of(existingUser));

        LoginRequest loginRequest = LoginRequest.builder()
                .email("customer@cinepulse.com")
                .password("Customer@123")
                .build();

        AuthResponse response = authService.login(loginRequest);

        assertTrue(jwtTokenProvider.validateToken(response.getAccessToken()));
        assertEquals("customer@cinepulse.com", jwtTokenProvider.getEmailFromToken(response.getAccessToken()));
    }

    @Test
    @DisplayName("3. Movie creation persists valid movie details and computes effective price")
    void testMovieCreation() {
        MovieService movieService = new MovieService(movieRepository);

        MovieRequest request = MovieRequest.builder()
                .title("Kalki 2898 AD")
                .description("Sci-Fi epic set in future Kasi")
                .genre("SCI_FI")
                .language("TELUGU")
                .duration(181)
                .releaseDate(LocalDate.of(2026, 10, 25))
                .posterUrl("https://image.tmdb.org/t/p/w500/poster.jpg")
                .rating(new BigDecimal("8.7"))
                .basePrice(new BigDecimal("250.00"))
                .build();

        when(movieRepository.save(any(Movie.class))).thenAnswer(inv -> {
            Movie m = inv.getArgument(0);
            m.setId(1L);
            return m;
        });

        MovieResponse created = movieService.createMovie(request);

        assertEquals(1L, created.getId());
        assertEquals("Kalki 2898 AD", created.getTitle());
        assertEquals(new BigDecimal("250.00"), created.getEffectivePrice());
    }

    @Test
    @DisplayName("4. AI pricing multiplier calculation and Single-Screen (₹350) / Multiplex (₹450) caps")
    void testAiPricingMultiplierAndTheatreCaps() {
        BigDecimal basePrice = new BigDecimal("260.00");
        BigDecimal minPrice = new BigDecimal("120.00");

        // SUPERHIT (1.50x) on ₹260 = ₹390 -> capped at ₹350 for SINGLE_SCREEN, ₹390 for MULTIPLEX
        BigDecimal singleScreenRecommended = PricingCalculator.calculateRecommendedPrice(
                basePrice, PopularityCategory.SUPERHIT, minPrice, PricingCalculator.SINGLE_SCREEN_MAX_CAP);
        BigDecimal multiplexRecommended = PricingCalculator.calculateRecommendedPrice(
                basePrice, PopularityCategory.SUPERHIT, minPrice, PricingCalculator.MULTIPLEX_MAX_CAP);

        assertEquals(new BigDecimal("350.00"), singleScreenRecommended);
        assertEquals(new BigDecimal("390.00"), multiplexRecommended);

        // INDUSTRY_HIT (1.80x) on ₹280 = ₹504 -> capped at ₹450 for MULTIPLEX
        BigDecimal blockbusterCapped = PricingCalculator.calculateRecommendedPrice(
                new BigDecimal("280.00"), PopularityCategory.INDUSTRY_HIT, minPrice, PricingCalculator.MULTIPLEX_MAX_CAP);
        assertEquals(new BigDecimal("450.00"), blockbusterCapped);

        // FLOP (0.75x) on ₹140 = ₹105 -> raised to minPrice ₹120.00
        BigDecimal flopFloored = PricingCalculator.calculateRecommendedPrice(
                new BigDecimal("140.00"), PopularityCategory.FLOP, minPrice, PricingCalculator.SINGLE_SCREEN_MAX_CAP);
        assertEquals(new BigDecimal("120.00"), flopFloored);
    }

    @Test
    @DisplayName("5. Booking price calculation and duplicate seat booking prevention")
    void testBookingPriceCalculationAndDuplicateSeatPrevention() {
        TheatreShowService theatreShowService = new TheatreShowService(
                theatreRepository, screenRepository, seatRepository,
                movieShowRepository, movieRepository, bookingSeatRepository);
        ReflectionTestUtils.setField(theatreShowService, "minTicketPrice", new BigDecimal("120.00"));

        BookingService bookingService = new BookingService(
                bookingRepository, bookingSeatRepository, movieShowRepository,
                movieRepository, screenRepository, theatreRepository, seatRepository, theatreShowService);

        Movie movie = Movie.builder().id(1L).title("Dune: Part Two").basePrice(new BigDecimal("250.00")).build();
        Theatre theatre = Theatre.builder().id(1L).name("Sudarshan 35MM").type(TheatreType.SINGLE_SCREEN)
                .maxTicketPrice(new BigDecimal("350.00")).build();
        Screen screen = Screen.builder().id(1L).name("Screen 1").theatreId(1L).totalSeats(24).build();
        MovieShow show = MovieShow.builder().id(100L).movieId(1L).screenId(1L)
                .showDateTime(LocalDateTime.now().plusDays(1)).basePrice(new BigDecimal("250.00")).build();

        Seat seatA1 = Seat.builder().id(11L).screenId(1L).seatNumber("A1")
                .category(SeatCategory.REGULAR).status(SeatStatus.ACTIVE).build();
        Seat seatC1 = Seat.builder().id(12L).screenId(1L).seatNumber("C1")
                .category(SeatCategory.PREMIUM).status(SeatStatus.ACTIVE).build();

        when(movieShowRepository.findById(100L)).thenReturn(Optional.of(show));
        when(movieRepository.findById(1L)).thenReturn(Optional.of(movie));
        when(screenRepository.findById(1L)).thenReturn(Optional.of(screen));
        when(theatreRepository.findById(1L)).thenReturn(Optional.of(theatre));
        when(seatRepository.findAllById(List.of(11L, 12L))).thenReturn(List.of(seatA1, seatC1));
        when(bookingSeatRepository.existsByShowIdAndSeatId(100L, 11L)).thenReturn(false);
        when(bookingSeatRepository.existsByShowIdAndSeatId(100L, 12L)).thenReturn(false);
        when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> {
            Booking b = inv.getArgument(0);
            b.setId(500L);
            return b;
        });

        BookingRequest request = BookingRequest.builder()
                .showId(100L)
                .seatIds(List.of(11L, 12L))
                .mockPaymentMethod("UPI_MOCK")
                .build();

        BookingResponse bookingResponse = bookingService.createBooking(1L, request);

        // Regular (₹250) + Premium (₹250 + ₹50 = ₹300) = ₹550.00
        assertEquals(new BigDecimal("550.00"), bookingResponse.getTotalAmount());
        assertEquals(BookingStatus.CONFIRMED, bookingResponse.getBookingStatus());

        // Now simulate seat A1 already booked -> must throw BadRequestException
        when(bookingSeatRepository.existsByShowIdAndSeatId(100L, 11L)).thenReturn(true);
        assertThrows(BadRequestException.class, () -> bookingService.createBooking(2L, request));
    }

    @Test
    @DisplayName("6. AI Pricing Service integrates with FastAPI response and respects caps")
    void testAiPricingServiceIntegration() {
        AiPricingService aiPricingService = new AiPricingService(
                movieRepository, moviePredictionRepository, restTemplate);
        ReflectionTestUtils.setField(aiPricingService, "mlServiceUrl", "http://localhost:8000");
        ReflectionTestUtils.setField(aiPricingService, "minTicketPrice", new BigDecimal("120.00"));
        ReflectionTestUtils.setField(aiPricingService, "singleScreenMax", new BigDecimal("350.00"));
        ReflectionTestUtils.setField(aiPricingService, "multiplexMax", new BigDecimal("450.00"));

        Movie movie = Movie.builder()
                .id(1L)
                .title("Kalki 2898 AD")
                .basePrice(new BigDecimal("250.00"))
                .build();

        FastApiPredictionResponse mockFastApiResponse = FastApiPredictionResponse.builder()
                .predictedCategory("BLOCKBUSTER")
                .confidence(0.9125)
                .classProbabilities(Map.of("BLOCKBUSTER", 0.9125, "SUPERHIT", 0.0875))
                .build();

        when(movieRepository.findById(1L)).thenReturn(Optional.of(movie));
        when(restTemplate.postForEntity(anyString(), any(), eq(FastApiPredictionResponse.class)))
                .thenReturn(ResponseEntity.ok(mockFastApiResponse));
        when(moviePredictionRepository.save(any(MoviePrediction.class))).thenAnswer(inv -> {
            MoviePrediction p = inv.getArgument(0);
            p.setId(77L);
            return p;
        });

        PredictionTriggerRequest trigger = PredictionTriggerRequest.builder()
                .averageMovieRating(new BigDecimal("8.8"))
                .genre("SCI_FI")
                .language("TELUGU")
                .daysSinceRelease(5)
                .movieDuration(181)
                .expectedDemand(new BigDecimal("92.0"))
                .currentOccupancy(new BigDecimal("88.0"))
                .theatreTypeCap("MULTIPLEX")
                .build();

        PredictionResponse result = aiPricingService.predictTicketPrice(1L, trigger);

        // 250.00 * 1.65 (BLOCKBUSTER) = 412.50 (under 450 multiplex cap, capped at 350 for single screen)
        assertEquals(PopularityCategory.BLOCKBUSTER, result.getPredictedCategory());
        assertEquals(new BigDecimal("412.50"), result.getRecommendedPrice());
        assertEquals(new BigDecimal("350.00"), result.getSingleScreenCappedPrice());
        assertEquals(new BigDecimal("412.50"), result.getMultiplexCappedPrice());
    }
}
