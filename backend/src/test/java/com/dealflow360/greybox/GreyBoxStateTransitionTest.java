package com.dealflow360.greybox;

import com.dealflow360.approval.ApprovalRequestRepository;
import com.dealflow360.approval.ApprovalStepRepository;
import com.dealflow360.audit.AuditService;
import com.dealflow360.auth.User;
import com.dealflow360.auth.UserRepository;
import com.dealflow360.catalog.Category;
import com.dealflow360.catalog.Customer;
import com.dealflow360.catalog.CustomerRepository;
import com.dealflow360.catalog.CustomerTierRepository;
import com.dealflow360.catalog.Product;
import com.dealflow360.catalog.ProductRepository;
import com.dealflow360.discount.RiskScoreEngine;
import com.dealflow360.quotation.*;
import com.dealflow360.quotation.dto.LineItemRequest;
import com.dealflow360.websocket.WebSocketPublisher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Grey-Box Testing Suite:
 * Combines knowledge of internal database schemas, state machines, and audit logging
 * with external service invocations to verify systemic consistency.
 */
class GreyBoxStateTransitionTest {

    private QuotationService quotationService;
    private QuotationRepository quotationRepository;
    private QuotationLineRepository lineRepository;
    private QuotationVersionRepository versionRepository;
    private CustomerRepository customerRepository;
    private CustomerTierRepository customerTierRepository;
    private UserRepository userRepository;
    private ProductRepository productRepository;
    private RiskScoreEngine riskScoreEngine;
    private ApprovalRequestRepository approvalRequestRepository;
    private ApprovalStepRepository approvalStepRepository;
    private AuditService auditService;
    private WebSocketPublisher webSocketPublisher;

    @BeforeEach
    void setUp() {
        quotationRepository = Mockito.mock(QuotationRepository.class);
        lineRepository = Mockito.mock(QuotationLineRepository.class);
        versionRepository = Mockito.mock(QuotationVersionRepository.class);
        customerRepository = Mockito.mock(CustomerRepository.class);
        customerTierRepository = Mockito.mock(CustomerTierRepository.class);
        userRepository = Mockito.mock(UserRepository.class);
        productRepository = Mockito.mock(ProductRepository.class);
        approvalRequestRepository = Mockito.mock(ApprovalRequestRepository.class);
        approvalStepRepository = Mockito.mock(ApprovalStepRepository.class);
        auditService = Mockito.mock(AuditService.class);
        webSocketPublisher = Mockito.mock(WebSocketPublisher.class);
        riskScoreEngine = new RiskScoreEngine();

        quotationService = new QuotationService(
                quotationRepository, lineRepository, versionRepository,
                customerRepository, customerTierRepository, userRepository,
                productRepository, riskScoreEngine, approvalRequestRepository,
                approvalStepRepository, auditService, webSocketPublisher
        );
    }

    @Test
    @DisplayName("Grey-Box: Line edit increments version counter and persists JSON snapshot")
    void testVersionIncrementAndSnapshotPersistence() {
        Customer customer = Customer.builder().id(1L).name("Global Tech").tier("BRONZE").build();
        User rep = User.builder().id(2L).name("Samir").email("samir@dealflow360.com").build();
        Category cat = Category.builder().id(1L).name("Hardware").maxDiscountPercent(BigDecimal.valueOf(15)).build();
        Product prod = Product.builder().id(10L).name("Hub").category(cat).basePrice(BigDecimal.valueOf(200)).costPrice(BigDecimal.valueOf(100)).build();

        Quotation quote = Quotation.builder()
                .id(55L)
                .quoteNumber("Q-1055")
                .customer(customer)
                .salesRep(rep)
                .status("DRAFT")
                .version(1)
                .lines(new ArrayList<>())
                .build();

        when(quotationRepository.findById(55L)).thenReturn(Optional.of(quote));
        when(productRepository.findById(10L)).thenReturn(Optional.of(prod));
        when(quotationRepository.save(any(Quotation.class))).thenAnswer(i -> i.getArgument(0));

        LineItemRequest editLine = LineItemRequest.builder()
                .productId(10L)
                .quantity(3)
                .unitPrice(BigDecimal.valueOf(200.00))
                .discountPercent(BigDecimal.valueOf(5.00))
                .build();

        Quotation updated = quotationService.updateQuotationLines(55L, List.of(editLine), "Samir");

        // Verify version bumped from 1 to 2
        assertEquals(2, updated.getVersion());

        // Verify version snapshot was captured in database
        ArgumentCaptor<QuotationVersion> versionCaptor = ArgumentCaptor.forClass(QuotationVersion.class);
        verify(versionRepository, times(1)).save(versionCaptor.capture());
        QuotationVersion savedVersion = versionCaptor.getValue();
        assertEquals(55L, savedVersion.getQuotationId());
        assertEquals(2, savedVersion.getVersionNumber());
        assertTrue(savedVersion.getSnapshotJson().contains("Q-1055"));
        assertTrue(savedVersion.getSnapshotJson().contains("Hub"));

        // Verify immutable audit log recorded margin delta
        verify(auditService, atLeastOnce()).log(
                eq("QUOTATION"), eq(55L), eq("EDITED"), eq("Samir"),
                eq("Version 1"), eq("Version 2"), anyString(), any());

        // Verify real-time WebSocket broadcast was fired for UI listeners
        verify(webSocketPublisher, times(1)).publishMarginUpdate(eq(55L), anyMap());
    }
}
