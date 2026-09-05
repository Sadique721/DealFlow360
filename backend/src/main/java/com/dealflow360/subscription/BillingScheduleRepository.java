package com.dealflow360.subscription;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface BillingScheduleRepository extends JpaRepository<BillingSchedule, Long> {
    List<BillingSchedule> findBySubscriptionIdOrderByBillingDateAsc(Long subscriptionId);
    List<BillingSchedule> findByStatusAndBillingDateLessThanEqual(String status, LocalDate date);
}
