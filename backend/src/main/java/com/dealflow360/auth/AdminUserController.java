package com.dealflow360.auth;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import com.dealflow360.mail.EmailService;

import java.security.SecureRandom;
import java.util.List;
import java.util.Map;

/**
 * AdminUserController — ADMIN-only endpoints for creating and managing staff accounts.
 *
 * Flow:
 *  1. Admin POSTs to /api/admin/users with name/email/role/team
 *  2. Backend generates a secure temp password (or uses provided one)
 *  3. User is saved to DB with BCrypt hash
 *  4. Response includes the plain-text temp password (shown ONCE in the UI)
 *  5. In production, this would trigger an email; here we log it and return it
 *
 * All endpoints require ADMIN role.
 */
@RestController
@RequestMapping("/api/admin/users")
@Tag(name = "Admin — User Management", description = "ADMIN-only: create, list, update and deactivate staff user accounts")
public class AdminUserController {

    private static final Logger log = LoggerFactory.getLogger(AdminUserController.class);

    private static final String CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#";
    private static final SecureRandom RNG = new SecureRandom();

    private final UserRepository userRepository;
    private final com.dealflow360.catalog.CustomerRepository customerRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    public AdminUserController(UserRepository userRepository,
                               com.dealflow360.catalog.CustomerRepository customerRepository,
                               PasswordEncoder passwordEncoder,
                               EmailService emailService) {
        this.userRepository = userRepository;
        this.customerRepository = customerRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
    }

    // ─── DTOs ──────────────────────────────────────────────────────────────────

    public record CreateUserRequest(
        @NotBlank String name,
        @NotBlank @Email String email,
        @NotBlank String role,   // SALES_REP | SALES_MANAGER | FINANCE | CUSTOMER
        String team,
        @Size(min = 6) String password  // optional; auto-generated if null
    ) {}

    public record UpdateUserRequest(
        String name,
        String team,
        String role,
        Boolean active
    ) {}

    public record CreateUserResponse(
        Long id,
        String name,
        String email,
        String role,
        String team,
        String tempPassword,   // plain text — shown once
        String message
    ) {}

    // ─── Endpoints ─────────────────────────────────────────────────────────────

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "List all users (ADMIN only)")
    public ResponseEntity<List<User>> listUsers(
            @RequestParam(required = false) String role) {
        if (role != null && !role.isBlank()) {
            return ResponseEntity.ok(userRepository.findByRole(role));
        }
        return ResponseEntity.ok(userRepository.findAll());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create a staff user (ADMIN only) — returns temp password")
    public ResponseEntity<?> createUser(
            @Valid @RequestBody CreateUserRequest req,
            @AuthenticationPrincipal AuthUser authUser) {

        // Validate role
        if (!List.of("SALES_REP", "SALES_MANAGER", "FINANCE", "CUSTOMER").contains(req.role())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Invalid role. Allowed: SALES_REP, SALES_MANAGER, FINANCE, CUSTOMER"));
        }

        // Check email uniqueness
        if (userRepository.existsByEmail(req.email())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "A user with email '" + req.email() + "' already exists."));
        }

        // Generate or use provided password
        String plainPassword = (req.password() != null && req.password().length() >= 6)
                ? req.password()
                : generateTempPassword(10);

        User user = User.builder()
                .name(req.name())
                .email(req.email())
                .passwordHash(passwordEncoder.encode(plainPassword))
                .role(req.role())
                .team(req.team() != null ? req.team() : "Global Sales")
                .active(true)
                .build();

        User saved = userRepository.save(user);

        // If role is CUSTOMER, auto-provision Customer record in catalog
        if ("CUSTOMER".equals(saved.getRole()) && customerRepository.findByEmail(saved.getEmail()).isEmpty()) {
            com.dealflow360.catalog.Customer customer = com.dealflow360.catalog.Customer.builder()
                    .name(saved.getName())
                    .email(saved.getEmail())
                    .contactPerson(saved.getName())
                    .tier("BRONZE")
                    .portalUserId(saved.getId())
                    .createdAt(java.time.LocalDateTime.now())
                    .build();
            customerRepository.save(customer);
        }

        String creator = authUser != null ? authUser.getUser().getName() : "Admin";
        log.info("[AdminUserController] New {} user created by {}: {} <{}>  TempPw: {}",
                req.role(), creator, req.name(), req.email(), plainPassword);

        // Trigger async welcome email with temporary credentials
        emailService.sendWelcomeEmail(saved.getEmail(), saved.getName(), plainPassword, saved.getRole(), saved.getTeam());

        return ResponseEntity.ok(new CreateUserResponse(
                saved.getId(),
                saved.getName(),
                saved.getEmail(),
                saved.getRole(),
                saved.getTeam(),
                plainPassword,
                "User created successfully. Share the temporary password with the user — they can change it after first login."
        ));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update user name/team/role/active status (ADMIN only)")
    public ResponseEntity<?> updateUser(
            @PathVariable Long id,
            @RequestBody UpdateUserRequest req) {

        return userRepository.findById(id)
                .map(user -> {
                    if (req.name() != null && !req.name().isBlank())   user.setName(req.name());
                    if (req.team() != null && !req.team().isBlank())   user.setTeam(req.team());
                    if (req.role() != null && !req.role().isBlank())   user.setRole(req.role());
                    if (req.active() != null)                          user.setActive(req.active());
                    return ResponseEntity.ok(userRepository.save(user));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Deactivate user account (ADMIN only) — soft delete")
    public ResponseEntity<?> deactivateUser(@PathVariable Long id) {
        return userRepository.findById(id)
                .map(user -> {
                    if ("ADMIN".equals(user.getRole())) {
                        return ResponseEntity.badRequest()
                                .body(Map.of("error", "Cannot deactivate an ADMIN account."));
                    }
                    user.setActive(false);
                    userRepository.save(user);
                    return ResponseEntity.ok(Map.of("message", "User deactivated.", "id", id));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/reset-password")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Reset user password and return new temp password (ADMIN only)")
    public ResponseEntity<?> resetPassword(@PathVariable Long id) {
        return userRepository.findById(id)
                .map(user -> {
                    String newPw = generateTempPassword(10);
                    user.setPasswordHash(passwordEncoder.encode(newPw));
                    userRepository.save(user);
                    log.info("[AdminUserController] Password reset for user {} <{}>  NewPw: {}",
                            user.getName(), user.getEmail(), newPw);
                    emailService.sendPasswordResetEmail(user.getEmail(), user.getName(), newPw);
                    return ResponseEntity.ok(Map.of(
                            "message", "Password reset successfully.",
                            "tempPassword", newPw,
                            "email", user.getEmail()
                    ));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // ─── Helpers ───────────────────────────────────────────────────────────────

    private String generateTempPassword(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(CHARS.charAt(RNG.nextInt(CHARS.length())));
        }
        return sb.toString();
    }
}
