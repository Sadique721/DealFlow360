package com.dealflow360.approval;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ApprovalStepRepository extends JpaRepository<ApprovalStep, Long> {
    List<ApprovalStep> findByQuotationIdOrderByAssignedAtAsc(Long quotationId);
    List<ApprovalStep> findByStatus(String status);
    List<ApprovalStep> findByRequiredRoleAndStatus(String requiredRole, String status);

    @Query("SELECT s FROM ApprovalStep s WHERE s.status = 'PENDING' AND s.slaDeadline < :now")
    List<ApprovalStep> findOverdueSteps(LocalDateTime now);
}
