package com.example.moviebooking;

import com.example.moviebooking.config.AppProperties;
import com.example.moviebooking.model.*;
import com.example.moviebooking.repository.*;
import com.example.moviebooking.service.PricingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PricingAndCapTest {

    @Mock private GlobalPricingPolicyRepository policyRepository;
    @Mock private MovieRepository movieRepository;
    @Mock private MovieReviewerAssignmentRepository assignmentRepository;
    @Mock private ReviewerRatingRepository ratingRepository;
    @Mock private MoviePredictionRepository predictionRepository;
    @Mock private AuditLogRepository auditLogRepository;
    @Mock private AppUserRepository userRepository;
    @Mock private RestTemplate restTemplate;

    private PricingService pricingService;
    private GlobalPricingPolicy defaultPolicy;

    @BeforeEach
    void setUp() {
        AppProperties props = new AppProperties();
        pricingService = new PricingService(
                policyRepository, movieRepository, assignmentRepository,
                ratingRepository, predictionRepository, auditLogRepository,
                userRepository, restTemplate, props
        );

        defaultPolicy = new GlobalPricingPolicy();
        defaultPolicy.setMinTicketPrice(new BigDecimal("100.00"));
        defaultPolicy.setSingleScreenMaxPrice(new BigDecimal("350.00"));
        defaultPolicy.setMultiplexMaxPrice(new BigDecimal("450.00"));
        when(policyRepository.findAll()).thenReturn(List.of(defaultPolicy));
    }

    @Test
    void singleScreenPriceNeverExceeds350CapEvenOnBlockbusterRecliner() {
        Theatre singleScreen = new Theatre();
        singleScreen.setType(TheatreType.SINGLE_SCREEN);
        singleScreen.setMaxTicketPrice(new BigDecimal("350.00"));

        Screen screen = new Screen();
        screen.setTheatre(singleScreen);

        Movie movie = new Movie();
        movie.setPredictedCategory(PredictionCategory.BLOCKBUSTER);
        movie.setPredictedMultiplier(new BigDecimal("1.650"));

        Show show = new Show();
        show.setMovie(movie);
        show.setScreen(screen);
        show.setBasePrice(new BigDecimal("250.00"));

        // 250 * 1.65 * 1.30 (Recliner) = 536.25 -> must clamp to 350.00
        BigDecimal price = pricingService.calculateSeatDynamicPrice(show, new BigDecimal("1.30"));
        assertEquals(new BigDecimal("350.00"), price);
    }

    @Test
    void multiplexIndustryHitUsesMultiplexMax450() {
        Theatre multiplex = new Theatre();
        multiplex.setType(TheatreType.MULTIPLEX);
        multiplex.setMaxTicketPrice(new BigDecimal("450.00"));

        Screen screen = new Screen();
        screen.setTheatre(multiplex);

        Movie movie = new Movie();
        movie.setPredictedCategory(PredictionCategory.INDUSTRY_HIT);

        Show show = new Show();
        show.setMovie(movie);
        show.setScreen(screen);
        show.setBasePrice(new BigDecimal("200.00"));

        BigDecimal price = pricingService.calculateSeatDynamicPrice(show, BigDecimal.ONE);
        assertEquals(new BigDecimal("450.00"), price);
    }

    @Test
    void flopCategoryClampsToGlobalMinimumPriceWhenBelowFloor() {
        Theatre singleScreen = new Theatre();
        singleScreen.setType(TheatreType.SINGLE_SCREEN);
        singleScreen.setMaxTicketPrice(new BigDecimal("350.00"));

        Screen screen = new Screen();
        screen.setTheatre(singleScreen);

        Movie movie = new Movie();
        movie.setPredictedCategory(PredictionCategory.FLOP);
        movie.setPredictedMultiplier(new BigDecimal("0.750"));

        Show show = new Show();
        show.setMovie(movie);
        show.setScreen(screen);
        show.setBasePrice(new BigDecimal("110.00"));

        // 110 * 0.75 = 82.50 -> must clamp up to minTicketPrice 100.00
        BigDecimal price = pricingService.calculateSeatDynamicPrice(show, BigDecimal.ONE);
        assertEquals(new BigDecimal("100.00"), price);
    }
}
