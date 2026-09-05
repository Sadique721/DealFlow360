package com.dealflow360.negotiation;

import com.dealflow360.negotiation.dto.NegotiationProposalRequest;
import com.dealflow360.negotiation.dto.PortalQuotationView;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/portal")
@Tag(name = "Customer Portal Negotiation", description = "Public-facing secure tokenized endpoints for external buyers to negotiate, comment, and confirm quotes")
public class NegotiationController {

    private final NegotiationService negotiationService;

    public NegotiationController(NegotiationService negotiationService) {
        this.negotiationService = negotiationService;
    }

    @GetMapping("/quotations/{portalToken}")
    @Operation(summary = "View sanitized quotation details for external buyer (zero cost/margin leakage)")
    public ResponseEntity<PortalQuotationView> getPortalView(@PathVariable String portalToken) {
        return ResponseEntity.ok(negotiationService.getPortalView(portalToken));
    }

    @PostMapping("/quotations/{portalToken}/message")
    @Operation(summary = "Submit a line-item discussion message or proposed counter-discount")
    public ResponseEntity<NegotiationMessage> submitMessage(
            @PathVariable String portalToken,
            @RequestBody NegotiationProposalRequest request,
            @RequestParam(defaultValue = "CUSTOMER") String senderRole) {
        return ResponseEntity.ok(negotiationService.submitMessage(portalToken, request, senderRole));
    }

    @PostMapping("/quotations/{portalToken}/confirm")
    @Operation(summary = "Confirm quote terms: auto-routes to fulfillment if within limits, or re-locks for approval if counter exceeds threshold")
    public ResponseEntity<Map<String, Object>> confirmQuotation(
            @PathVariable String portalToken,
            @RequestParam(defaultValue = "Customer Buyer") String confirmedBy) {
        return ResponseEntity.ok(negotiationService.confirmPortalQuotation(portalToken, confirmedBy));
    }
}
