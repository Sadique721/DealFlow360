package com.dealflow360.audit;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "audit_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "entity_type", nullable = false, length = 50)
    private String entityType; // QUOTATION, APPROVAL, FULFILLMENT, SUBSCRIPTION

    @Column(name = "entity_id", nullable = false)
    private Long entityId;

    @Column(nullable = false, length = 50)
    private String action; // CREATED, SUBMITTED, APPROVED, RETURNED, REJECTED, NEGOTIATED, SPLIT_OVERRIDE

    @Column(name = "performed_by", nullable = false, length = 100)
    private String performedBy;

    @Column(updatable = false)
    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();

    @Column(name = "before_state", columnDefinition = "TEXT")
    private String beforeState;

    @Column(name = "after_state", columnDefinition = "TEXT")
    private String afterState;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Column(name = "margin_delta", precision = 6, scale = 2)
    private BigDecimal marginDelta;
}
