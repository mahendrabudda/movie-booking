package com.example.moviebooking.dto;

import com.example.moviebooking.model.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class AuthDtos {

    public record RegisterRequest(
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8, max = 64) String password,
        @NotBlank @Size(min = 2, max = 120) String fullName,
        // Even if a client sends a role field in JSON, AuthService ignores it and forces Role.CUSTOMER
        String role
    ) {}

    public record LoginRequest(
        @NotBlank @Email String email,
        @NotBlank String password
    ) {}

    public record AuthResponse(
        String accessToken,
        Long userId,
        String email,
        String fullName,
        Role role
    ) {}

    public record CreatePrivilegedUserRequest(
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8, max = 64) String password,
        @NotBlank @Size(min = 2, max = 120) String fullName,
        @NotNull Role role
    ) {}

    public record UserSummaryDto(
        Long id,
        String email,
        String fullName,
        Role role,
        boolean active,
        boolean approved
    ) {}
}
