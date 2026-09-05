package com.dealflow360.warehouse;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FulfillmentSplitRepository extends JpaRepository<FulfillmentSplit, Long> {
    List<FulfillmentSplit> findByFulfillmentPlanId(Long fulfillmentPlanId);
    List<FulfillmentSplit> findByQuotationId(Long quotationId);
    List<FulfillmentSplit> findByIsBackorderTrueAndStatus(String status);
}
