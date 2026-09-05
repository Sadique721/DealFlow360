package com.dealflow360.upsell;

import com.dealflow360.upsell.dto.UpsellSuggestion;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/upsell", "/api/upsells"})
@Tag(name = "Upsell & Cross-Sell Engine", description = "Endpoints for co-purchase affinity suggestions with live margin impact and promotion boosts")
public class UpsellController {

    private final UpsellService upsellService;

    public UpsellController(UpsellService upsellService) {
        this.upsellService = upsellService;
    }

    @GetMapping({"/suggestions/{quotationId}", "/quotation/{quotationId}"})
    @Operation(summary = "Get ranked upsell and cross-sell suggestions for a quotation")
    public ResponseEntity<List<UpsellSuggestion>> getSuggestions(@PathVariable Long quotationId) {
        return ResponseEntity.ok(upsellService.getSuggestionsForQuotation(quotationId));
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
