package com.dealflow360.reporting;

import com.dealflow360.quotation.Quotation;
import com.dealflow360.quotation.QuotationLine;
import com.dealflow360.quotation.QuotationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;

@Service
@Transactional(readOnly = true)
public class ReportingService {

    private final QuotationRepository quotationRepository;

    public ReportingService(QuotationRepository quotationRepository) {
        this.quotationRepository = quotationRepository;
    }

    public Map<String, Object> getExecutiveKpis(String period, Long repId, String status) {
        List<Quotation> quotes = quotationRepository.findAll();

        if (repId != null) {
            quotes = quotes.stream().filter(q -> q.getSalesRep().getId().equals(repId)).toList();
        }
        if (status != null && !status.isBlank()) {
            quotes = quotes.stream().filter(q -> q.getStatus().equalsIgnoreCase(status)).toList();
        }

        BigDecimal totalPipeline = BigDecimal.ZERO;
        BigDecimal totalConfirmed = BigDecimal.ZERO;
        BigDecimal totalMargin = BigDecimal.ZERO;
        int pendingApprovalCount = 0;
        int stalledCount = 0;

        LocalDateTime sevenDaysAgo = LocalDateTime.now().minusDays(7);

        for (Quotation q : quotes) {
            totalPipeline = totalPipeline.add(q.getTotalAmount());
            if ("CONFIRMED".equalsIgnoreCase(q.getStatus()) || "FULFILLED".equalsIgnoreCase(q.getStatus())) {
                totalConfirmed = totalConfirmed.add(q.getTotalAmount());
                totalMargin = totalMargin.add(q.getTotalMarginAmount());
            }
            if ("PENDING_APPROVAL".equalsIgnoreCase(q.getStatus())) {
                pendingApprovalCount++;
            }
            if (q.getLastActivityAt() != null && q.getLastActivityAt().isBefore(sevenDaysAgo) && !"CONFIRMED".equalsIgnoreCase(q.getStatus())) {
                stalledCount++;
            }
        }

        BigDecimal avgMarginPct = totalConfirmed.compareTo(BigDecimal.ZERO) > 0
                ? totalMargin.divide(totalConfirmed, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        Map<String, Object> kpis = new HashMap<>();
        kpis.put("totalQuotations", quotes.size());
        kpis.put("totalPipelineValue", totalPipeline);
        kpis.put("totalConfirmedRevenue", totalConfirmed);
        kpis.put("averageGrossMarginPercent", avgMarginPct);
        kpis.put("pendingApprovalsCount", pendingApprovalCount);
        kpis.put("stalledDealsCount", stalledCount);

        return kpis;
    }

    public String exportToCsv(Long repId, String status) {
        List<Quotation> quotes = quotationRepository.findAll();
        StringBuilder sb = new StringBuilder();
        sb.append("Quote Number,Customer,Tier,Sales Rep,Status,Total Amount,Margin %,Risk Score,Created At\n");

        for (Quotation q : quotes) {
            sb.append(String.format("%s,\"%s\",%s,\"%s\",%s,%.2f,%.2f,%.2f,%s\n",
                    q.getQuoteNumber(),
                    q.getCustomer().getName(),
                    q.getCustomer().getTier(),
                    q.getSalesRep().getName(),
                    q.getStatus(),
                    q.getTotalAmount().doubleValue(),
                    q.getMarginPercentage().doubleValue(),
                    q.getBlendedRiskScore().doubleValue(),
                    q.getCreatedAt()));
        }

        return sb.toString();
    }
}
