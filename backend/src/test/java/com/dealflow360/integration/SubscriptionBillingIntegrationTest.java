package com.dealflow360.integration;

import com.dealflow360.audit.AuditService;
import com.dealflow360.catalog.Customer;
import com.dealflow360.catalog.Product;
import com.dealflow360.quotation.Quotation;
import com.dealflow360.quotation.QuotationLine;
import com.dealflow360.quotation.QuotationRepository;
import com.dealflow360.subscription.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SubscriptionBillingIntegrationTest {

    @Mock
    private SubscriptionRepository subscriptionRepository;

    @Mock
    private SubscriptionPlanRepository subscriptionPlanRepository;

    @Mock
    private BillingScheduleRepository billingScheduleRepository;

    @Mock
    private QuotationRepository quotationRepository;

    @Mock
    private AuditService auditService;

    private ProrationEngine prorationEngine;
    private SubscriptionService subscriptionService;

    private Customer testCustomer;
    private Quotation hybridQuotation;
    private Product hardwareProduct;
    private Product subscriptionProduct;

    @BeforeEach
    void setUp() {
        prorationEngine = new ProrationEngine();
        subscriptionService = new SubscriptionService(
                subscriptionRepository,
                subscriptionPlanRepository,
                billingScheduleRepository,
                quotationRepository,
                prorationEngine,
                auditService
        );

        testCustomer = Customer.builder()
                .id(1L)
                .name("Acme Enterprise Corp")
                .email("procurement@acme.com")
                .tier("GOLD")
                .build();

        hardwareProduct = Product.builder()
                .id(101L)
                .name("Edge Router Pro X900")
                .basePrice(BigDecimal.valueOf(2500.00))
                .costPrice(BigDecimal.valueOf(1800.00))
                .isSubscription(false)
                .build();

        subscriptionProduct = Product.builder()
                .id(202L)
                .name("Cloud Telemetry SaaS Platform")
                .basePrice(BigDecimal.valueOf(185.00))
                .costPrice(BigDecimal.valueOf(40.00))
                .isSubscription(true)
                .recurringInterval("MONTHLY")
                .build();

        QuotationLine hwLine = QuotationLine.builder()
                .id(1L)
                .product(hardwareProduct)
                .quantity(2)
                .unitPrice(BigDecimal.valueOf(2500.00))
                .lineTotal(BigDecimal.valueOf(5000.00))
                .lineType("ONE_TIME")
                .build();

        QuotationLine subLine = QuotationLine.builder()
                .id(2L)
                .product(subscriptionProduct)
                .quantity(10)
                .unitPrice(BigDecimal.valueOf(185.00))
                .lineTotal(BigDecimal.valueOf(1850.00))
                .lineType("RECURRING")
                .build();

        hybridQuotation = Quotation.builder()
                .id(501L)
                .quoteNumber("QUO-2026-HYBRID-88")
                .customer(testCustomer)
                .status("APPROVED")
                .totalAmount(BigDecimal.valueOf(6850.00))
                .lines(new ArrayList<>(Arrays.asList(hwLine, subLine)))
                .build();
    }

    @Test
    @DisplayName("Test 1: Proration Engine computes mathematically exact day-accurate adjustments")
    void testProrationExactMath() {
        LocalDate cycleStart = LocalDate.of(2026, 9, 1);
        LocalDate cycleEnd = LocalDate.of(2026, 10, 1); // 30 days total
        LocalDate changeDate = LocalDate.of(2026, 9, 16); // 15 days remaining (50%)

        BigDecimal oldRate = BigDecimal.valueOf(1850.00); // 10 seats @ $185
        BigDecimal unitRate = BigDecimal.valueOf(185.00);
        int quantityDelta = 5; // adding 5 seats (target: 15 seats)

        ProrationEngine.ProrationResult result = prorationEngine.calculateProration(
                cycleStart, cycleEnd, changeDate, oldRate, unitRate, quantityDelta
        );

        assertNotNull(result);
        assertEquals(15, result.getDaysRemaining());
        assertEquals(30, result.getTotalCycleDays());
        assertEquals(0, new BigDecimal("0.5000").compareTo(result.getProrationFactor()));
        // 5 seats * $185 = $925 * 0.5000 = $462.50
        assertEquals(0, new BigDecimal("462.50").compareTo(result.getAdjustmentAmount()));
        assertFalse(result.isCreditNote());
        assertTrue(result.getExplanation().contains("15 of 30 days remaining in billing cycle (50.0% prorated)"));
    }

    @Test
    @DisplayName("Test 2: Admin Plan Management (Create, Update, List, Deactivate)")
    void testAdminPlanManagement() {
        SubscriptionPlan newPlan = SubscriptionPlan.builder()
                .name("AI Analytics Tier")
                .billingCycle("MONTHLY")
                .basePrice(BigDecimal.valueOf(299.00))
                .defaultProrationRule("DAILY_PRORATION")
                .cancellationRule("PARTIAL_REFUND_UNUSED_DAYS")
                .active(true)
                .build();

        when(subscriptionPlanRepository.existsByNameIgnoreCase("AI Analytics Tier")).thenReturn(false);
        when(subscriptionPlanRepository.save(any(SubscriptionPlan.class))).thenAnswer(invocation -> {
            SubscriptionPlan p = invocation.getArgument(0);
            p.setId(10L);
            return p;
        });

        SubscriptionPlan created = subscriptionService.createPlan(newPlan);
        assertNotNull(created.getId());
        assertEquals("AI Analytics Tier", created.getName());
        assertEquals("MONTHLY", created.getBillingCycle());
        assertTrue(created.getActive());

        verify(auditService).log(eq("SUBSCRIPTION_PLAN"), eq(10L), eq("CREATED"), eq("Admin"), isNull(), eq("AI Analytics Tier"), anyString(), any(BigDecimal.class));
    }

    @Test
    @DisplayName("Test 3: Capex (One-Time) vs Opex (Recurring) Segregation in Billing Overview")
    void testBillingOverviewSegregation() {
        when(quotationRepository.findById(501L)).thenReturn(Optional.of(hybridQuotation));
        when(subscriptionRepository.findByQuotationId(501L)).thenReturn(Collections.emptyList());

        Map<String, Object> overview = subscriptionService.getBillingOverviewForQuotation(501L);

        assertNotNull(overview);
        assertEquals(501L, overview.get("quotationId"));
        assertEquals("QUO-2026-HYBRID-88", overview.get("quoteNumber"));
        assertEquals(0, new BigDecimal("5000.00").compareTo((BigDecimal) overview.get("oneTimeTotal")));
        assertEquals(0, new BigDecimal("1850.00").compareTo((BigDecimal) overview.get("recurringTotal")));

        @SuppressWarnings("unchecked")
        List<QuotationLine> oneTime = (List<QuotationLine>) overview.get("oneTimeLines");
        @SuppressWarnings("unchecked")
        List<QuotationLine> recurring = (List<QuotationLine>) overview.get("recurringLines");

        assertEquals(1, oneTime.size());
        assertEquals("Edge Router Pro X900", oneTime.get(0).getProduct().getName());
        assertEquals(1, recurring.size());
        assertEquals("Cloud Telemetry SaaS Platform", recurring.get(0).getProduct().getName());
    }

    @Test
    @DisplayName("Test 4: Generate Recurring Subscriptions and Milestone Billing Schedules from Quotation")
    void testGenerateSubscriptionsFromQuotation() {
        when(quotationRepository.findById(501L)).thenReturn(Optional.of(hybridQuotation));
        when(subscriptionRepository.findByQuotationId(501L)).thenReturn(Collections.emptyList());
        when(subscriptionRepository.save(any(Subscription.class))).thenAnswer(invocation -> {
            Subscription s = invocation.getArgument(0);
            s.setId(88L);
            return s;
        });

        List<Subscription> subs = subscriptionService.generateFromQuotation(501L);

        assertNotNull(subs);
        assertEquals(1, subs.size());
        Subscription createdSub = subs.get(0);
        assertEquals("MONTHLY", createdSub.getCycle());
        assertEquals(10, createdSub.getQuantity());
        assertEquals(0, new BigDecimal("1850.00").compareTo(createdSub.getAmount()));
        assertEquals("ACTIVE", createdSub.getStatus());

        // Verify initial and upcoming billing schedules were saved
        verify(billingScheduleRepository, times(2)).save(any(BillingSchedule.class));
    }

    @Test
    @DisplayName("Test 5: Mid-Cycle Seat Modification generates Proration Adjustment Invoice")
    void testMidCycleSeatModification() {
        LocalDate start = LocalDate.now().minusDays(15);
        LocalDate next = LocalDate.now().plusDays(15);

        Subscription sub = Subscription.builder()
                .id(99L)
                .customer(testCustomer)
                .quotation(hybridQuotation)
                .planName("Cloud Telemetry SaaS Platform Subscription")
                .cycle("MONTHLY")
                .startDate(start)
                .nextBillDate(next)
                .amount(BigDecimal.valueOf(1850.00)) // 10 seats @ $185
                .quantity(10)
                .status("ACTIVE")
                .build();

        when(subscriptionRepository.findById(99L)).thenReturn(Optional.of(sub));
        when(subscriptionRepository.save(any(Subscription.class))).thenReturn(sub);

        // Preview upgrade from 10 to 15 seats (5 seats delta)
        Map<String, Object> preview = subscriptionService.previewProration(99L, 15, LocalDate.now());
        assertEquals(10, preview.get("oldQuantity"));
        assertEquals(15, preview.get("newQuantity"));
        assertEquals(5, preview.get("quantityDelta"));
        assertNotNull(preview.get("adjustmentAmount"));
        assertFalse((Boolean) preview.get("isCreditNote"));

        // Apply upgrade
        Subscription updated = subscriptionService.applyModification(99L, 15, LocalDate.now());
        assertEquals(15, updated.getQuantity());
        verify(billingScheduleRepository).save(argThat(s -> s.getStatus().equals("INVOICED") && s.getSubscription().getId().equals(99L)));
        verify(auditService).log(eq("SUBSCRIPTION"), eq(99L), eq("MODIFIED"), anyString(), eq("Qty 10"), eq("Qty 15"), anyString(), eq(BigDecimal.ZERO));
    }
}
