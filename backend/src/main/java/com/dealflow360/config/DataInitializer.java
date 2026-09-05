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
        userRepository.findByEmail(adminEmail).ifPresentOrElse(
            existing -> {
                existing.setPasswordHash(passwordEncoder.encode(adminPassword));
                existing.setName(adminName);
                existing.setRole("ADMIN");
                existing.setActive(true);
                userRepository.save(existing);
                log.info("[DataInitializer] System admin account verified from config: {}", adminEmail);
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
                log.info("[DataInitializer] System admin account provisioned from config: {}", adminEmail);
            }
        );
    }
}
