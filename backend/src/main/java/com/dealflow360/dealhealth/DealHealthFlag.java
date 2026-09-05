package com.dealflow360.dealhealth;

import com.dealflow360.quotation.Quotation;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "deal_health_flags")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DealHealthFlag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "quotation_id", nullable = false)
    private Quotation quotation;

    @Column(name = "flag_type", nullable = false, length = 50)
    private String flagType; // STALLED, DISCOUNT_ANOMALY, DELIVERY_SLIPPAGE, SLA_BREACH

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String severity = "MEDIUM"; // LOW, MEDIUM, HIGH, CRITICAL

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "detected_at", updatable = false)
    @Builder.Default
    private LocalDateTime detectedAt = LocalDateTime.now();

    @Builder.Default
    private Boolean resolved = false;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "action_taken", length = 100)
    private String actionTaken;
}
