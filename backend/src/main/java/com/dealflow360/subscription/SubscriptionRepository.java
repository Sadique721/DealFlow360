package com.dealflow360.subscription;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {
    List<Subscription> findByCustomerId(Long customerId);
    List<Subscription> findByQuotationId(Long quotationId);
    List<Subscription> findByStatus(String status);
}
