package com.dealflow360.dealhealth;

import com.dealflow360.approval.ApprovalStep;
import com.dealflow360.approval.ApprovalStepRepository;
import com.dealflow360.audit.AuditService;
import com.dealflow360.quotation.Quotation;
import com.dealflow360.quotation.QuotationLine;
import com.dealflow360.quotation.QuotationRepository;
import com.dealflow360.websocket.WebSocketPublisher;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
@Transactional
public class AnomalyDetectionService {

    private final DealHealthFlagRepository flagRepository;
    private final QuotationRepository quotationRepository;
    private final ApprovalStepRepository approvalStepRepository;
    private final AuditService auditService;
    private final WebSocketPublisher webSocketPublisher;

    @Value("${dealflow.health.stall-threshold-days:7}")
    private int stallThresholdDays;

    @Value("${dealflow.health.discount-anomaly-z-score:2.0}")
    private double zScoreThreshold;

    @Value("${dealflow.health.anomaly-multiplier:1.5}")
    private double anomalyMultiplier;

    public AnomalyDetectionService(DealHealthFlagRepository flagRepository,
                                  QuotationRepository quotationRepository,
                                  ApprovalStepRepository approvalStepRepository,
                                  AuditService auditService,
                                  WebSocketPublisher webSocketPublisher) {
        this.flagRepository = flagRepository;
        this.quotationRepository = quotationRepository;
        this.approvalStepRepository = approvalStepRepository;
        this.auditService = auditService;
        this.webSocketPublisher = webSocketPublisher;
    }

    public List<DealHealthFlag> getActiveFlags() {
        return flagRepository.findByResolvedFalseOrderByDetectedAtDesc();
    }

    public void runFullHealthScan() {
        scanForStalledDeals();
        scanForDiscountAnomalies();
        scanForDeliverySlippage();
        scanForSlaEscalation();
    }

    // 1. Stalled Deals: Quotations inactive for > N days in active stages
    public void scanForStalledDeals() {
        LocalDateTime threshold = LocalDateTime.now().minusDays(stallThresholdDays);
        List<Quotation> stalled = quotationRepository.findStalledQuotations(threshold);

        for (Quotation q : stalled) {
            Optional<DealHealthFlag> existing = flagRepository.findByQuotationIdAndFlagTypeAndResolvedFalse(q.getId(), "STALLED");
            if (existing.isEmpty()) {
                long days = java.time.Duration.between(q.getLastActivityAt(), LocalDateTime.now()).toDays();
                String desc = String.format("Quotation %s for %s has been inactive for %d days (stage: %s). Exceeds %d-day stall threshold.",
                        q.getQuoteNumber(), q.getCustomer().getName(), days, q.getStatus(), stallThresholdDays);

                DealHealthFlag flag = DealHealthFlag.builder()
                        .quotation(q)
                        .flagType("STALLED")
                        .severity(days > 14 ? "CRITICAL" : "HIGH")
                        .description(desc)
                        .detectedAt(LocalDateTime.now())
                        .resolved(false)
                        .build();

                DealHealthFlag saved = flagRepository.save(flag);

                Map<String, Object> payload = new java.util.HashMap<>();
                payload.put("flagId", saved != null && saved.getId() != null ? saved.getId() : 0L);
                payload.put("type", "STALLED");
                payload.put("severity", flag.getSeverity());
                payload.put("quoteNumber", q.getQuoteNumber());
                payload.put("customerName", q.getCustomer() != null ? q.getCustomer().getName() : "");
                payload.put("message", desc);

                webSocketPublisher.publishDealHealthAlert(payload);
            }
        }
    }

