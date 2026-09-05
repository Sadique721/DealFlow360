package com.dealflow360.subscription;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "billing_schedules")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BillingSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subscription_id", nullable = false)
    @JsonIgnore
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Subscription subscription;

    @Column(name = "quotation_line_id")
    private Long quotationLineId;

    @Column(name = "billing_date", nullable = false)
    private LocalDate billingDate;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 50)
    @Builder.Default
    private String status = "PENDING"; // PENDING, INVOICED, PAID

    @Column(name = "proration_factor", precision = 6, scale = 4)
    @Builder.Default
    private BigDecimal prorationFactor = BigDecimal.valueOf(1.0000);

    @Column(name = "proration_note", length = 255)
    private String prorationNote;

    @Column(name = "invoice_id")
    private Long invoiceId;
}
