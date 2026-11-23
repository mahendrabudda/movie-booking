package com.example.moviebooking.service;

import com.example.moviebooking.dto.AuthDtos.*;
import com.example.moviebooking.dto.PricingAndReviewerDtos.AssignManagerRequest;
import com.example.moviebooking.exception.BadRequestException;
import com.example.moviebooking.exception.ConflictException;
import com.example.moviebooking.exception.ResourceNotFoundException;
import com.example.moviebooking.model.*;
import com.example.moviebooking.repository.AppUserRepository;
import com.example.moviebooking.repository.AuditLogRepository;
import com.example.moviebooking.repository.ManagerTheatreRepository;
import com.example.moviebooking.repository.TheatreRepository;
import com.example.moviebooking.security.JwtUtil;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AuthService {

    private final AppUserRepository userRepository;
    private final TheatreRepository theatreRepository;
    private final ManagerTheatreRepository managerTheatreRepository;
    private final AuditLogRepository auditLogRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthService(AppUserRepository userRepository,
                       TheatreRepository theatreRepository,
                       ManagerTheatreRepository managerTheatreRepository,
                       AuditLogRepository auditLogRepository,
                       PasswordEncoder passwordEncoder,
                       JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.theatreRepository = theatreRepository;
        this.managerTheatreRepository = managerTheatreRepository;
        this.auditLogRepository = auditLogRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    /**
     * Public registration ALWAYS creates a CUSTOMER account.
     * Any role field supplied by the frontend is strictly ignored to prevent privilege escalation.
     */
    @Transactional
    public AuthResponse registerCustomer(RegisterRequest request) {
        if (userRepository.existsByEmailIgnoreCase(request.email())) {
            throw new ConflictException("Email is already registered: " + request.email());
        }
        AppUser user = new AppUser(
                request.email().trim().toLowerCase(),
                passwordEncoder.encode(request.password()),
                request.fullName().trim(),
                Role.CUSTOMER,
                true,
                true
        );
        user = userRepository.save(user);
        String token = jwtUtil.generateToken(user.getId(), user.getEmail(), user.getRole());
        return new AuthResponse(token, user.getId(), user.getEmail(), user.getFullName(), user.getRole());
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        AppUser user = userRepository.findByEmailIgnoreCase(request.email())
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));
        if (!user.isActive() || !user.isApproved()) {
            throw new BadCredentialsException("Account is deactivated or pending admin approval");
        }
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid email or password");
        }
        String token = jwtUtil.generateToken(user.getId(), user.getEmail(), user.getRole());
        return new AuthResponse(token, user.getId(), user.getEmail(), user.getFullName(), user.getRole());
    }

    @Transactional
    public UserSummaryDto createPrivilegedUser(CreatePrivilegedUserRequest request, Long adminUserId) {
        if (userRepository.existsByEmailIgnoreCase(request.email())) {
            throw new ConflictException("Email is already registered: " + request.email());
        }
        AppUser admin = getUserById(adminUserId);
        AppUser created = new AppUser(
                request.email().trim().toLowerCase(),
                passwordEncoder.encode(request.password()),
                request.fullName().trim(),
                request.role(),
                true,
                true
        );
        created = userRepository.save(created);

        auditLogRepository.save(new AuditLog(
                "CREATE_USER",
                "APP_USER",
                created.getId(),
                admin,
                null,
                "role=" + created.getRole() + ", email=" + created.getEmail(),
                "Admin created privileged account"
        ));

        return toSummary(created);
    }

    @Transactional
    public UserSummaryDto updateUserStatus(Long targetUserId, boolean active, boolean approved, Long adminUserId) {
        AppUser admin = getUserById(adminUserId);
        AppUser target = getUserById(targetUserId);
        String oldState = "active=" + target.isActive() + ", approved=" + target.isApproved();
        target.setActive(active);
        target.setApproved(approved);
        target = userRepository.save(target);

        auditLogRepository.save(new AuditLog(
                "UPDATE_USER_STATUS",
                "APP_USER",
                target.getId(),
                admin,
                oldState,
                "active=" + active + ", approved=" + approved,
                "Admin updated user status"
        ));
        return toSummary(target);
    }

    @Transactional
    public void assignManagerToTheatre(AssignManagerRequest request, Long adminUserId) {
        AppUser admin = getUserById(adminUserId);
        AppUser manager = getUserById(request.managerId());
        if (manager.getRole() != Role.THEATRE_MANAGER) {
            throw new BadRequestException("User ID " + request.managerId() + " does not have THEATRE_MANAGER role");
        }
        Theatre theatre = theatreRepository.findById(request.theatreId())
                .orElseThrow(() -> new ResourceNotFoundException("Theatre not found: " + request.theatreId()));

        if (managerTheatreRepository.existsByManagerIdAndTheatreId(manager.getId(), theatre.getId())) {
            throw new ConflictException("Manager is already assigned to this theatre");
        }

        ManagerTheatre assignment = new ManagerTheatre();
        assignment.setManager(manager);
        assignment.setTheatre(theatre);
        assignment.setAssignedBy(admin);
        managerTheatreRepository.save(assignment);

        auditLogRepository.save(new AuditLog(
                "ASSIGN_MANAGER_THEATRE",
                "THEATRE",
                theatre.getId(),
                admin,
                null,
                "managerId=" + manager.getId() + " (" + manager.getEmail() + ")",
                "Admin assigned theatre manager"
        ));
    }

    @Transactional(readOnly = true)
    public List<UserSummaryDto> listAllUsers() {
        return userRepository.findAll().stream().map(this::toSummary).toList();
    }

    @Transactional(readOnly = true)
    public AppUser getUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + id));
    }

    private UserSummaryDto toSummary(AppUser u) {
        return new UserSummaryDto(u.getId(), u.getEmail(), u.getFullName(), u.getRole(), u.isActive(), u.isApproved());
    }
}
