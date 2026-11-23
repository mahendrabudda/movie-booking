package com.example.moviebooking;

import com.example.moviebooking.dto.AuthDtos.RegisterRequest;
import com.example.moviebooking.dto.PricingAndReviewerDtos.*;
import com.example.moviebooking.exception.BadRequestException;
import com.example.moviebooking.exception.ConflictException;
import com.example.moviebooking.exception.ForbiddenOperationException;
import com.example.moviebooking.model.*;
import com.example.moviebooking.repository.*;
import com.example.moviebooking.service.AuthService;
import com.example.moviebooking.service.PricingService;
import com.example.moviebooking.service.ReviewerService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RbacAndReviewerFlowTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private AuthService authService;
    @Autowired private ReviewerService reviewerService;
    @Autowired private PricingService pricingService;
    @Autowired private AppUserRepository userRepository;
    @Autowired private MovieRepository movieRepository;
    @Autowired private MovieReviewerAssignmentRepository assignmentRepository;
    @Autowired private ReviewerRatingRepository ratingRepository;
    @Autowired private AuditLogRepository auditLogRepository;
    @Autowired private GlobalPricingPolicyRepository policyRepository;

    @MockBean private RestTemplate restTemplate;

    private AppUser admin;
    private Movie movie;
    private List<AppUser> tenReviewers;
    private AppUser unassignedReviewer;

    @BeforeEach
    void setUp() {
        auditLogRepository.deleteAll();
        ratingRepository.deleteAll();
        assignmentRepository.deleteAll();
        movieRepository.deleteAll();
        userRepository.deleteAll();
        policyRepository.deleteAll();

        policyRepository.save(new GlobalPricingPolicy());

        admin = userRepository.save(new AppUser("admin@rbac.local", "hash", "Admin", Role.ADMIN, true, true));

        tenReviewers = new ArrayList<>();
        for (int i = 1; i <= 10; i++) {
            tenReviewers.add(userRepository.save(
                    new AppUser("rev" + i + "@rbac.local", "hash", "Reviewer " + i, Role.MOVIE_REVIEWER, true, true)));
        }
        unassignedReviewer = userRepository.save(
                new AppUser("unassigned@rbac.local", "hash", "Unassigned Reviewer", Role.MOVIE_REVIEWER, true, true));

        movie = new Movie();
        movie.setTitle("Test Evaluation Movie");
        movie.setGenre("DRAMA");
        movie.setLanguage("English");
        movie.setDurationMinutes(130);
        movie.setReleaseDate(LocalDate.now());
        movie = movieRepository.save(movie);
    }

    @Test
    void publicRegistrationAlwaysCreatesCustomerEvenIfAdminRoleSent() {
        var response = authService.registerCustomer(
                new RegisterRequest("hacker@test.local", "Password@123", "Attacker", "ADMIN"));
        assertEquals(Role.CUSTOMER, response.role());
    }

    @Test
    void customerAndReviewerCannotAccessForbiddenEndpointsViaMockMvc() throws Exception {
        var customerAuth = authService.registerCustomer(
                new RegisterRequest("cust_mvc@test.local", "Password@123", "Customer MVC", null));

        // Customer cannot access /api/admin/users or /api/reviewer/movies
        mockMvc.perform(get("/api/admin/users")
                .header("Authorization", "Bearer " + customerAuth.accessToken()))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/reviewer/movies")
                .header("Authorization", "Bearer " + customerAuth.accessToken()))
                .andExpect(status().isForbidden());

        // Reviewer cannot access customer booking endpoints
        var reviewerDto = authService.createPrivilegedUser(
                new com.example.moviebooking.dto.AuthDtos.CreatePrivilegedUserRequest(
                        "rev_mvc@test.local", "Password@123", "Reviewer MVC", Role.MOVIE_REVIEWER),
                admin.getId());
        var reviewerLogin = authService.login(
                new com.example.moviebooking.dto.AuthDtos.LoginRequest(reviewerDto.email(), "Password@123"));

        mockMvc.perform(post("/api/bookings/hold")
                .header("Authorization", "Bearer " + reviewerLogin.accessToken())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{"showId":1,"seatIds":[1]}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void reviewerAssignmentSubmissionPredictionGateAndAuditCorrectionFlow() {
        List<Long> reviewerIds = tenReviewers.stream().map(AppUser::getId).toList();
        reviewerService.assignTenReviewersToMovie(
                movie.getId(), new AssignReviewersRequest(reviewerIds), admin.getId());

        // 1. Unassigned reviewer cannot submit
        assertThrows(ForbiddenOperationException.class, () ->
                reviewerService.submitRating(
                        movie.getId(), unassignedReviewer.getId(), new SubmitReviewerRatingRequest(8, "Blocked")));

        // 2. Rating outside 1-10 rejected
        assertThrows(BadRequestException.class, () ->
                reviewerService.submitRating(
                        movie.getId(), tenReviewers.get(0).getId(), new SubmitReviewerRatingRequest(11, "Invalid")));

        // 3. Submit 9 ratings -> prediction must be refused by the 10-reviewer gate
        for (int i = 0; i < 9; i++) {
            reviewerService.submitRating(
                    movie.getId(), tenReviewers.get(i).getId(), new SubmitReviewerRatingRequest(8, "Good"));
        }

        // Duplicate submission by Reviewer 1 must be rejected (read-only after submit)
        assertThrows(ConflictException.class, () ->
                reviewerService.submitRating(
                        movie.getId(), tenReviewers.get(0).getId(), new SubmitReviewerRatingRequest(9, "Duplicate")));

        // Prediction refused at 9/10
        assertThrows(BadRequestException.class, () ->
                pricingService.triggerMoviePrediction(movie.getId(), admin.getId()));

        // 4. Submit 10th rating -> prediction succeeds
        ReviewerRatingItemDto tenthRating = reviewerService.submitRating(
                movie.getId(), tenReviewers.get(9).getId(), new SubmitReviewerRatingRequest(9, "Tenth rating"));

        when(restTemplate.postForObject(anyString(), any(), eq(MlPredictResponsePayload.class)))
                .thenReturn(new MlPredictResponsePayload(
                        "SUPERHIT", 0.9125, Map.of("SUPERHIT", 0.9125), "v1.0.0-rf-test"));

        PredictionResultDto prediction = pricingService.triggerMoviePrediction(movie.getId(), admin.getId());
        assertEquals(PredictionCategory.SUPERHIT, prediction.predictedClass());

        // 5. Admin rating correction writes an audit log
        long auditCountBefore = auditLogRepository.count();
        ReviewerRatingItemDto corrected = reviewerService.adminCorrectRating(
                tenthRating.ratingId(),
                new AdminCorrectRatingRequest(10, "Verified reviewer typo correction"),
                admin.getId());
        assertEquals(10, corrected.rating());
        assertEquals(auditCountBefore + 1, auditLogRepository.count());
    }
}
