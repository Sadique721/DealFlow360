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

    public Quotation resolveQuotation(Object identifier) {
        if (identifier == null) {
            throw new RuntimeException("Quotation identifier cannot be null");
        }
        String ref = String.valueOf(identifier).trim();

        // 1. Try exact Long ID if numeric
        if (ref.matches("\\d+")) {
            Long id = Long.parseLong(ref);
            var opt = quotationRepository.findById(id);
            if (opt.isPresent()) return opt.get();
        }

        // 2. Try exact quote number match (e.g. "Q-2026-0042")
        var optNumber = quotationRepository.findByQuoteNumber(ref);
        if (optNumber.isPresent()) return optNumber.get();

        // 3. Try with prefix formatting (e.g. if passed "42", try "Q-2026-0042")
        if (ref.matches("\\d+")) {
            Long id = Long.parseLong(ref);
            var optPadded = quotationRepository.findByQuoteNumber("Q-2026-" + String.format("%04d", id));
            if (optPadded.isPresent()) return optPadded.get();

            var optShort = quotationRepository.findByQuoteNumber("Q-" + id);
            if (optShort.isPresent()) return optShort.get();
        }

        // 4. Try stripping non-alphanumeric or adding "Q-" if not present
        if (!ref.startsWith("Q-")) {
            var optWithQ = quotationRepository.findByQuoteNumber("Q-" + ref);
            if (optWithQ.isPresent()) return optWithQ.get();
        }

        throw new RuntimeException("Quotation not found with ID or Quote Number: " + ref);
    }

    public Invoice generateInvoice(Long quotationId, String invoiceType, BigDecimal amount) {
        Quotation quotation = resolveQuotation(quotationId);
        return generateInvoiceForQuotation(quotation, invoiceType, amount);
    }

    public Invoice generateInvoiceByRef(String quoteRef, String invoiceType, BigDecimal amount) {
        Quotation quotation = resolveQuotation(quoteRef);
        return generateInvoiceForQuotation(quotation, invoiceType, amount);
    }

    private Invoice generateInvoiceForQuotation(Quotation quotation, String invoiceType, BigDecimal amount) {
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
