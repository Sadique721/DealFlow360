package com.dealflow360.dealhealth;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/deal-health")
@Tag(name = "Deal Health & Anomaly Radar", description = "Endpoints for detecting stalled quotes, Z-score discount outliers, delivery slippage, and automated nudges")
public class DealHealthController {

    private final AnomalyDetectionService anomalyDetectionService;

    public DealHealthController(AnomalyDetectionService anomalyDetectionService) {
        this.anomalyDetectionService = anomalyDetectionService;
    }

    @GetMapping({"", "/flags"})
    @Operation(summary = "Get all active deal health and anomaly alert flags")
    public ResponseEntity<List<DealHealthFlag>> getActiveFlags() {
        return ResponseEntity.ok(anomalyDetectionService.getActiveFlags());
    }

    @PostMapping("/scan")
    @Operation(summary = "Manually trigger full heuristic scan for stalled deals, discount outliers, and delivery risks")
    public ResponseEntity<Map<String, String>> triggerScan() {
        anomalyDetectionService.runFullHealthScan();
        return ResponseEntity.ok(Map.of("status", "SUCCESS", "message", "Health scan completed"));
    }

    @PostMapping({"/{id}/nudge", "/flags/{id}/nudge"})
    @Operation(summary = "Send an automated nudge to the responsible sales rep for a stalled or at-risk deal")
    public ResponseEntity<Map<String, Object>> nudgeRep(@PathVariable Long id) {
        return ResponseEntity.ok(anomalyDetectionService.nudgeRep(id));
    }

    @PostMapping({"/{id}/escalate", "/flags/{id}/escalate"})
    @Operation(summary = "Escalate an at-risk deal to Sales VP and Commercial Finance")
    public ResponseEntity<Map<String, Object>> escalateFlag(@PathVariable Long id) {
        return ResponseEntity.ok(anomalyDetectionService.escalateFlag(id));
    }

    @PostMapping({"/{id}/resolve", "/flags/{id}/resolve"})
    @Operation(summary = "Mark a deal health flag as resolved")
    public ResponseEntity<DealHealthFlag> resolveFlag(
            @PathVariable Long id,
            @RequestParam(required = false) String actionTaken,
            @RequestBody(required = false) Map<String, String> body) {
        String resolution = actionTaken;
        if (body != null) {
            if (body.containsKey("actionTaken")) resolution = body.get("actionTaken");
            else if (body.containsKey("notes")) resolution = body.get("notes");
            else if (body.containsKey("resolution")) resolution = body.get("resolution");
        }
        if (resolution == null || resolution.isBlank()) {
            resolution = "Resolved via manager intervention";
        }
        return ResponseEntity.ok(anomalyDetectionService.resolveFlag(id, resolution));
    }
}
