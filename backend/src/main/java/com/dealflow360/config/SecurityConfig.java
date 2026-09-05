package com.dealflow360.config;

import com.dealflow360.auth.AuthUserService;
import com.dealflow360.auth.JwtAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity   // enables @PreAuthorize on controllers
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final AuthUserService authUserService;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter, AuthUserService authUserService) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.authUserService = authUserService;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(authUserService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth

                // ── PUBLIC ENDPOINTS ─────────────────────────────────────────
                .requestMatchers(
                    "/api/auth/login",
                    "/api/auth/signup",
                    "/api/portal/**",
                    "/ws/**",
                    "/v3/api-docs/**",
                    "/swagger-ui/**",
                    "/swagger-ui.html"
                ).permitAll()

                // ── ADMIN-ONLY ENDPOINTS ─────────────────────────────────────
                .requestMatchers("/api/admin/**").hasRole("ADMIN")

                // ── APPROVAL ACTIONS: MANAGER + FINANCE + ADMIN ──────────────
                // Fine-grained control handled by @PreAuthorize in the controller
                // This is a secondary defense layer
                // ── APPROVAL ACTIONS: MANAGER + FINANCE + ADMIN ──────────────
                // Fine-grained control handled by @PreAuthorize in the controller
                // This is a secondary defense layer
                .requestMatchers(HttpMethod.POST, "/api/approvals/act", "/api/approvals/*/action").hasAnyRole("ADMIN", "SALES_MANAGER", "FINANCE")

                // ── INVOICE ENDPOINTS: READ by REPS/MANAGERS/FINANCE/ADMIN, MUTATIONS by FINANCE + ADMIN ───
                .requestMatchers(HttpMethod.GET, "/api/invoices/**").hasAnyRole("ADMIN", "FINANCE", "SALES_MANAGER", "SALES_REP")
                .requestMatchers("/api/invoices/**").hasAnyRole("ADMIN", "FINANCE")

                // ── WAREHOUSE & FULFILLMENT ENDPOINTS ─────────────────────────
                .requestMatchers("/api/warehouses/**").hasAnyRole("ADMIN", "SALES_MANAGER", "FINANCE")
                .requestMatchers("/api/fulfillment/**", "/api/fulfillments/**").hasAnyRole("ADMIN", "SALES_MANAGER", "FINANCE", "SALES_REP")

                // ── CURRENT USER PROFILE ─────────────────────────────────────
                .requestMatchers("/api/auth/me").authenticated()

                // ── LIST USERS: ADMIN ONLY (fine-grained in controller too) ──
                .requestMatchers("/api/auth/users").hasRole("ADMIN")

                // ── ALL OTHER /api/** REQUIRE AUTHENTICATION ─────────────────
                .requestMatchers("/api/**").authenticated()

                .anyRequest().permitAll()
            )
            .authenticationProvider(authenticationProvider())
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(List.of("*"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "X-Requested-With", "Accept", "Origin"));
        configuration.setExposedHeaders(List.of("Authorization"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
