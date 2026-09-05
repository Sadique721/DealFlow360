package com.dealflow360.dealhealth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DealHealthFlagRepository extends JpaRepository<DealHealthFlag, Long> {
    List<DealHealthFlag> findByResolvedFalseOrderByDetectedAtDesc();
    List<DealHealthFlag> findByQuotationIdAndResolvedFalse(Long quotationId);
    Optional<DealHealthFlag> findByQuotationIdAndFlagTypeAndResolvedFalse(Long quotationId, String flagType);
}
