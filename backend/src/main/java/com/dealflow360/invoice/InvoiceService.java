package com.dealflow360.invoice;

import com.dealflow360.audit.AuditService;
import com.dealflow360.quotation.Quotation;
import com.dealflow360.quotation.QuotationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final QuotationRepository quotationRepository;
    private final AuditService auditService;

    public InvoiceService(InvoiceRepository invoiceRepository,
                          QuotationRepository quotationRepository,
                          AuditService auditService) {
        this.invoiceRepository = invoiceRepository;
        this.quotationRepository = quotationRepository;
        this.auditService = auditService;
    }

    public List<Invoice> listInvoices(String status) {
        if (status != null && !status.isBlank()) {
            return invoiceRepository.findByStatus(status);
        }
        return invoiceRepository.findAll();
    }

    public Invoice getInvoiceById(Long id) {
        return invoiceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Invoice not found: " + id));
    }

    public List<Invoice> getInvoicesForQuotation(Long quotationId) {
        return invoiceRepository.findByQuotationId(quotationId);
    }

    public Invoice generateInvoice(Long quotationId, String invoiceType, BigDecimal amount) {
        Quotation quotation = quotationRepository.findById(quotationId)
                .orElseThrow(() -> new RuntimeException("Quotation not found: " + quotationId));

        String invoiceNumber = "INV-2026-" + String.format("%03d", invoiceRepository.count() + 1);

        Invoice invoice = Invoice.builder()
                .invoiceNumber(invoiceNumber)
                .quotation(quotation)
                .customer(quotation.getCustomer())
                .invoiceType(invoiceType != null ? invoiceType : "ONE_TIME")
                .amount(amount != null ? amount : quotation.getTotalAmount())
                .status("UNPAID")
                .dueDate(LocalDate.now().plusDays(30))
                .deliveryStatus("SHIPPED")
                .build();

        invoice = invoiceRepository.save(invoice);

        auditService.log("INVOICE", invoice.getId(), "GENERATED", "Billing Engine",
                null, "UNPAID", "Invoice " + invoiceNumber + " issued for quotation " + quotation.getQuoteNumber(), BigDecimal.ZERO);

        return invoice;
    }

    public Invoice recordPayment(Long invoiceId) {
        Invoice invoice = getInvoiceById(invoiceId);

        invoice.setStatus("PAID");
        invoice.setPaidAt(LocalDateTime.now());
        invoice.setDeliveryStatus("PAID");
        invoiceRepository.save(invoice);

        auditService.log("INVOICE", invoice.getId(), "PAYMENT_RECORDED", "Finance Officer",
                "UNPAID", "PAID", "Full payment of $" + invoice.getAmount() + " successfully recorded", BigDecimal.ZERO);

        return invoice;
    }

    public Invoice updateDeliveryStatus(Long invoiceId, String deliveryStatus) {
        Invoice invoice = getInvoiceById(invoiceId);
        String oldStatus = invoice.getDeliveryStatus();

        invoice.setDeliveryStatus(deliveryStatus);
        invoiceRepository.save(invoice);

        auditService.log("INVOICE", invoice.getId(), "DELIVERY_STATUS_UPDATED", "Logistics Controller",
                oldStatus, deliveryStatus, "Reconciliation state advanced to: " + deliveryStatus, BigDecimal.ZERO);

        return invoice;
    }
}
