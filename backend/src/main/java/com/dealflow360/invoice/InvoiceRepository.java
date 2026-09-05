package com.dealflow360.invoice;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    Optional<Invoice> findByInvoiceNumber(String invoiceNumber);
    boolean existsByInvoiceNumber(String invoiceNumber);

    @org.springframework.data.jpa.repository.Query("SELECT i FROM Invoice i WHERE i.quotation.id = :quotationId")
    List<Invoice> findByQuotationId(@org.springframework.data.repository.query.Param("quotationId") Long quotationId);

    @org.springframework.data.jpa.repository.Query("SELECT i FROM Invoice i WHERE i.customer.id = :customerId")
    List<Invoice> findByCustomerId(@org.springframework.data.repository.query.Param("customerId") Long customerId);

    List<Invoice> findByStatus(String status);
}
