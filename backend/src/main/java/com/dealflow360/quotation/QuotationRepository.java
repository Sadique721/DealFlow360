package com.dealflow360.quotation;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface QuotationRepository extends JpaRepository<Quotation, Long> {
    Optional<Quotation> findByQuoteNumber(String quoteNumber);
    Optional<Quotation> findByPortalToken(String portalToken);
    List<Quotation> findBySalesRepId(Long salesRepId);
    List<Quotation> findByCustomerId(Long customerId);
    List<Quotation> findByStatus(String status);
    List<Quotation> findBySalesRepIdAndStatus(Long salesRepId, String status);
    List<Quotation> findByCustomerIdAndStatus(Long customerId, String status);

    @Query("SELECT q FROM Quotation q WHERE q.status NOT IN ('CONFIRMED', 'REJECTED', 'CLOSED') AND q.lastActivityAt < :threshold")
    List<Quotation> findStalledQuotations(LocalDateTime threshold);

    @Query("SELECT q FROM Quotation q WHERE q.salesRep.id = :repId AND q.status = 'CONFIRMED' ORDER BY q.createdAt DESC")
    List<Quotation> findRecentConfirmedByRep(Long repId);
}
