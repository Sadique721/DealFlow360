package com.dealflow360.invoice;

import com.dealflow360.catalog.Customer;
import com.dealflow360.quotation.Quotation;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "invoices")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Invoice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "invoice_number", nullable = false, unique = true, length = 50)
    private String invoiceNumber;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "quotation_id", nullable = false)
    private Quotation quotation;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @Column(name = "invoice_type", nullable = false, length = 50)
    @Builder.Default
    private String invoiceType = "ONE_TIME"; // ONE_TIME, RECURRING, CREDIT_NOTE

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 50)
    @Builder.Default
    private String status = "UNPAID"; // UNPAID, PAID, VOID

    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Column(name = "delivery_status", length = 50)
    @Builder.Default
    private String deliveryStatus = "SHIPPED"; // ORDER_CONFIRMED, SHIPPED, INVOICED, PAID

    @Column(name = "created_at", updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @JsonProperty("quoteId")
    public String getQuoteId() {
        return quotation != null ? quotation.getQuoteNumber() : null;
    }

    @JsonProperty("quoteNumber")
    public String getQuoteNumber() {
        return quotation != null ? quotation.getQuoteNumber() : null;
    }

    @JsonProperty("quotationId")
    public Long getQuotationId() {
        return quotation != null ? quotation.getId() : null;
    }

    @JsonProperty("customerName")
    public String getCustomerName() {
        if (customer != null && customer.getName() != null) {
            return customer.getName();
        }
        if (quotation != null && quotation.getCustomer() != null) {
            return quotation.getCustomer().getName();
        }
        return "Unknown Customer";
    }

    @JsonProperty("salesRep")
    public String getSalesRep() {
        if (quotation != null && quotation.getSalesRep() != null) {
            return quotation.getSalesRep().getName();
        }
        return "Unassigned";
    }

    @JsonProperty("salesRepName")
    public String getSalesRepName() {
        return getSalesRep();
    }

    @JsonProperty("issuedDate")
    public String getIssuedDate() {
        return createdAt != null ? createdAt.toLocalDate().toString() : (dueDate != null ? dueDate.minusDays(30).toString() : null);
    }
}
