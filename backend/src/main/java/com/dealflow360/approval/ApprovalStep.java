package com.dealflow360.approval;

import com.dealflow360.auth.User;
import com.dealflow360.quotation.Quotation;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "approval_steps")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApprovalStep {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approval_request_id", nullable = false)
    @JsonIgnore
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private ApprovalRequest approvalRequest;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "quotation_id", nullable = false)
    private Quotation quotation;

    @Column(nullable = false, length = 50)
    private String level; // STAGE_1_MANAGER, STAGE_2_FINANCE

    @Column(name = "required_role", nullable = false, length = 50)
    private String requiredRole; // SALES_MANAGER, FINANCE

    @Column(nullable = false, length = 50)
    @Builder.Default
    private String status = "PENDING"; // PENDING, APPROVED, REJECTED, RETURNED, SKIPPED

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "approver_id")
    private User approver;

    @Column(name = "approver_name", length = 100)
    private String approverName;

    @Column(name = "assigned_at")
    @Builder.Default
    private LocalDateTime assignedAt = LocalDateTime.now();

    @Column(name = "acted_at")
    private LocalDateTime actedAt;

    @Column(columnDefinition = "TEXT")
    private String comments;

    @Column(name = "sla_deadline")
    private LocalDateTime slaDeadline;
}
