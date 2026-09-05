package com.dealflow360.subscription;

import com.dealflow360.audit.AuditService;
import com.dealflow360.quotation.Quotation;
import com.dealflow360.quotation.QuotationLine;
import com.dealflow360.quotation.QuotationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
@Transactional
public class SubscriptionService {

    private final SubscriptionRepository subscriptionRepository;
    private final SubscriptionPlanRepository subscriptionPlanRepository;
    private final BillingScheduleRepository billingScheduleRepository;
    private final QuotationRepository quotationRepository;
    private final ProrationEngine prorationEngine;
    private final AuditService auditService;

    public SubscriptionService(SubscriptionRepository subscriptionRepository,
                               SubscriptionPlanRepository subscriptionPlanRepository,
                               BillingScheduleRepository billingScheduleRepository,
                               QuotationRepository quotationRepository,
                               ProrationEngine prorationEngine,
                               AuditService auditService) {
        this.subscriptionRepository = subscriptionRepository;
        this.subscriptionPlanRepository = subscriptionPlanRepository;
        this.billingScheduleRepository = billingScheduleRepository;
        this.quotationRepository = quotationRepository;
        this.prorationEngine = prorationEngine;
        this.auditService = auditService;
    }

    public List<SubscriptionPlan> listPlans() {
        return subscriptionPlanRepository.findAll();
    }

    public List<Subscription> listSubscriptions(Long customerId) {
        if (customerId != null) {
            return subscriptionRepository.findByCustomerId(customerId);
        }
        return subscriptionRepository.findAll();
    }

    public Subscription getSubscriptionById(Long id) {
        return subscriptionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Subscription not found: " + id));
    }

    public List<BillingSchedule> getSchedules(Long subscriptionId) {
        return billingScheduleRepository.findBySubscriptionIdOrderByBillingDateAsc(subscriptionId);
    }

    public List<Subscription> createSubscriptionsFromQuotation(Quotation quotation) {
        List<Subscription> created = new ArrayList<>();
        LocalDate now = LocalDate.now();

        for (QuotationLine line : quotation.getLines()) {
            if ("RECURRING".equalsIgnoreCase(line.getLineType()) || (line.getProduct().getIsSubscription() != null && line.getProduct().getIsSubscription())) {
                String planName = line.getProduct().getName() + " Subscription";
                String cycle = line.getProduct().getRecurringInterval() != null ? line.getProduct().getRecurringInterval() : "MONTHLY";

                LocalDate nextBillDate = "YEARLY".equalsIgnoreCase(cycle) ? now.plusYears(1)
                        : "QUARTERLY".equalsIgnoreCase(cycle) ? now.plusMonths(3)
                        : now.plusMonths(1);

                Subscription sub = Subscription.builder()
                        .customer(quotation.getCustomer())
                        .quotation(quotation)
                        .quotationLineId(line.getId())
                        .planName(planName)
                        .cycle(cycle)
                        .startDate(now)
                        .nextBillDate(nextBillDate)
                        .amount(line.getLineTotal())
                        .quantity(line.getQuantity())
                        .status("ACTIVE")
                        .build();

                sub = subscriptionRepository.save(sub);

                // Create initial billing milestone + upcoming schedule
                BillingSchedule initialMilestone = BillingSchedule.builder()
                        .subscription(sub)
                        .quotationLineId(line.getId())
                        .billingDate(now)
                        .amount(line.getLineTotal())
                        .status("PAID")
                        .prorationFactor(BigDecimal.valueOf(1.0000))
                        .prorationNote("Initial billing cycle confirmation")
                        .build();
                billingScheduleRepository.save(initialMilestone);

                BillingSchedule upcomingMilestone = BillingSchedule.builder()
                        .subscription(sub)
                        .quotationLineId(line.getId())
                        .billingDate(nextBillDate)
                        .amount(line.getLineTotal())
                        .status("PENDING")
                        .prorationFactor(BigDecimal.valueOf(1.0000))
                        .prorationNote("Upcoming scheduled recurring charge")
                        .build();
                billingScheduleRepository.save(upcomingMilestone);

                sub.getSchedules().add(initialMilestone);
                sub.getSchedules().add(upcomingMilestone);
                created.add(sub);
            }
        }

        return created;
    }

