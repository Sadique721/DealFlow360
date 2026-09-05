package com.dealflow360.subscription;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "subscription_plans")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubscriptionPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String name;

    @Column(name = "billing_cycle", nullable = false, length = 50)
    private String billingCycle; // MONTHLY, QUARTERLY, YEARLY

    @Column(name = "base_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal basePrice;

    @Column(name = "default_proration_rule", length = 100)
    @Builder.Default
    private String defaultProrationRule = "DAILY_PRORATION";

    @Column(name = "cancellation_rule", length = 100)
    @Builder.Default
    private String cancellationRule = "PARTIAL_REFUND_UNUSED_DAYS";

    @Builder.Default
    private Boolean active = true;
}
