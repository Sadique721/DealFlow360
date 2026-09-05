package com.dealflow360.quotation;

import com.dealflow360.approval.ApprovalRequest;
import com.dealflow360.approval.ApprovalService;
import com.dealflow360.approval.dto.ApprovalActionRequest;
import com.dealflow360.auth.AuthUser;
import com.dealflow360.auth.User;
import com.dealflow360.discount.RiskCalculationResult;
import com.dealflow360.quotation.dto.LineItemRequest;
import com.dealflow360.quotation.dto.QuotationCalculateRequest;
import com.dealflow360.quotation.dto.QuotationCalculateResponse;
import com.dealflow360.quotation.dto.QuotationCreateRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/quotations")
@PreAuthorize("isAuthenticated()")
@Tag(name = "Quotations & Cart", description = "Endpoints for creating quotations, editing cart lines, live margin calculation, and versioning")
public class QuotationController {

    private final QuotationService quotationService;
    private final ApprovalService approvalService;
    private final com.dealflow360.warehouse.FulfillmentService fulfillmentService;

    public QuotationController(QuotationService quotationService,
                               ApprovalService approvalService,
                               com.dealflow360.warehouse.FulfillmentService fulfillmentService) {
        this.quotationService = quotationService;
        this.approvalService = approvalService;
        this.fulfillmentService = fulfillmentService;
    }

    @GetMapping
    @Operation(summary = "List quotations with role-based scoping and optional filters")
    public ResponseEntity<List<Quotation>> listQuotations(
            @RequestParam(required = false) Long repId,
            @RequestParam(required = false) String status,
            @AuthenticationPrincipal AuthUser authUser) {
        return ResponseEntity.ok(quotationService.listQuotations(repId, status, authUser));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get quotation by ID including all lines and customer details")
    public ResponseEntity<Quotation> getQuotation(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthUser authUser) {
        return ResponseEntity.ok(quotationService.getQuotationByIdSecured(id, authUser));
    }

    @PostMapping("/calculate")
    @Operation(summary = "Calculate line totals, margins, taxes, and risk scores live without saving")
    public ResponseEntity<QuotationCalculateResponse> calculate(
            @RequestBody QuotationCalculateRequest request) {
        return ResponseEntity.ok(quotationService.calculateQuotationPreview(request));
    }

    @PostMapping
    @Operation(summary = "Create a new draft quotation")
    public ResponseEntity<Quotation> createQuotation(
            @RequestBody QuotationCreateRequest request,
            @AuthenticationPrincipal AuthUser authUser) {
        String email = authUser != null ? authUser.getUsername() : "admin@dealflow360.com";
        return ResponseEntity.ok(quotationService.createQuotation(request, email));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update quotation lines and recalculate margin & risk score live")
    public ResponseEntity<Quotation> updateQuotation(
            @PathVariable Long id,
            @RequestBody QuotationCreateRequest request,
            @AuthenticationPrincipal AuthUser authUser) {
        String changedBy = authUser != null ? authUser.getName() : "Sales Rep";
        return ResponseEntity.ok(quotationService.updateQuotationLines(id, request.getLines(), changedBy, authUser));
    }

    @PutMapping("/{id}/lines")
    @Operation(summary = "Update quotation line items and recalculate margin & risk score live")
    public ResponseEntity<Quotation> updateLines(
            @PathVariable Long id,
            @RequestBody List<LineItemRequest> lines,
            @AuthenticationPrincipal AuthUser authUser) {
        String changedBy = authUser != null ? authUser.getName() : "Sales Rep";
        return ResponseEntity.ok(quotationService.updateQuotationLines(id, lines, changedBy, authUser));
    }

    @PostMapping("/{id}/submit")
    @Operation(summary = "Submit quotation for automatic blended risk evaluation and approval routing")
    public ResponseEntity<Map<String, Object>> submitForApproval(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthUser authUser) {
        String submittedBy = authUser != null ? authUser.getName() : "Sales Rep";
        return ResponseEntity.ok(quotationService.submitForApproval(id, submittedBy, authUser));
    }

    @PostMapping("/{id}/approval/act")
    @PreAuthorize("hasAnyRole('ADMIN','SALES_MANAGER','FINANCE')")
    @Operation(summary = "Execute approval action on a quotation (SALES_MANAGER/FINANCE/ADMIN only)")
    public ResponseEntity<ApprovalRequest> actOnQuotationApproval(
            @PathVariable Long id,
            @RequestBody ApprovalActionRequest request,
            @AuthenticationPrincipal AuthUser authUser) {
        request.setQuotationId(id);
        User approver = authUser != null ? authUser.getUser() : null;
        return ResponseEntity.ok(approvalService.actOnApproval(request, approver));
    }

    @PostMapping("/{id}/confirm")
    @Operation(summary = "Confirm quotation and convert to order")
    public ResponseEntity<Quotation> confirmQuotation(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthUser authUser) {
        String confirmedBy = authUser != null ? authUser.getName() : "User";
        return ResponseEntity.ok(quotationService.confirmQuotation(id, confirmedBy));
    }

    @PostMapping("/{id}/cancel")
    @Operation(summary = "Cancel quotation")
    public ResponseEntity<Quotation> cancelQuotation(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthUser authUser) {
        String cancelledBy = authUser != null ? authUser.getName() : "User";
        return ResponseEntity.ok(quotationService.cancelQuotation(id, cancelledBy));
    }

    @GetMapping("/{id}/fulfillment-plan")
    @Operation(summary = "Get or generate recommended multi-warehouse fulfillment split plan")
    public ResponseEntity<com.dealflow360.warehouse.FulfillmentPlan> getFulfillmentPlan(@PathVariable Long id) {
        return ResponseEntity.ok(fulfillmentService.generateOrGetPlan(id));
    }

    @PostMapping("/{id}/fulfillment-plan")
    @Operation(summary = "Generate/recompute recommended multi-warehouse fulfillment split plan")
    public ResponseEntity<com.dealflow360.warehouse.FulfillmentPlan> createOrRecomputeFulfillmentPlan(@PathVariable Long id) {
        return ResponseEntity.ok(fulfillmentService.generateOrRecomputePlan(id));
    }

    @GetMapping("/{id}/risk-breakdown")
    @Operation(summary = "Get explainable blended risk score calculation breakdown card")
    public ResponseEntity<RiskCalculationResult> getRiskBreakdown(@PathVariable Long id) {
        return ResponseEntity.ok(quotationService.getQuotationRiskBreakdown(id));
    }

    @GetMapping("/{id}/versions")
    @Operation(summary = "Get quotation version history snapshots for negotiation diff comparison")
    public ResponseEntity<List<QuotationVersion>> getVersions(@PathVariable Long id) {
        return ResponseEntity.ok(quotationService.getQuotationVersions(id));
    }
}
