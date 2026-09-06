package com.dealflow360.auth;

import com.dealflow360.auth.dto.LoginRequest;
import com.dealflow360.auth.dto.LoginResponse;
import com.dealflow360.auth.dto.SignupRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentication", description = "Endpoints for JWT authentication, signup, and session retrieval")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final com.dealflow360.catalog.CustomerRepository customerRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final com.dealflow360.mail.EmailService emailService;

    public AuthController(AuthenticationManager authenticationManager,
                          UserRepository userRepository,
                          com.dealflow360.catalog.CustomerRepository customerRepository,
                          PasswordEncoder passwordEncoder,
                          JwtTokenProvider tokenProvider,
                          com.dealflow360.mail.EmailService emailService) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.customerRepository = customerRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
        this.emailService = emailService;
    }

    @PostMapping("/login")
    @Operation(summary = "Authenticate user and issue JWT token")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );
            AuthUser authUser = (AuthUser) authentication.getPrincipal();
            User user = authUser.getUser();
            if (user.getActive() != null && !user.getActive()) {
                return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Account is deactivated. Please contact your administrator."));
            }
            String token = tokenProvider.generateToken(user);
            return ResponseEntity.ok(LoginResponse.builder()
                    .token(token).type("Bearer")
                    .id(user.getId()).name(user.getName())
                    .email(user.getEmail()).role(user.getRole()).team(user.getTeam())
                    .tier(user.getTier() != null ? user.getTier() : "BRONZE")
                    .phone(user.getPhone())
                    .address(user.getAddress())
                    .contactPerson(user.getContactPerson() != null ? user.getContactPerson() : user.getName())
                    .build());
        } catch (org.springframework.security.authentication.BadCredentialsException ex) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid email or password."));
        } catch (org.springframework.security.authentication.DisabledException | org.springframework.security.authentication.LockedException ex) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Account is deactivated or disabled. Please contact administrator."));
        } catch (org.springframework.security.core.AuthenticationException ex) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication failed. Please verify credentials."));
        }
    }

    @PostMapping("/signup")
    @Operation(summary = "Customer self-registration — creates a CUSTOMER role account, sets commercial fields directly on User, and dispatches welcome email")
    public ResponseEntity<?> signup(@Valid @RequestBody SignupRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email is already in use"));
        }
        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role("CUSTOMER")
                .team(request.getTeam() != null ? request.getTeam() : "External")
                .tier(request.getTier() != null ? request.getTier() : "BRONZE")
                .phone(request.getPhone())
                .address(request.getAddress() != null ? request.getAddress() : request.getTeam())
                .contactPerson(request.getContactPerson() != null ? request.getContactPerson() : request.getName())
                .active(true)
                .build();
        User savedUser = userRepository.save(user);

        // Auto-provision corresponding Customer record in customers table if not exists
        if (customerRepository.findByEmail(request.getEmail()).isEmpty()) {
            String custName = request.getName();
            if (request.getTeam() != null && !request.getTeam().isBlank() && !request.getTeam().equalsIgnoreCase("External")) {
                custName = request.getName() + " (" + request.getTeam() + ")";
            }
            com.dealflow360.catalog.Customer customer = com.dealflow360.catalog.Customer.builder()
                    .name(custName)
                    .email(request.getEmail())
                    .contactPerson(savedUser.getContactPerson())
                    .phone(savedUser.getPhone())
                    .address(savedUser.getAddress())
                    .tier(savedUser.getTier())
                    .portalUserId(savedUser.getId())
                    .createdAt(java.time.LocalDateTime.now())
                    .build();
            customerRepository.save(customer);
        }

        // Send Welcome Email with credentials safely without blocking signup on SMTP failures
        try {
            emailService.sendWelcomeEmail(savedUser.getEmail(), savedUser.getName(), request.getPassword(), savedUser.getRole(), savedUser.getTeam());
        } catch (Exception ex) {
            org.slf4j.LoggerFactory.getLogger(AuthController.class)
                    .error("Failed to dispatch welcome email during signup for {}: {}", savedUser.getEmail(), ex.getMessage());
        }

        String token = tokenProvider.generateToken(savedUser);
        return ResponseEntity.ok(LoginResponse.builder()
                .token(token).type("Bearer")
                .id(savedUser.getId()).name(savedUser.getName())
                .email(savedUser.getEmail()).role(savedUser.getRole()).team(savedUser.getTeam())
                .tier(savedUser.getTier()).phone(savedUser.getPhone()).address(savedUser.getAddress()).contactPerson(savedUser.getContactPerson())
                .build());
    }

    @GetMapping("/me")
    @Operation(summary = "Get current authenticated user profile")
    public ResponseEntity<?> getCurrentUser(@AuthenticationPrincipal AuthUser authUser) {
        if (authUser == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
        User user = authUser.getUser();
        return ResponseEntity.ok(Map.of(
                "id", user.getId(), "name", user.getName(),
                "email", user.getEmail(), "role", user.getRole(), "team", user.getTeam()
        ));
    }

    @GetMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "List users by role — ADMIN only (full CRUD: /api/admin/users)")
    public ResponseEntity<List<User>> listUsers(@RequestParam(required = false) String role) {
        if (role != null && !role.isBlank()) {
            return ResponseEntity.ok(userRepository.findByRole(role));
        }
        return ResponseEntity.ok(userRepository.findAll());
    }
}
