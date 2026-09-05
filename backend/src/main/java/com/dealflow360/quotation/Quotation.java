package com.dealflow360.quotation;

import com.dealflow360.auth.User;
import com.dealflow360.catalog.Customer;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "quotations")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Quotation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "quote_number", nullable = false, unique = true, length = 50)
    private String quoteNumber;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "sales_rep_id", nullable = false)
    private User salesRep;

    @Column(nullable = false, length = 50)
    @Builder.Default
    private String status = "DRAFT"; // DRAFT, PENDING_APPROVAL, APPROVED, RETURNED, REJECTED, SENT_TO_CUSTOMER, UNDER_NEGOTIATION, CONFIRMED, FULFILLED, CLOSED

    @Column(name = "subtotal_amount", precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal subtotalAmount = BigDecimal.ZERO;

    @Column(name = "total_discount_amount", precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal totalDiscountAmount = BigDecimal.ZERO;

    @Column(name = "total_amount", precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @Column(name = "total_cost", precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal totalCost = BigDecimal.ZERO;

    @Column(name = "total_margin_amount", precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal totalMarginAmount = BigDecimal.ZERO;

    @Column(name = "margin_percentage", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal marginPercentage = BigDecimal.ZERO;

    @Column(name = "blended_risk_score", precision = 6, scale = 2)
    @Builder.Default
    private BigDecimal blendedRiskScore = BigDecimal.ZERO;

    @Builder.Default
    private Integer version = 1;

    @Column(name = "portal_token", nullable = false, unique = true, length = 100)
    private String portalToken;

    @Column(name = "promised_delivery_date")
    private LocalDate promisedDeliveryDate;

    @Column(name = "last_activity_at")
    @Builder.Default
    private LocalDateTime lastActivityAt = LocalDateTime.now();

    @Column(name = "created_at", updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @OneToMany(mappedBy = "quotation", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Builder.Default
    private List<QuotationLine> lines = new ArrayList<>();

    @JsonProperty("marginPct")
    public BigDecimal getMarginPct() {
        return marginPercentage != null ? marginPercentage : BigDecimal.ZERO;
    }

    @JsonProperty("riskScore")
    public BigDecimal getRiskScore() {
        return blendedRiskScore != null ? blendedRiskScore : BigDecimal.ZERO;
    }

    @JsonProperty("blendedDiscountPct")
    public BigDecimal getBlendedDiscountPct() {
        if (subtotalAmount != null && subtotalAmount.compareTo(BigDecimal.ZERO) > 0 && totalDiscountAmount != null) {
            return totalDiscountAmount.multiply(BigDecimal.valueOf(100)).divide(subtotalAmount, 2, RoundingMode.HALF_UP);
        }
        return BigDecimal.ZERO;
    }

    @JsonProperty("requiresManagerApproval")
    public Boolean getRequiresManagerApproval() {
        return blendedRiskScore != null && blendedRiskScore.compareTo(BigDecimal.ZERO) > 0;
    }

    @JsonProperty("requiresFinanceApproval")
    public Boolean getRequiresFinanceApproval() {
        if (blendedRiskScore != null && blendedRiskScore.compareTo(BigDecimal.valueOf(10.0)) > 0) {
            return true;
        }
        if (lines != null) {
            for (QuotationLine line : lines) {
                if (line.getOveragePoints() != null && line.getOveragePoints().compareTo(BigDecimal.valueOf(8.0)) > 0) {
                    return true;
                }
            }
        }
        return false;
    }
}
