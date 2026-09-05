package com.dealflow360.invoice;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    Optional<Invoice> findByInvoiceNumber(String invoiceNumber);
    List<Invoice> findByQuotationId(Long quotationId);
    List<Invoice> findByCustomerId(Long customerId);
    List<Invoice> findByStatus(String status);
}
