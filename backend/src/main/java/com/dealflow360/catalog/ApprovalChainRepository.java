package com.dealflow360.catalog;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ApprovalChainRepository extends JpaRepository<ApprovalChain, Long> {
    List<ApprovalChain> findAllByOrderByMinScoreAsc();
}
