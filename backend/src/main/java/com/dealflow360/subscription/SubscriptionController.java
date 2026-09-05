package com.dealflow360.subscription;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/subscriptions")
@Tag(name = "Subscription & Proration Engine", description = "Endpoints for recurring contracts, schedules, proration calculation, and hybrid capex/opex billing")
public class SubscriptionController {

    private final SubscriptionService subscriptionService;

    public SubscriptionController(SubscriptionService subscriptionService) {
        this.subscriptionService = subscriptionService;
    }

    @GetMapping
    @Operation(summary = "List subscriptions with optional customer filter")
    public ResponseEntity<List<Subscription>> listSubscriptions(@RequestParam(required = false) Long customerId) {
        return ResponseEntity.ok(subscriptionService.listSubscriptions(customerId));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get subscription details by ID")
    public ResponseEntity<Subscription> getSubscription(@PathVariable Long id) {
        return ResponseEntity.ok(subscriptionService.getSubscriptionById(id));
    }

    @GetMapping("/{id}/schedules")
    @Operation(summary = "Get recurring milestone billing schedule for a subscription")
    public ResponseEntity<List<BillingSchedule>> getSchedules(@PathVariable Long id) {
        return ResponseEntity.ok(subscriptionService.getSchedules(id));
    }

    @GetMapping("/plans")
    @Operation(summary = "List standard recurring subscription plans")
    public ResponseEntity<List<SubscriptionPlan>> getPlans() {
        return ResponseEntity.ok(subscriptionService.listPlans());
    }

    @GetMapping("/plans/{id}")
    @Operation(summary = "Get subscription plan by ID")
    public ResponseEntity<SubscriptionPlan> getPlan(@PathVariable Long id) {
        return ResponseEntity.ok(subscriptionService.getPlanById(id));
    }

    @PostMapping("/plans")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create a new subscription plan (Admin only)")
    public ResponseEntity<SubscriptionPlan> createPlan(@RequestBody SubscriptionPlan plan) {
        return ResponseEntity.ok(subscriptionService.createPlan(plan));
    }

    @PutMapping("/plans/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update a subscription plan (Admin only)")
    public ResponseEntity<SubscriptionPlan> updatePlan(@PathVariable Long id, @RequestBody SubscriptionPlan plan) {
        return ResponseEntity.ok(subscriptionService.updatePlan(id, plan));
    }

    @DeleteMapping("/plans/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Deactivate a subscription plan (Admin only)")
    public ResponseEntity<Void> deletePlan(@PathVariable Long id) {
        subscriptionService.deletePlan(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/generate-from-quotation/{quotationId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SALES_MANAGER', 'FINANCE', 'SALES_REP')")
    @Operation(summary = "Generate recurring subscriptions and milestone billing schedules from an approved quotation")
    public ResponseEntity<List<Subscription>> generateFromQuotation(@PathVariable Long quotationId) {
        return ResponseEntity.ok(subscriptionService.generateFromQuotation(quotationId));
    }

    @PostMapping("/{id}/preview-proration")
    @Operation(summary = "Preview day-accurate proration adjustment math before applying modification")
    public ResponseEntity<Map<String, Object>> previewProration(
            @PathVariable Long id,
            @RequestParam int newQuantity,
            @RequestParam(required = false) LocalDate changeDate) {
        return ResponseEntity.ok(subscriptionService.previewProration(id, newQuantity, changeDate));
    }

    @PostMapping("/{id}/modify")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE')")
    @Operation(summary = "Apply mid-cycle subscription modification and generate prorated invoice/credit note")
    public ResponseEntity<Subscription> modifySubscription(
            @PathVariable Long id,
            @RequestParam int newQuantity,
            @RequestParam(required = false) LocalDate changeDate) {
        return ResponseEntity.ok(subscriptionService.applyModification(id, newQuantity, changeDate));
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN', 'FINANCE')")
    @Operation(summary = "Cancel subscription and compute partial refund credit note for unused days")
    public ResponseEntity<Subscription> cancelSubscription(
            @PathVariable Long id,
            @RequestParam(required = false) LocalDate cancelDate,
            @RequestParam(defaultValue = "Customer requested cancellation") String reason) {
        return ResponseEntity.ok(subscriptionService.cancelSubscription(id, cancelDate, reason));
    }

    @GetMapping("/quotation/{quotationId}/billing-overview")
    @Operation(summary = "Get reconciled Capex (One-time) vs Opex (Recurring) billing overview for a quotation")
    public ResponseEntity<Map<String, Object>> getBillingOverview(@PathVariable Long quotationId) {
        return ResponseEntity.ok(subscriptionService.getBillingOverviewForQuotation(quotationId));
    }
}
