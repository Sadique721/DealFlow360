package com.dealflow360.quotation;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuotationVersionRepository extends JpaRepository<QuotationVersion, Long> {
    List<QuotationVersion> findByQuotationIdOrderByVersionNumberAsc(Long quotationId);
}
