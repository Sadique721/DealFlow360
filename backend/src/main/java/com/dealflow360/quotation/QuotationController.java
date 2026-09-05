package com.dealflow360.quotation;

import com.dealflow360.auth.AuthUser;
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

    public QuotationController(QuotationService quotationService) {
        this.quotationService = quotationService;
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
        return ResponseEntity.ok(quotationService.submitForApproval(id, submittedBy));
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
