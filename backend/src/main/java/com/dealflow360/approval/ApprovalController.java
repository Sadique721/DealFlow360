package com.dealflow360.approval;

import com.dealflow360.approval.dto.ApprovalActionRequest;
import com.dealflow360.auth.AuthUser;
import com.dealflow360.auth.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
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

    @GetMapping
    @Operation(summary = "List all pending approval requests")
    public ResponseEntity<List<ApprovalRequest>> listPendingApprovals() {
        return ResponseEntity.ok(approvalService.listPendingRequests());
    }

    @GetMapping("/quotation/{quotationId}")
    @Operation(summary = "Get approval request and sequential steps for a specific quotation")
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

    @PostMapping("/act")
    @Operation(summary = "Execute approval action (APPROVE, REJECT, or RETURN) with comments and audit logging")
    public ResponseEntity<ApprovalRequest> actOnApproval(
            @RequestBody ApprovalActionRequest actionRequest,
            @AuthenticationPrincipal AuthUser authUser) {
        User approver = authUser != null ? authUser.getUser() : User.builder().name("Manager").role("SALES_MANAGER").build();
        return ResponseEntity.ok(approvalService.actOnApproval(actionRequest, approver));
    }
}
