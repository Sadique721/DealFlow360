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

        long count = invoiceRepository.count() + 1;
        String invoiceNumber = "INV-2026-" + String.format("%03d", count);
        while (invoiceRepository.existsByInvoiceNumber(invoiceNumber)) {
            count++;
            invoiceNumber = "INV-2026-" + String.format("%03d", count);
        }

        BigDecimal finalAmount = amount;
        if (finalAmount == null) {
            if ("RECURRING".equalsIgnoreCase(invoiceType)) {
                BigDecimal rec = BigDecimal.ZERO;
                for (var l : quotation.getLines()) {
                    if ("RECURRING".equalsIgnoreCase(l.getLineType()) || (l.getProduct() != null && Boolean.TRUE.equals(l.getProduct().getIsSubscription()))) {
                        rec = rec.add(l.getLineTotal());
                    }
                }
                finalAmount = rec.compareTo(BigDecimal.ZERO) > 0 ? rec : quotation.getTotalAmount();
            } else if ("ONE_TIME".equalsIgnoreCase(invoiceType)) {
                BigDecimal oneTime = BigDecimal.ZERO;
                for (var l : quotation.getLines()) {
                    if (!"RECURRING".equalsIgnoreCase(l.getLineType()) && (l.getProduct() == null || !Boolean.TRUE.equals(l.getProduct().getIsSubscription()))) {
                        oneTime = oneTime.add(l.getLineTotal());
                    }
                }
                finalAmount = oneTime.compareTo(BigDecimal.ZERO) > 0 ? oneTime : quotation.getTotalAmount();
            } else {
                finalAmount = quotation.getTotalAmount();
            }
        }

        Invoice invoice = Invoice.builder()
                .invoiceNumber(invoiceNumber)
                .quotation(quotation)
                .customer(quotation.getCustomer())
                .invoiceType(invoiceType != null ? invoiceType : "ONE_TIME")
                .amount(finalAmount)
                .status("UNPAID")
                .dueDate(LocalDate.now().plusDays(30))
                .deliveryStatus("SHIPPED")
                .build();

        invoice = invoiceRepository.save(invoice);

        auditService.log("INVOICE", invoice.getId(), "GENERATED", "Billing Engine",
                null, "UNPAID", "Invoice " + invoiceNumber + " (" + invoice.getInvoiceType() + ") issued for quotation " + quotation.getQuoteNumber(), finalAmount);

        return invoice;
    }

    public Invoice voidInvoice(Long invoiceId, String reason) {
        Invoice invoice = getInvoiceById(invoiceId);
        String oldStatus = invoice.getStatus();
        invoice.setStatus("VOID");
        invoiceRepository.save(invoice);

        auditService.log("INVOICE", invoice.getId(), "VOIDED", "Finance Officer",
                oldStatus, "VOID", "Invoice voided: " + (reason != null ? reason : "Administrative cancellation"), BigDecimal.ZERO);
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
