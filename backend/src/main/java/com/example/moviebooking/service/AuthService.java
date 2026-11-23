package com.example.moviebooking.service;

import com.example.moviebooking.dto.AuthDtos.*;
import com.example.moviebooking.exception.BadRequestException;
import com.example.moviebooking.exception.ResourceNotFoundException;
import com.example.moviebooking.model.AppUser;
import com.example.moviebooking.model.Role;
import com.example.moviebooking.repository.AppUserRepository;
import com.example.moviebooking.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AppUserRepository appUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthenticationManager authenticationManager;

    @Transactional
    public AuthResponse registerCustomer(RegisterRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();
        if (appUserRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new BadRequestException("An account with this email already exists");
        }

        // Public registration ALWAYS assigns Role.CUSTOMER
        AppUser newUser = AppUser.builder()
                .fullName(request.getFullName().trim())
                .email(normalizedEmail)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(Role.CUSTOMER)
                .build();

        AppUser savedUser = appUserRepository.save(newUser);
        String token = jwtTokenProvider.generateToken(
                savedUser.getEmail(), savedUser.getRole().name(), savedUser.getId());

        return AuthResponse.builder()
                .accessToken(token)
                .tokenType("Bearer")
                .user(toUserResponse(savedUser))
                .build();
    }

    public AuthResponse login(LoginRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(normalizedEmail, request.getPassword())
        );

        AppUser user = appUserRepository.findByEmailIgnoreCase(normalizedEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        String token = jwtTokenProvider.generateToken(
                user.getEmail(), user.getRole().name(), user.getId());

        return AuthResponse.builder()
                .accessToken(token)
                .tokenType("Bearer")
                .user(toUserResponse(user))
                .build();
    }

    public UserResponse getCurrentUser(String email) {
        AppUser user = appUserRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return toUserResponse(user);
    }

    public AppUser getAuthenticatedEntity(String email) {
        return appUserRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found"));
    }

    private UserResponse toUserResponse(AppUser user) {
        return UserResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .role(user.getRole())
                .build();
    }
}
