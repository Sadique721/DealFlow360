package com.dealflow360.config;

import com.dealflow360.auth.User;
import com.dealflow360.auth.UserRepository;
import com.dealflow360.catalog.Customer;
import com.dealflow360.catalog.CustomerRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DataInitializer — runs on application startup.
 *
 * Ensures the system ADMIN user is provisioned according to credentials configured
 * in application.yml under dealflow.admin.* (name, email, password).
 * Automatically heals/syncs all registered CUSTOMER role users into the master
 * customers catalog table.
 */
@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${dealflow.admin.email:admin@dealflow360.com}")
    private String adminEmail;

    @Value("${dealflow.admin.password:Amin@123}")
    private String adminPassword;

    @Value("${dealflow.admin.name:Administrator}")
    private String adminName;

    public DataInitializer(UserRepository userRepository,
                           CustomerRepository customerRepository,
                           PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.customerRepository = customerRepository;
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

        // 2. Ensure default demo seed accounts have valid encoded passwords ("Amin@123")
        String defaultSeedPasswordHash = passwordEncoder.encode("Amin@123");
        String[] seedEmails = {
            "admin@dealflow360.com",
            "j.rao@dealflow360.com",
            "s.patel@dealflow360.com",
            "m.shah@dealflow360.com",
            "r.iyer@dealflow360.com",
            "buyer@acmecorp.com"
        };

        for (String email : seedEmails) {
            if (!email.equalsIgnoreCase(adminEmail)) {
                userRepository.findByEmail(email).ifPresent(u -> {
                    if (!passwordEncoder.matches("Amin@123", u.getPasswordHash())) {
                        u.setPasswordHash(defaultSeedPasswordHash);
                        u.setActive(true);
                        userRepository.save(u);
                        log.info("[DataInitializer] Seed user password repaired: {}", email);
                    }
                });
            }
        }

        // 3. Self-healing sync: Ensure all users with CUSTOMER role are present in customers catalog & possess commercial attributes
        List<User> customerUsers = userRepository.findByRole("CUSTOMER");
        for (User u : customerUsers) {
            if (u.getTier() == null) u.setTier("BRONZE");
            if (u.getContactPerson() == null) u.setContactPerson(u.getName());
            userRepository.save(u);

            if (customerRepository.findByPortalUserId(u.getId()).isEmpty() &&
                customerRepository.findByEmail(u.getEmail()).isEmpty()) {

                String displayName = u.getName();
                if (u.getTeam() != null && !u.getTeam().isBlank() && !u.getTeam().equalsIgnoreCase("External")) {
                    displayName = u.getName() + " (" + u.getTeam() + ")";
                }

                Customer customer = Customer.builder()
                        .name(displayName)
                        .email(u.getEmail())
                        .contactPerson(u.getContactPerson())
                        .phone(u.getPhone())
                        .address(u.getAddress() != null ? u.getAddress() : u.getTeam())
                        .tier(u.getTier())
                        .portalUserId(u.getId())
                        .createdAt(u.getCreatedAt() != null ? u.getCreatedAt() : LocalDateTime.now())
                        .build();
                customerRepository.save(customer);
                log.info("[DataInitializer] Auto-synced customer record into catalog: {} <{}>", displayName, u.getEmail());
            } else {
                // Link portalUserId and sync commercial fields if missing
                customerRepository.findByEmail(u.getEmail()).ifPresent(c -> {
                    boolean updated = false;
                    if (c.getPortalUserId() == null) {
                        c.setPortalUserId(u.getId());
                        updated = true;
                    }
                    if (u.getTier() != null && !u.getTier().equals(c.getTier())) {
                        c.setTier(u.getTier());
                        updated = true;
                    }
                    if (updated) {
                        customerRepository.save(c);
                        log.info("[DataInitializer] Synced commercial profile for customer {}", c.getName());
                    }
                });
            }
        }
    }
}

