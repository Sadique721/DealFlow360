package com.dealflow360.subscription;

import com.dealflow360.audit.AuditService;
import com.dealflow360.auth.User;
import com.dealflow360.catalog.Customer;
import com.dealflow360.invoice.Invoice;
import com.dealflow360.invoice.InvoiceRepository;
import com.dealflow360.invoice.InvoiceService;
import com.dealflow360.quotation.Quotation;
import com.dealflow360.quotation.QuotationLine;
import com.dealflow360.quotation.QuotationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class InvoiceAndAminContractTest {

    private InvoiceRepository invoiceRepository;
    private QuotationRepository quotationRepository;
    private AuditService auditService;
    private InvoiceService invoiceService;

    @BeforeEach
    void setUp() {
        invoiceRepository = mock(InvoiceRepository.class);
        quotationRepository = mock(QuotationRepository.class);
        auditService = mock(AuditService.class);
        invoiceService = new InvoiceService(invoiceRepository, quotationRepository, auditService);
    }

    @Test
    @DisplayName("Invoice JSON properties correctly resolve customer name, sales rep, and quote number")
    void testInvoiceJsonProperties() {
        User rep = User.builder().id(2L).name("Jay Rao").email("j.rao@dealflow360.com").build();
        Customer customer = Customer.builder().id(10L).name("Acme Corp").build();
        Quotation quotation = Quotation.builder()
                .id(100L)
                .quoteNumber("Q-2026-0100")
                .customer(customer)
                .salesRep(rep)
                .totalAmount(BigDecimal.valueOf(15000.00))
                .build();

        Invoice invoice = Invoice.builder()
                .id(1L)
                .invoiceNumber("INV-2026-0001")
                .quotation(quotation)
                .customer(customer)
                .amount(BigDecimal.valueOf(15000.00))
                .status("UNPAID")
                .dueDate(LocalDate.of(2026, 10, 15))
                .createdAt(LocalDateTime.of(2026, 9, 15, 10, 0))
                .build();

        assertEquals("Q-2026-0100", invoice.getQuoteId());
        assertEquals("Q-2026-0100", invoice.getQuoteNumber());
        assertEquals(100L, invoice.getQuotationId());
        assertEquals("Acme Corp", invoice.getCustomerName());
        assertEquals("Jay Rao", invoice.getSalesRep());
        assertEquals("Jay Rao", invoice.getSalesRepName());
        assertEquals("2026-09-15", invoice.getIssuedDate());
    }

    @Test
    @DisplayName("generateInvoice automatically differentiates Capex and Opex line amounts")
    void testGenerateInvoiceCapexOpexSeparation() {
        User rep = User.builder().id(2L).name("Jay Rao").build();
        Customer customer = Customer.builder().id(10L).name("Acme Corp").build();

        List<QuotationLine> lines = new ArrayList<>();
        // Capex line
        lines.add(QuotationLine.builder()
                .id(1L)
                .lineType("ONE_TIME")
                .unitPrice(BigDecimal.valueOf(1000.00))
                .quantity(5)
                .lineTotal(BigDecimal.valueOf(5000.00))
                .build());
        // Opex recurring line
        lines.add(QuotationLine.builder()
                .id(2L)
                .lineType("RECURRING")
                .unitPrice(BigDecimal.valueOf(200.00))
                .quantity(2)
                .lineTotal(BigDecimal.valueOf(400.00))
                .build());

        Quotation quotation = Quotation.builder()
                .id(100L)
                .quoteNumber("Q-2026-0100")
                .customer(customer)
                .salesRep(rep)
                .lines(lines)
                .totalAmount(BigDecimal.valueOf(5400.00))
                .build();

        when(quotationRepository.findById(100L)).thenReturn(Optional.of(quotation));
        when(invoiceRepository.count()).thenReturn(5L);
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(i -> i.getArgument(0));

        // Generate ONE_TIME invoice
        Invoice oneTimeInv = invoiceService.generateInvoice(100L, "ONE_TIME", null);
        assertNotNull(oneTimeInv);
        assertEquals("ONE_TIME", oneTimeInv.getInvoiceType());
        assertEquals(0, BigDecimal.valueOf(5000.00).compareTo(oneTimeInv.getAmount()));

        // Generate RECURRING invoice
        Invoice recurringInv = invoiceService.generateInvoice(100L, "RECURRING", null);
        assertNotNull(recurringInv);
        assertEquals("RECURRING", recurringInv.getInvoiceType());
        assertEquals(0, BigDecimal.valueOf(400.00).compareTo(recurringInv.getAmount()));
    }

    @Test
    @DisplayName("recordPayment transitions status to PAID with timestamp and audit log")
    void testRecordPayment() {
        Invoice invoice = Invoice.builder()
                .id(10L)
                .invoiceNumber("INV-2026-0010")
                .amount(BigDecimal.valueOf(2500.00))
                .status("UNPAID")
                .deliveryStatus("SHIPPED")
                .build();

        when(invoiceRepository.findById(10L)).thenReturn(Optional.of(invoice));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(i -> i.getArgument(0));

        Invoice paid = invoiceService.recordPayment(10L);
        assertEquals("PAID", paid.getStatus());
        assertEquals("PAID", paid.getDeliveryStatus());
        assertNotNull(paid.getPaidAt());
        verify(auditService).log(eq("INVOICE"), eq(10L), eq("PAYMENT_RECORDED"), any(), any(), eq("PAID"), any(), any());
    }

    @Test
    @DisplayName("voidInvoice marks status VOID and logs audit trail")
    void testVoidInvoice() {
        Invoice invoice = Invoice.builder()
                .id(11L)
                .invoiceNumber("INV-2026-0011")
                .amount(BigDecimal.valueOf(1200.00))
                .status("UNPAID")
                .build();

        when(invoiceRepository.findById(11L)).thenReturn(Optional.of(invoice));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(i -> i.getArgument(0));

        Invoice voided = invoiceService.voidInvoice(11L, "Customer order cancelled");
        assertEquals("VOID", voided.getStatus());
        verify(auditService).log(eq("INVOICE"), eq(11L), eq("VOIDED"), any(), eq("UNPAID"), eq("VOID"), any(), any());
    }
}
