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

    @GetMapping
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

    @PostMapping("/{id}/nudge")
    @Operation(summary = "Send an automated nudge to the responsible sales rep for a stalled or at-risk deal")
    public ResponseEntity<Map<String, Object>> nudgeRep(@PathVariable Long id) {
        return ResponseEntity.ok(anomalyDetectionService.nudgeRep(id));
    }

    @PostMapping("/{id}/escalate")
    @Operation(summary = "Escalate an at-risk deal to Sales VP and Commercial Finance")
    public ResponseEntity<Map<String, Object>> escalateFlag(@PathVariable Long id) {
        return ResponseEntity.ok(anomalyDetectionService.escalateFlag(id));
    }

    @PostMapping("/{id}/resolve")
    @Operation(summary = "Mark a deal health flag as resolved")
    public ResponseEntity<DealHealthFlag> resolveFlag(
            @PathVariable Long id,
            @RequestParam(defaultValue = "Resolved via manager intervention") String actionTaken) {
        return ResponseEntity.ok(anomalyDetectionService.resolveFlag(id, actionTaken));
    }
}
