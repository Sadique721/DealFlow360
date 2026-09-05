package com.dealflow360.catalog;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface ApprovalChainRepository extends JpaRepository<ApprovalChain, Long> {
    List<ApprovalChain> findAllByOrderByMinScoreAsc();

    @Query("SELECT ac FROM ApprovalChain ac WHERE :score >= ac.minScore AND :score <= ac.maxScore ORDER BY ac.minScore ASC")
    List<ApprovalChain> findMatchingChains(@Param("score") BigDecimal score);
}
