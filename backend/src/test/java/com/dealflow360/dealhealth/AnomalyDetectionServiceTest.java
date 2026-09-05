package com.dealflow360.dealhealth;

import com.dealflow360.approval.ApprovalStepRepository;
import com.dealflow360.audit.AuditService;
import com.dealflow360.auth.User;
import com.dealflow360.catalog.Customer;
import com.dealflow360.quotation.Quotation;
import com.dealflow360.quotation.QuotationRepository;
import com.dealflow360.websocket.WebSocketPublisher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AnomalyDetectionServiceTest {

    private AnomalyDetectionService service;
    private DealHealthFlagRepository flagRepository;
    private QuotationRepository quotationRepository;
    private ApprovalStepRepository approvalStepRepository;
    private AuditService auditService;
    private WebSocketPublisher webSocketPublisher;

    @BeforeEach
    void setUp() {
        flagRepository = mock(DealHealthFlagRepository.class);
        quotationRepository = mock(QuotationRepository.class);
        approvalStepRepository = mock(ApprovalStepRepository.class);
        auditService = mock(AuditService.class);
        webSocketPublisher = mock(WebSocketPublisher.class);

        service = new AnomalyDetectionService(
                flagRepository, quotationRepository, approvalStepRepository, auditService, webSocketPublisher);

        ReflectionTestUtils.setField(service, "stallThresholdDays", 7);
        ReflectionTestUtils.setField(service, "zScoreThreshold", 2.0);
        ReflectionTestUtils.setField(service, "anomalyMultiplier", 1.5);

        when(flagRepository.save(any())).thenAnswer(invocation -> {
            DealHealthFlag f = invocation.getArgument(0);
            if (f.getId() == null) {
                f.setId(100L);
            }
            return f;
        });
    }

    @Test
    @DisplayName("Flags stalled deals exceeding 7 days of inactivity")
    void testStalledDealDetection() {
        Customer customer = Customer.builder().id(1L).name("Zenith Systems").build();
        User rep = User.builder().id(2L).name("Jay Rao").build();

        Quotation stalledQuote = Quotation.builder()
                .id(10L)
                .quoteNumber("Q-1030")
                .customer(customer)
                .salesRep(rep)
                .status("UNDER_NEGOTIATION")
                .lastActivityAt(LocalDateTime.now().minusDays(9))
                .build();

        when(quotationRepository.findStalledQuotations(any())).thenReturn(List.of(stalledQuote));
        when(flagRepository.findByQuotationIdAndFlagTypeAndResolvedFalse(10L, "STALLED"))
                .thenReturn(Optional.empty());

        service.scanForStalledDeals();

        ArgumentCaptor<DealHealthFlag> captor = ArgumentCaptor.forClass(DealHealthFlag.class);
        verify(flagRepository, times(1)).save(captor.capture());

        DealHealthFlag saved = captor.getValue();
        assertEquals("STALLED", saved.getFlagType());
        assertEquals("HIGH", saved.getSeverity());
        assertTrue(saved.getDescription().contains("Q-1030"));
    }

    @Test
    @DisplayName("Detects Z-score outlier discount above 2.0 standard deviations")
    void testStatisticalDiscountAnomaly() {
        Customer customer = Customer.builder().id(2L).name("Delta LLC").build();
        User rep = User.builder().id(3L).name("Samir Patel").build();

        // Current quotation: $2800 subtotal, $672 discount -> 24% discount
        Quotation currentQuote = Quotation.builder()
                .id(11L)
                .quoteNumber("Q-1041")
                .customer(customer)
                .salesRep(rep)
                .status("DRAFT")
                .subtotalAmount(BigDecimal.valueOf(2800.00))
                .totalDiscountAmount(BigDecimal.valueOf(672.00))
                .totalAmount(BigDecimal.valueOf(2128.00))
                .build();

        // Historical deals for Samir: average discount is ~8% (8%, 9%, 7%, 8%)
        Quotation h1 = Quotation.builder().subtotalAmount(BigDecimal.valueOf(1000)).totalDiscountAmount(BigDecimal.valueOf(80)).build();
        Quotation h2 = Quotation.builder().subtotalAmount(BigDecimal.valueOf(1000)).totalDiscountAmount(BigDecimal.valueOf(90)).build();
        Quotation h3 = Quotation.builder().subtotalAmount(BigDecimal.valueOf(1000)).totalDiscountAmount(BigDecimal.valueOf(70)).build();
        Quotation h4 = Quotation.builder().subtotalAmount(BigDecimal.valueOf(1000)).totalDiscountAmount(BigDecimal.valueOf(80)).build();

        when(quotationRepository.findAll()).thenReturn(List.of(currentQuote));
        when(quotationRepository.findRecentConfirmedByRep(3L)).thenReturn(List.of(h1, h2, h3, h4));
        when(flagRepository.findByQuotationIdAndFlagTypeAndResolvedFalse(11L, "DISCOUNT_ANOMALY"))
                .thenReturn(Optional.empty());

        service.scanForDiscountAnomalies();

        ArgumentCaptor<DealHealthFlag> captor = ArgumentCaptor.forClass(DealHealthFlag.class);
        verify(flagRepository, times(1)).save(captor.capture());

        DealHealthFlag saved = captor.getValue();
        assertEquals("DISCOUNT_ANOMALY", saved.getFlagType());
        assertEquals("CRITICAL", saved.getSeverity());
        assertTrue(saved.getDescription().contains("Z-score"));
    }
}
