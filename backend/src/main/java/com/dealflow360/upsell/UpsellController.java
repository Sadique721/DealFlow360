package com.dealflow360.upsell;

import com.dealflow360.auth.AuthUser;
import com.dealflow360.quotation.Quotation;
import com.dealflow360.quotation.QuotationService;
import com.dealflow360.upsell.dto.UpsellSuggestion;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({"/api/upsell", "/api/upsells"})
@Tag(name = "Upsell & Cross-Sell Engine", description = "Endpoints for co-purchase affinity suggestions with live margin impact and promotion boosts")
public class UpsellController {

    private final UpsellService upsellService;
    private final QuotationService quotationService;

    public UpsellController(UpsellService upsellService, QuotationService quotationService) {
        this.upsellService = upsellService;
        this.quotationService = quotationService;
    }

    @GetMapping({"/suggestions/{quotationId}", "/quotation/{quotationId}"})
    @Operation(summary = "Get ranked upsell and cross-sell suggestions for a quotation")
    public ResponseEntity<List<UpsellSuggestion>> getSuggestions(@PathVariable Long quotationId) {
        return ResponseEntity.ok(upsellService.getSuggestionsForQuotation(quotationId));
    }

    @PostMapping("/apply")
    @Operation(summary = "Apply suggested upsell product directly to quotation in database")
    public ResponseEntity<Quotation> applyUpsell(
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal AuthUser authUser) {
        Long quotationId = Long.valueOf(payload.get("quotationId").toString());
        Long productId = Long.valueOf(payload.get("productId").toString());
        BigDecimal discount = BigDecimal.ZERO;
        if (payload.containsKey("promoDiscountPercent") && payload.get("promoDiscountPercent") != null) {
            discount = new BigDecimal(payload.get("promoDiscountPercent").toString());
        } else if (payload.containsKey("discountPercent") && payload.get("discountPercent") != null) {
            discount = new BigDecimal(payload.get("discountPercent").toString());
        }
        int quantity = payload.containsKey("quantity") && payload.get("quantity") != null
                ? Integer.parseInt(payload.get("quantity").toString()) : 1;
        String changedBy = authUser != null ? authUser.getName() : "Sales Rep";

        return ResponseEntity.ok(quotationService.addProductLine(quotationId, productId, quantity, discount, changedBy));
    }

    @GetMapping("/rules")
    @Operation(summary = "List all active upsell configuration rules")
    public ResponseEntity<List<UpsellRule>> getRules() {
        return ResponseEntity.ok(upsellService.getAllRules());
    }

    @PostMapping("/rules")
    @Operation(summary = "Create a new upsell rule")
    public ResponseEntity<UpsellRule> createRule(@RequestBody UpsellRule rule) {
        return ResponseEntity.ok(upsellService.createRule(rule));
    }
}
