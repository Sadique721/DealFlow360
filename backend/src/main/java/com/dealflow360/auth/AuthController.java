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
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    public AuthController(AuthenticationManager authenticationManager,
                          UserRepository userRepository,
                          PasswordEncoder passwordEncoder,
                          JwtTokenProvider tokenProvider) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
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
    @Operation(summary = "Customer self-registration — always creates a CUSTOMER role account")
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
                .active(true)
                .build();
        userRepository.save(user);
        String token = tokenProvider.generateToken(user);
        return ResponseEntity.ok(LoginResponse.builder()
                .token(token).type("Bearer")
                .id(user.getId()).name(user.getName())
                .email(user.getEmail()).role(user.getRole()).team(user.getTeam())
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
