package com.dealflow360.config;

import com.dealflow360.auth.User;
import com.dealflow360.auth.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * DataInitializer — runs on application startup.
 *
 * Ensures the system ADMIN user is provisioned according to credentials configured
 * in application.yml under dealflow.admin.* (name, email, password).
 *
 * All staff members (Sales Rep, Sales Manager, Finance) are created dynamically
 * by the Administrator through the Admin console (/dashboard/users).
 * Customers self-register via the signup endpoint.
 */
@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${dealflow.admin.email:admin@dealflow360.com}")
    private String adminEmail;

    @Value("${dealflow.admin.password:Admin@123}")
    private String adminPassword;

    @Value("${dealflow.admin.name:Administrator}")
    private String adminName;

    public DataInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        // 1. Provision / verify configured admin account
        userRepository.findByEmail(adminEmail).ifPresentOrElse(
            existing -> {
                existing.setPasswordHash(passwordEncoder.encode(adminPassword));
                existing.setName(adminName);
                existing.setRole("ADMIN");
                existing.setActive(true);
                userRepository.save(existing);
                log.info("[DataInitializer] Configured admin account verified: {}", adminEmail);
            },
            () -> {
                User admin = User.builder()
                        .name(adminName)
                        .email(adminEmail)
                        .passwordHash(passwordEncoder.encode(adminPassword))
                        .role("ADMIN")
                        .team("Executive Operations")
                        .active(true)
                        .build();
                userRepository.save(admin);
                log.info("[DataInitializer] Configured admin account provisioned: {}", adminEmail);
            }
        );

        // 2. Ensure default demo seed accounts exist and have valid encoded passwords ("password123")
        String defaultSeedPasswordHash = passwordEncoder.encode("password123");
        java.util.Map<String, String[]> demoUsers = java.util.Map.of(
            "j.rao@dealflow360.com", new String[]{"Jayant Rao", "SALES_REP", "Enterprise Sales"},
            "s.patel@dealflow360.com", new String[]{"Sneha Patel", "SALES_REP", "Mid-Market"},
            "m.shah@dealflow360.com", new String[]{"Mehul Shah", "SALES_MANAGER", "Commercial Leadership"},
            "r.iyer@dealflow360.com", new String[]{"Radhika Iyer", "FINANCE", "Finance Operations"},
            "buyer@acmecorp.com", new String[]{"Alex Turner", "CUSTOMER", "Procurement"}
        );

        demoUsers.forEach((email, details) -> {
            userRepository.findByEmail(email).ifPresentOrElse(
                u -> {
                    if (!passwordEncoder.matches("password123", u.getPasswordHash())) {
                        u.setPasswordHash(defaultSeedPasswordHash);
                    }
                    u.setActive(true);
                    userRepository.save(u);
                    log.info("[DataInitializer] Seed user verified: {}", email);
                },
                () -> {
                    User user = User.builder()
                            .name(details[0])
                            .email(email)
                            .passwordHash(defaultSeedPasswordHash)
                            .role(details[1])
                            .team(details[2])
                            .active(true)
                            .build();
                    userRepository.save(user);
                    log.info("[DataInitializer] Demo user provisioned: {} ({})", email, details[1]);
                }
            );
        });
    }
}
