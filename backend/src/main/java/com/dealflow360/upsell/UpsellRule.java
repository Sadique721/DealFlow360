package com.dealflow360.upsell;

import com.dealflow360.catalog.Product;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "upsell_rules")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpsellRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "base_product_id", nullable = false)
    private Product baseProduct;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "suggested_product_id", nullable = false)
    private Product suggestedProduct;

    @Column(name = "co_purchase_score", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal coPurchaseScore = BigDecimal.valueOf(0.85);

    @Column(name = "is_promoted")
    @Builder.Default
    private Boolean isPromoted = false;

    @Column(name = "promo_tag", length = 100)
    private String promoTag;

    @Column(name = "promo_discount_percent", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal promoDiscountPercent = BigDecimal.ZERO;

    @Column(name = "min_margin_threshold", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal minMarginThreshold = BigDecimal.valueOf(20.00);
}
