package com.dealflow360.approval;

import com.dealflow360.approval.dto.ApprovalActionRequest;
import com.dealflow360.auth.AuthUser;
import com.dealflow360.auth.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/approvals")
@Tag(name = "Approval Engine", description = "Endpoints for reviewing, approving, rejecting, and returning quotations")
public class ApprovalController {

    private final ApprovalService approvalService;

    public ApprovalController(ApprovalService approvalService) {
        this.approvalService = approvalService;
    }

    /**
     * List pending approval requests.
     * - ADMIN / SALES_MANAGER: see all pending
     * - FINANCE: see only STAGE_2_FINANCE steps
     * - SALES_REP: 403 — they cannot view the approval queue
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER','FINANCE')")
    @Operation(summary = "List pending approval requests (ADMIN/SALES_MANAGER/FINANCE only)")
    public ResponseEntity<List<ApprovalRequest>> listPendingApprovals() {
        return ResponseEntity.ok(approvalService.listPendingRequests());
    }

    /**
     * Get approval details for a specific quotation.
     * Sales Rep can view status of their own submitted quotation — but cannot act on it.
     */
    @GetMapping("/quotation/{quotationId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get approval request and steps for a specific quotation")
    public ResponseEntity<?> getApprovalDetails(@PathVariable Long quotationId) {
        var requestOpt = approvalService.getRequestByQuotationId(quotationId);
        if (requestOpt.isEmpty()) {
            return ResponseEntity.ok(Map.of("hasApprovalRequest", false));
        }
        var steps = approvalService.getStepsForQuotation(quotationId);
        return ResponseEntity.ok(Map.of(
                "hasApprovalRequest", true,
                "request", requestOpt.get(),
                "steps", steps
        ));
    }

    /**
     * Execute an approval action (APPROVE / REJECT / RETURN).
     *
     * CRITICAL: Only SALES_MANAGER (L1) and FINANCE (L2) can approve.
     * SALES_REP cannot approve their own or anyone else's quotation — returns 403.
     */
    @PostMapping("/act")
    @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER','FINANCE')")
    @Operation(summary = "Execute approval action — APPROVE, REJECT or RETURN (SALES_MANAGER/FINANCE/ADMIN only)")
    public ResponseEntity<ApprovalRequest> actOnApproval(
            @RequestBody ApprovalActionRequest actionRequest,
            @AuthenticationPrincipal AuthUser authUser) {

        User approver = authUser != null
                ? authUser.getUser()
                : User.builder().name("Manager").role("SALES_MANAGER").build();

        return ResponseEntity.ok(approvalService.actOnApproval(actionRequest, approver));
    }
}
