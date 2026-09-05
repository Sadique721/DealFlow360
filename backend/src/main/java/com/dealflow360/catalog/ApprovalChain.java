package com.dealflow360.catalog;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "approval_chains")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApprovalChain {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "min_score", nullable = false, precision = 6, scale = 2)
    private BigDecimal minScore;

    @Column(name = "max_score", nullable = false, precision = 6, scale = 2)
    private BigDecimal maxScore;

    @Column(name = "required_level", nullable = false, length = 50)
    private String requiredLevel; // MANAGER, MANAGER_THEN_FINANCE

    @Column(length = 255)
    private String description;
}
