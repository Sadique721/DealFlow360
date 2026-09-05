package com.dealflow360.negotiation;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "negotiation_messages")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NegotiationMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "quotation_id", nullable = false)
    private Long quotationId;

    @Column(name = "sender_role", nullable = false, length = 50)
    private String senderRole; // CUSTOMER, SALES_REP, SYSTEM

    @Column(name = "sender_name", nullable = false, length = 100)
    private String senderName;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(name = "line_reference_id")
    private Long lineReferenceId;

    @Column(name = "counter_discount_percent", precision = 5, scale = 2)
    private BigDecimal counterDiscountPercent;

    @Column(name = "requested_delivery_date")
    private LocalDate requestedDeliveryDate;

    @Column(name = "created_at", updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
