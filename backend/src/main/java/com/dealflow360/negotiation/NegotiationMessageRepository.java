package com.dealflow360.negotiation;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NegotiationMessageRepository extends JpaRepository<NegotiationMessage, Long> {
    List<NegotiationMessage> findByQuotationIdOrderByCreatedAtAsc(Long quotationId);
}
