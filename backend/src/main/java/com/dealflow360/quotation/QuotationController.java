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

import java.util.HashMap;
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
    private final com.dealflow360.upsell.UpsellService upsellService;
    private final com.dealflow360.subscription.SubscriptionService subscriptionService;

    public QuotationController(QuotationService quotationService,
                               ApprovalService approvalService,
                               com.dealflow360.warehouse.FulfillmentService fulfillmentService,
                               com.dealflow360.upsell.UpsellService upsellService,
                               com.dealflow360.subscription.SubscriptionService subscriptionService) {
        this.quotationService = quotationService;
        this.approvalService = approvalService;
        this.fulfillmentService = fulfillmentService;
        this.upsellService = upsellService;
        this.subscriptionService = subscriptionService;
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
        if (request.getSalesRepId() == null && authUser != null && authUser.getUser() != null) {
            request.setSalesRepId(authUser.getUser().getId());
        }
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

    @GetMapping("/{id}/upsell-suggestions")
    @Operation(summary = "Get live upsell & cross-sell suggestions for a quotation")
    public ResponseEntity<List<com.dealflow360.upsell.dto.UpsellSuggestion>> getUpsellSuggestions(@PathVariable Long id) {
        return ResponseEntity.ok(upsellService.getSuggestionsForQuotation(id));
    }

    @GetMapping("/{id}/approval")
    @Operation(summary = "Get approval status, steps, and risk evaluation for a quotation")
    public ResponseEntity<Map<String, Object>> getQuotationApproval(@PathVariable Long id) {
        Quotation quotation = quotationService.getQuotationById(id);
        var requestOpt = approvalService.getRequestByQuotationId(id);
        var steps = approvalService.getStepsForQuotation(id);
        var riskBreakdown = quotationService.getQuotationRiskBreakdown(id);

        Map<String, Object> resp = new HashMap<>();
        resp.put("quotationId", id);
        resp.put("quoteNumber", quotation.getQuoteNumber());
        resp.put("status", quotation.getStatus());
        resp.put("marginPct", quotation.getMarginPct());
        resp.put("riskScore", quotation.getRiskScore());
        resp.put("blendedDiscountPct", quotation.getBlendedDiscountPct());
        resp.put("approvalRequest", requestOpt.orElse(null));
        resp.put("steps", steps);
        resp.put("riskBreakdown", riskBreakdown);
        resp.put("requiresManagerApproval", quotation.getRequiresManagerApproval());
        resp.put("requiresFinanceApproval", quotation.getRequiresFinanceApproval());
        return ResponseEntity.ok(resp);
    }

    @PostMapping("/{id}/fulfillment-plan/accept")
    @PreAuthorize("hasAnyRole('ADMIN','FINANCE','SALES_MANAGER')")
    @Operation(summary = "Accept suggested fulfillment split plan for a quotation")
    public ResponseEntity<com.dealflow360.warehouse.FulfillmentPlan> acceptFulfillmentPlanForQuotation(@PathVariable Long id) {
        com.dealflow360.warehouse.FulfillmentPlan plan = fulfillmentService.generateOrGetPlan(id);
        return ResponseEntity.ok(fulfillmentService.acceptSuggestedPlan(plan.getId()));
    }

    @PostMapping("/{id}/fulfillment-plan/override")
    @PreAuthorize("hasAnyRole('ADMIN','FINANCE')")
    @Operation(summary = "Manually override warehouse allocation splits for a quotation")
    public ResponseEntity<com.dealflow360.warehouse.FulfillmentPlan> overrideFulfillmentPlanForQuotation(
            @PathVariable Long id,
            @RequestBody List<com.dealflow360.warehouse.dto.ManualSplitRequest> manualSplits,
            @RequestParam(defaultValue = "Manual logistics decision") String reason) {
        com.dealflow360.warehouse.FulfillmentPlan plan = fulfillmentService.generateOrGetPlan(id);
        return ResponseEntity.ok(fulfillmentService.manualOverride(plan.getId(), manualSplits, reason));
    }

    @GetMapping("/{id}/billing")
    @Operation(summary = "Get Capex vs Opex billing schedule and subscription overview for quotation")
    public ResponseEntity<Map<String, Object>> getQuotationBilling(@PathVariable Long id) {
        return ResponseEntity.ok(subscriptionService.getBillingOverviewForQuotation(id));
    }

    @PostMapping("/{id}/billing/proration-preview")
    @Operation(summary = "Preview proration adjustment for quotation subscription")
    public ResponseEntity<Map<String, Object>> previewProrationForQuotation(
            @PathVariable Long id,
            @RequestParam int newQuantity,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate changeDate) {
        return ResponseEntity.ok(subscriptionService.previewProrationForQuotation(id, newQuantity, changeDate));
    }

    @GetMapping("/{id}/status-summary")
    @Operation(summary = "Get comprehensive quotation lifecycle status summary (approval, fulfillment, billing)")
    public ResponseEntity<Map<String, Object>> getStatusSummary(@PathVariable Long id) {
        Quotation q = quotationService.getQuotationById(id);
        var appOpt = approvalService.getRequestByQuotationId(id);
        var steps = approvalService.getStepsForQuotation(id);
        var planOpt = fulfillmentService.findPlanByQuotationId(id);
        var billing = subscriptionService.getBillingOverviewForQuotation(id);

        Map<String, Object> summary = new HashMap<>();
        summary.put("quotationId", id);
        summary.put("quoteNumber", q.getQuoteNumber());
        summary.put("status", q.getStatus());
        summary.put("customerName", q.getCustomer() != null ? q.getCustomer().getName() : null);
        summary.put("salesRepName", q.getSalesRep() != null ? q.getSalesRep().getName() : null);
        summary.put("totalAmount", q.getTotalAmount());
        summary.put("marginPct", q.getMarginPct());
        summary.put("riskScore", q.getRiskScore());

        Map<String, Object> appSummary = new HashMap<>();
        if (appOpt.isPresent()) {
            ApprovalRequest ar = appOpt.get();
            appSummary.put("status", ar.getStatus());
            appSummary.put("currentLevel", ar.getCurrentLevel());
            appSummary.put("requiredTier", ar.getRequiredTier());
            appSummary.put("stepsCount", steps.size());
        } else {
            appSummary.put("status", "NOT_SUBMITTED");
        }
        summary.put("approval", appSummary);

        Map<String, Object> fulSummary = new HashMap<>();
        if (planOpt.isPresent()) {
            var p = planOpt.get();
            fulSummary.put("planId", p.getId());
            fulSummary.put("status", p.getStatus());
            fulSummary.put("shipmentCount", p.getShipmentCount());
            fulSummary.put("totalShippingCost", p.getTotalShippingCost());
            fulSummary.put("splitsCount", p.getSplits() != null ? p.getSplits().size() : 0);
        } else {
            fulSummary.put("status", "NO_PLAN");
        }
        summary.put("fulfillment", fulSummary);

        Map<String, Object> billSummary = new HashMap<>();
        billSummary.put("oneTimeTotal", billing.get("oneTimeTotal"));
        billSummary.put("recurringTotal", billing.get("recurringTotal"));
        summary.put("billing", billSummary);

        return ResponseEntity.ok(summary);
    }
}
