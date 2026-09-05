package com.dealflow360.upsell;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UpsellRuleRepository extends JpaRepository<UpsellRule, Long> {
    List<UpsellRule> findByBaseProductId(Long baseProductId);
}
