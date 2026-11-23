package com.example.moviebooking;

import com.example.moviebooking.controller.AdminPricingController;
import com.example.moviebooking.security.CustomUserDetailsService;
import com.example.moviebooking.security.JwtAuthenticationFilter;
import com.example.moviebooking.security.JwtTokenProvider;
import com.example.moviebooking.security.SecurityConfig;
import com.example.moviebooking.service.AdminDashboardService;
import com.example.moviebooking.service.AiPricingService;
import com.example.moviebooking.dto.AiPricingDtos.AdminDashboardSummary;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AdminPricingController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
class SecurityRoleAuthorizationTests {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AiPricingService aiPricingService;

    @MockBean
    private AdminDashboardService adminDashboardService;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private CustomUserDetailsService customUserDetailsService;

    @Test
    @DisplayName("Customer cannot access /api/admin/** endpoints (403 Forbidden)")
    @WithMockUser(username = "customer@cinepulse.com", roles = {"CUSTOMER"})
    void customerCannotAccessAdminEndpoints() throws Exception {
        mockMvc.perform(get("/api/admin/dashboard/summary"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Admin can access /api/admin/** endpoints (200 OK)")
    @WithMockUser(username = "admin@cinepulse.com", roles = {"ADMIN"})
    void adminCanAccessAdminEndpoints() throws Exception {
        when(adminDashboardService.getSummary()).thenReturn(
                AdminDashboardSummary.builder()
                        .totalMovies(5)
                        .totalTheatres(2)
                        .totalShows(6)
                        .totalBookings(1)
                        .totalCustomers(1)
                        .build()
        );

        mockMvc.perform(get("/api/admin/dashboard/summary"))
                .andExpect(status().isOk());
    }
}
