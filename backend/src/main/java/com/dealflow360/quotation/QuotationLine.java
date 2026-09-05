package com.dealflow360.quotation;

import com.dealflow360.catalog.Product;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "quotation_lines")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuotationLine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "quotation_id", nullable = false)
    @JsonIgnore
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Quotation quotation;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false)
    @Builder.Default
    private Integer quantity = 1;

    @Column(name = "unit_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "cost_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal costPrice;

    @Column(name = "discount_percent", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal discountPercent = BigDecimal.ZERO;

    @Column(name = "line_total", nullable = false, precision = 14, scale = 2)
    private BigDecimal lineTotal;

    @Column(name = "margin_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal marginAmount;

    @Column(name = "line_type", nullable = false, length = 50)
    @Builder.Default
    private String lineType = "ONE_TIME"; // ONE_TIME, RECURRING

    @Column(name = "subscription_plan_id")
    private Long subscriptionPlanId;

    @Column(name = "overage_points", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal overagePoints = BigDecimal.ZERO;

    @Column(length = 50)
    @Builder.Default
    private String status = "OK"; // OK, OVER

    @com.fasterxml.jackson.annotation.JsonProperty("unitListPrice")
    public BigDecimal getUnitListPrice() {
        return unitPrice != null ? unitPrice : (product != null ? product.getBasePrice() : BigDecimal.ZERO);
    }

    @com.fasterxml.jackson.annotation.JsonProperty("unitDiscountPct")
    public BigDecimal getUnitDiscountPct() {
        return discountPercent != null ? discountPercent : BigDecimal.ZERO;
    }

    @com.fasterxml.jackson.annotation.JsonProperty("unitFinalPrice")
    public BigDecimal getUnitFinalPrice() {
        if (unitPrice == null) return BigDecimal.ZERO;
        if (discountPercent == null || discountPercent.compareTo(BigDecimal.ZERO) <= 0) return unitPrice;
        BigDecimal discFactor = discountPercent.divide(BigDecimal.valueOf(100), 4, java.math.RoundingMode.HALF_UP);
        return unitPrice.multiply(BigDecimal.ONE.subtract(discFactor)).setScale(2, java.math.RoundingMode.HALF_UP);
    }

    @com.fasterxml.jackson.annotation.JsonProperty("lineCost")
    public BigDecimal getLineCost() {
        if (costPrice != null) {
            return costPrice.multiply(BigDecimal.valueOf(quantity != null ? quantity : 1));
        }
        if (product != null && product.getCostPrice() != null) {
            return product.getCostPrice().multiply(BigDecimal.valueOf(quantity != null ? quantity : 1));
        }
        return BigDecimal.ZERO;
    }

    @com.fasterxml.jackson.annotation.JsonProperty("lineMarginPct")
    public BigDecimal getLineMarginPct() {
        if (lineTotal != null && lineTotal.compareTo(BigDecimal.ZERO) > 0 && marginAmount != null) {
            return marginAmount.multiply(BigDecimal.valueOf(100)).divide(lineTotal, 2, java.math.RoundingMode.HALF_UP);
        }
        BigDecimal cost = getLineCost();
        if (lineTotal != null && lineTotal.compareTo(BigDecimal.ZERO) > 0 && cost != null) {
            return lineTotal.subtract(cost).multiply(BigDecimal.valueOf(100)).divide(lineTotal, 2, java.math.RoundingMode.HALF_UP);
        }
        return BigDecimal.ZERO;
    }
}
