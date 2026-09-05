package com.dealflow360.audit;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/audit")
@Tag(name = "Audit Trail", description = "Immutable audit timeline of deal edits, approvals, and margin deltas")
public class AuditController {

    private final AuditService auditService;

    public AuditController(AuditService auditService) {
        this.auditService = auditService;
    }

    @GetMapping("/entity/{entityType}/{entityId}")
    @Operation(summary = "Get audit logs for a specific entity (e.g. QUOTATION, 1)")
    public ResponseEntity<List<AuditLog>> getEntityLogs(@PathVariable String entityType, @PathVariable Long entityId) {
        return ResponseEntity.ok(auditService.getLogsForEntity(entityType, entityId));
    }

    @GetMapping
    @Operation(summary = "Get system-wide audit activity")
    public ResponseEntity<List<AuditLog>> getAllLogs() {
        return ResponseEntity.ok(auditService.getRecentLogs());
    }

    @GetMapping("/recent")
    @Operation(summary = "Get recent system-wide audit activity")
    public ResponseEntity<List<AuditLog>> getRecentLogs() {
        return ResponseEntity.ok(auditService.getRecentLogs());
    }
}