    public Map<String, Object> previewProration(Long subscriptionId, int newQuantity, LocalDate changeDate) {
        Subscription sub = getSubscriptionById(subscriptionId);
        if (changeDate == null) changeDate = LocalDate.now();

        int delta = newQuantity - sub.getQuantity();
        BigDecimal unitRate = sub.getAmount().divide(BigDecimal.valueOf(Math.max(1, sub.getQuantity())), 2, java.math.RoundingMode.HALF_UP);

        LocalDate cycleStart = sub.getStartDate();
        LocalDate cycleEnd = sub.getNextBillDate();

        ProrationEngine.ProrationResult result = prorationEngine.calculateProration(
                cycleStart, cycleEnd, changeDate, sub.getAmount(), unitRate, delta);

        Map<String, Object> preview = new HashMap<>();
        preview.put("subscriptionId", subscriptionId);
        preview.put("oldQuantity", sub.getQuantity());
        preview.put("newQuantity", newQuantity);
        preview.put("quantityDelta", delta);
        preview.put("daysRemaining", result.getDaysRemaining());
        preview.put("totalCycleDays", result.getTotalCycleDays());
        preview.put("prorationFactor", result.getProrationFactor());
        preview.put("adjustmentAmount", result.getAdjustmentAmount());
        preview.put("isCreditNote", result.isCreditNote());
        preview.put("explanation", result.getExplanation());

        return preview;
    }

    public Subscription applyModification(Long subscriptionId, int newQuantity, LocalDate changeDate) {
        Subscription sub = getSubscriptionById(subscriptionId);
        var preview = previewProration(subscriptionId, newQuantity, changeDate);

        BigDecimal adjustment = (BigDecimal) preview.get("adjustmentAmount");
        boolean isCreditNote = (boolean) preview.get("isCreditNote");
        String explanation = (String) preview.get("explanation");

        // Create adjustment billing schedule
        BillingSchedule adjSchedule = BillingSchedule.builder()
                .subscription(sub)
                .billingDate(LocalDate.now())
                .amount(adjustment)
                .status("INVOICED")
                .prorationFactor((BigDecimal) preview.get("prorationFactor"))
                .prorationNote(explanation)
                .build();
        billingScheduleRepository.save(adjSchedule);

        sub.setQuantity(newQuantity);
        sub.setUpdatedAt(LocalDateTime.now());
        subscriptionRepository.save(sub);

        auditService.log("SUBSCRIPTION", sub.getId(), "MODIFIED", "Finance / Ops",
                "Qty " + preview.get("oldQuantity"), "Qty " + newQuantity, explanation, BigDecimal.ZERO);

        return sub;
    }

    public Subscription cancelSubscription(Long subscriptionId, LocalDate cancelDate, String reason) {
        Subscription sub = getSubscriptionById(subscriptionId);
        if (cancelDate == null) cancelDate = LocalDate.now();

        var preview = previewProration(subscriptionId, 0, cancelDate);
        String explanation = "Subscription cancelled: " + reason + ". " + preview.get("explanation");

        sub.setStatus("CANCELED");
        sub.setUpdatedAt(LocalDateTime.now());
        subscriptionRepository.save(sub);

        auditService.log("SUBSCRIPTION", sub.getId(), "CANCELED", "Finance Officer",
                "ACTIVE", "CANCELED", explanation, BigDecimal.ZERO);

        return sub;
    }

    public Map<String, Object> getBillingOverviewForQuotation(Long quotationId) {
        Quotation quotation = quotationRepository.findById(quotationId)
                .orElseThrow(() -> new RuntimeException("Quotation not found: " + quotationId));

        BigDecimal oneTimeTotal = BigDecimal.ZERO;
        BigDecimal recurringTotal = BigDecimal.ZERO;

        List<QuotationLine> oneTimeLines = new ArrayList<>();
        List<QuotationLine> recurringLines = new ArrayList<>();

        for (QuotationLine line : quotation.getLines()) {
            if ("RECURRING".equalsIgnoreCase(line.getLineType()) || (line.getProduct().getIsSubscription() != null && line.getProduct().getIsSubscription())) {
                recurringTotal = recurringTotal.add(line.getLineTotal());
                recurringLines.add(line);
            } else {
                oneTimeTotal = oneTimeTotal.add(line.getLineTotal());
                oneTimeLines.add(line);
            }
        }

        List<Subscription> subs = subscriptionRepository.findByQuotationId(quotationId);

        Map<String, Object> overview = new HashMap<>();
        overview.put("quotationId", quotationId);
        overview.put("quoteNumber", quotation.getQuoteNumber());
        overview.put("totalAmount", quotation.getTotalAmount());
        overview.put("oneTimeTotal", oneTimeTotal);
        overview.put("recurringTotal", recurringTotal);
        overview.put("oneTimeLines", oneTimeLines);
        overview.put("recurringLines", recurringLines);
        overview.put("subscriptions", subs);

        return overview;
    }
}
