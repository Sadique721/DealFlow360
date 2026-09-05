package com.dealflow360.audit;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@Transactional
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    public AuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public void log(String entityType, Long entityId, String action, String performedBy,
                    String beforeState, String afterState, String reason, BigDecimal marginDelta) {
        BigDecimal safeDelta = marginDelta;
        if (safeDelta != null && safeDelta.abs().compareTo(BigDecimal.valueOf(999.99)) > 0) {
            safeDelta = safeDelta.compareTo(BigDecimal.ZERO) >= 0 ? BigDecimal.valueOf(999.99) : BigDecimal.valueOf(-999.99);
        }

        AuditLog entry = AuditLog.builder()
                .entityType(entityType)
                .entityId(entityId)
                .action(action)
                .performedBy(performedBy != null ? performedBy : "System")
                .beforeState(beforeState)
                .afterState(afterState)
                .reason(reason)
                .marginDelta(safeDelta)
                .build();
        auditLogRepository.save(entry);
    }

    public List<AuditLog> getLogsForEntity(String entityType, Long entityId) {
        return auditLogRepository.findByEntityTypeAndEntityIdOrderByTimestampDesc(entityType, entityId);
    }

    public List<AuditLog> getRecentLogs() {
        return auditLogRepository.findTop50ByOrderByTimestampDesc();
    }
}
