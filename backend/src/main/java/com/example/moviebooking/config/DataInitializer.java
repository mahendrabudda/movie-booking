package com.example.moviebooking.config;

import com.example.moviebooking.model.AppUser;
import com.example.moviebooking.model.Role;
import com.example.moviebooking.repository.AppUserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final AppUserRepository appUserRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.seed.admin-email:admin@cinepulse.com}")
    private String adminEmail;

    @Value("${app.seed.admin-password:Admin@123}")
    private String adminPassword;

    @Value("${app.seed.admin-name:System Admin}")
    private String adminName;

    @Value("${app.seed.customer-email:customer@cinepulse.com}")
    private String customerEmail;

    @Value("${app.seed.customer-password:Customer@123}")
    private String customerPassword;

    @Value("${app.seed.customer-name:Demo Customer}")
    private String customerName;

    @Override
    public void run(String... args) {
        seedAccountIfMissing(adminEmail, adminName, adminPassword, Role.ADMIN);
        seedAccountIfMissing(customerEmail, customerName, customerPassword, Role.CUSTOMER);
    }

    private void seedAccountIfMissing(String email, String fullName, String rawPassword, Role role) {
        if (!appUserRepository.existsByEmailIgnoreCase(email)) {
            AppUser user = AppUser.builder()
                    .fullName(fullName)
                    .email(email.toLowerCase())
                    .passwordHash(passwordEncoder.encode(rawPassword))
                    .role(role)
                    .build();
            appUserRepository.save(user);
            log.info("Seeded development {} account: {}", role, email);
        }
    }
}