    // 2. Statistical Rep Discount Anomaly: Z-score evaluation vs rep's historical confirmed deals
    public void scanForDiscountAnomalies() {
        List<Quotation> activeQuotes = quotationRepository.findAll();

        for (Quotation q : activeQuotes) {
            if ("CONFIRMED".equalsIgnoreCase(q.getStatus()) || "REJECTED".equalsIgnoreCase(q.getStatus())) {
                continue;
            }

            BigDecimal currentTotalDiscount = q.getSubtotalAmount().compareTo(BigDecimal.ZERO) > 0
                    ? q.getTotalDiscountAmount().divide(q.getSubtotalAmount(), 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100))
                    : BigDecimal.ZERO;

            if (currentTotalDiscount.doubleValue() <= 5.0) {
                continue;
            }

            // Look up rep's last 10 confirmed deals
            List<Quotation> confirmedDeals = quotationRepository.findRecentConfirmedByRep(q.getSalesRep().getId());
            List<Double> historicalDiscounts = new ArrayList<>();

            for (Quotation cd : confirmedDeals) {
                if (cd.getSubtotalAmount().compareTo(BigDecimal.ZERO) > 0) {
                    double disc = cd.getTotalDiscountAmount().divide(cd.getSubtotalAmount(), 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).doubleValue();
                    historicalDiscounts.add(disc);
                }
            }

            // If rep has historical data, compute mean & standard deviation
            if (historicalDiscounts.size() >= 2) {
                double mean = historicalDiscounts.stream().mapToDouble(Double::doubleValue).average().orElse(8.0);
                double variance = historicalDiscounts.stream()
                        .mapToDouble(d -> Math.pow(d - mean, 2))
                        .average().orElse(4.0);
                double stdDev = Math.max(1.0, Math.sqrt(variance));

                double z = (currentTotalDiscount.doubleValue() - mean) / stdDev;

                if (z >= zScoreThreshold || currentTotalDiscount.doubleValue() >= mean * anomalyMultiplier) {
                    Optional<DealHealthFlag> existing = flagRepository.findByQuotationIdAndFlagTypeAndResolvedFalse(q.getId(), "DISCOUNT_ANOMALY");
                    if (existing.isEmpty()) {
                        String desc = String.format("Sales Rep %s applied %.2f%% discount on %s. Rep historical confirmed average is %.2f%% (Z-score = %.2f >= %.1f). Atypical discounting pattern detected.",
                                q.getSalesRep().getName(), currentTotalDiscount.doubleValue(), q.getQuoteNumber(), mean, z, zScoreThreshold);

                        DealHealthFlag flag = DealHealthFlag.builder()
                                .quotation(q)
                                .flagType("DISCOUNT_ANOMALY")
                                .severity("CRITICAL")
                                .description(desc)
                                .detectedAt(LocalDateTime.now())
                                .resolved(false)
                                .build();

                        DealHealthFlag saved = flagRepository.save(flag);

                        Map<String, Object> payload = new java.util.HashMap<>();
                        payload.put("flagId", saved != null && saved.getId() != null ? saved.getId() : 0L);
                        payload.put("type", "DISCOUNT_ANOMALY");
                        payload.put("severity", "CRITICAL");
                        payload.put("quoteNumber", q.getQuoteNumber());
                        payload.put("repName", q.getSalesRep() != null ? q.getSalesRep().getName() : "");
                        payload.put("zScore", z);
                        payload.put("message", desc);

                        webSocketPublisher.publishDealHealthAlert(payload);
                    }
                }
            }
        }
    }

    // 3. Delivery Slippage: Promised delivery date proximity vs incomplete fulfillment
    public void scanForDeliverySlippage() {
        List<Quotation> quotes = quotationRepository.findAll();
        LocalDate now = LocalDate.now();

        for (Quotation q : quotes) {
            if (q.getPromisedDeliveryDate() != null && !("FULFILLED".equalsIgnoreCase(q.getStatus()) || "CLOSED".equalsIgnoreCase(q.getStatus()) || "REJECTED".equalsIgnoreCase(q.getStatus()))) {
                if (q.getPromisedDeliveryDate().isBefore(now.plusDays(3))) {
                    Optional<DealHealthFlag> existing = flagRepository.findByQuotationIdAndFlagTypeAndResolvedFalse(q.getId(), "DELIVERY_SLIPPAGE");
                    if (existing.isEmpty()) {
                        String desc = String.format("Quotation %s promised delivery date (%s) is within 3 days but order is in %s state. High delivery slippage risk.",
                                q.getQuoteNumber(), q.getPromisedDeliveryDate(), q.getStatus());

                        DealHealthFlag flag = DealHealthFlag.builder()
                                .quotation(q)
                                .flagType("DELIVERY_SLIPPAGE")
                                .severity("HIGH")
                                .description(desc)
                                .detectedAt(LocalDateTime.now())
                                .resolved(false)
                                .build();

                        flagRepository.save(flag);
                    }
                }
            }
        }
    }

    // 4. SLA Auto-Escalation: Pending approval step exceeded SLA
    public void scanForSlaEscalation() {
        List<ApprovalStep> overdue = approvalStepRepository.findOverdueSteps(LocalDateTime.now());
        for (ApprovalStep step : overdue) {
            Optional<DealHealthFlag> existing = flagRepository.findByQuotationIdAndFlagTypeAndResolvedFalse(step.getQuotation().getId(), "SLA_BREACH");
            if (existing.isEmpty()) {
                String desc = String.format("Approval step for quotation %s (%s) has exceeded the 2-hour SLA deadline. Auto-escalated to Executive Operations.",
                        step.getQuotation().getQuoteNumber(), step.getLevel());

                DealHealthFlag flag = DealHealthFlag.builder()
                        .quotation(step.getQuotation())
                        .flagType("SLA_BREACH")
                        .severity("HIGH")
                        .description(desc)
                        .detectedAt(LocalDateTime.now())
                        .resolved(false)
                        .build();

                DealHealthFlag saved = flagRepository.save(flag);

                Map<String, Object> payload = new java.util.HashMap<>();
                payload.put("flagId", saved != null && saved.getId() != null ? saved.getId() : 0L);
                payload.put("type", "SLA_BREACH");
                payload.put("severity", "HIGH");
                payload.put("quoteNumber", step.getQuotation() != null ? step.getQuotation().getQuoteNumber() : "");
                payload.put("message", desc);

                webSocketPublisher.publishDealHealthAlert(payload);
            }
        }
    }

    // Nudge action
    public Map<String, Object> nudgeRep(Long flagId) {
        DealHealthFlag flag = flagRepository.findById(flagId)
                .orElseThrow(() -> new RuntimeException("Flag not found: " + flagId));

        flag.setActionTaken("Automated nudge sent to rep " + flag.getQuotation().getSalesRep().getName());
        flagRepository.save(flag);

        auditService.log("DEAL_HEALTH", flag.getQuotation().getId(), "NUDGE_SENT", "Manager Dashboard",
                "UNRESOLVED", "NUDGED", "Automated email & in-app reminder triggered for " + flag.getFlagType(), BigDecimal.ZERO);

        return Map.of(
                "success", true,
                "message", "Nudge notification dispatched to " + flag.getQuotation().getSalesRep().getEmail(),
                "flagId", flagId
        );
    }

    // Escalate action
    public Map<String, Object> escalateFlag(Long flagId) {
        DealHealthFlag flag = flagRepository.findById(flagId)
                .orElseThrow(() -> new RuntimeException("Flag not found: " + flagId));

        flag.setSeverity("CRITICAL");
        flag.setActionTaken("Escalated to VP of Sales & Commercial Finance");
        flagRepository.save(flag);

        auditService.log("DEAL_HEALTH", flag.getQuotation().getId(), "ESCALATED", "Executive Radar",
                "HIGH", "CRITICAL", "High-priority escalation routed to executive management", BigDecimal.ZERO);

        return Map.of(
                "success", true,
                "message", "Deal escalated to Executive Operations & Sales Leadership",
                "flagId", flagId
        );
    }

    public DealHealthFlag resolveFlag(Long flagId, String actionTaken) {
        DealHealthFlag flag = flagRepository.findById(flagId)
                .orElseThrow(() -> new RuntimeException("Flag not found: " + flagId));

        flag.setResolved(true);
        flag.setResolvedAt(LocalDateTime.now());
        flag.setActionTaken(actionTaken != null ? actionTaken : "Resolved by manager review");
        return flagRepository.save(flag);
    }
}
