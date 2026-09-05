package com.dealflow360.quotation;

import com.dealflow360.approval.ApprovalRequest;
import com.dealflow360.approval.ApprovalRequestRepository;
import com.dealflow360.approval.ApprovalStep;
import com.dealflow360.approval.ApprovalStepRepository;
import com.dealflow360.audit.AuditService;
import com.dealflow360.auth.User;
import com.dealflow360.auth.UserRepository;
import com.dealflow360.catalog.Customer;
import com.dealflow360.catalog.CustomerRepository;
import com.dealflow360.catalog.CustomerTier;
import com.dealflow360.catalog.CustomerTierRepository;
import com.dealflow360.catalog.Product;
import com.dealflow360.catalog.ProductRepository;
import com.dealflow360.discount.LineOverageDetail;
import com.dealflow360.discount.RiskCalculationResult;
import com.dealflow360.discount.RiskScoreEngine;
import com.dealflow360.quotation.dto.LineItemRequest;
import com.dealflow360.quotation.dto.QuotationCreateRequest;
import com.dealflow360.websocket.WebSocketPublisher;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;

@Service
@Transactional
public class QuotationService {

    private final QuotationRepository quotationRepository;
    private final QuotationLineRepository quotationLineRepository;
    private final QuotationVersionRepository quotationVersionRepository;
    private final CustomerRepository customerRepository;
    private final CustomerTierRepository customerTierRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final RiskScoreEngine riskScoreEngine;
    private final ApprovalRequestRepository approvalRequestRepository;
    private final ApprovalStepRepository approvalStepRepository;
    private final AuditService auditService;
    private final WebSocketPublisher webSocketPublisher;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public QuotationService(QuotationRepository quotationRepository,
                            QuotationLineRepository quotationLineRepository,
                            QuotationVersionRepository quotationVersionRepository,
                            CustomerRepository customerRepository,
                            CustomerTierRepository customerTierRepository,
                            UserRepository userRepository,
                            ProductRepository productRepository,
                            RiskScoreEngine riskScoreEngine,
                            ApprovalRequestRepository approvalRequestRepository,
                            ApprovalStepRepository approvalStepRepository,
                            AuditService auditService,
                            WebSocketPublisher webSocketPublisher) {
        this.quotationRepository = quotationRepository;
        this.quotationLineRepository = quotationLineRepository;
        this.quotationVersionRepository = quotationVersionRepository;
        this.customerRepository = customerRepository;
        this.customerTierRepository = customerTierRepository;
        this.userRepository = userRepository;
        this.productRepository = productRepository;
        this.riskScoreEngine = riskScoreEngine;
        this.approvalRequestRepository = approvalRequestRepository;
        this.approvalStepRepository = approvalStepRepository;
        this.auditService = auditService;
        this.webSocketPublisher = webSocketPublisher;
    }

    public List<Quotation> listQuotations(Long repId, String status) {
        if (repId != null && status != null && !status.isBlank()) {
            return quotationRepository.findBySalesRepId(repId).stream()
                    .filter(q -> q.getStatus().equalsIgnoreCase(status))
                    .toList();
        } else if (repId != null) {
            return quotationRepository.findBySalesRepId(repId);
        } else if (status != null && !status.isBlank()) {
            return quotationRepository.findByStatus(status);
        }
        return quotationRepository.findAll();
    }

    public Quotation getQuotationById(Long id) {
        return quotationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Quotation not found: " + id));
    }

    public Quotation getQuotationByPortalToken(String portalToken) {
        return quotationRepository.findByPortalToken(portalToken)
                .orElseThrow(() -> new RuntimeException("Invalid portal token: " + portalToken));
    }

    public Quotation createQuotation(QuotationCreateRequest request, String repEmail) {
        Customer customer = customerRepository.findById(request.getCustomerId())
                .orElseThrow(() -> new RuntimeException("Customer not found: " + request.getCustomerId()));

        User salesRep;
        if (request.getSalesRepId() != null) {
            salesRep = userRepository.findById(request.getSalesRepId())
                    .orElseThrow(() -> new RuntimeException("Sales rep not found: " + request.getSalesRepId()));
        } else {
            salesRep = userRepository.findByEmail(repEmail)
                    .orElseThrow(() -> new RuntimeException("User not found: " + repEmail));
        }

        String quoteNumber = "Q-" + (1000 + quotationRepository.count() + 1);
        String portalToken = "portal-" + UUID.randomUUID().toString();

        Quotation quotation = Quotation.builder()
                .quoteNumber(quoteNumber)
                .customer(customer)
                .salesRep(salesRep)
                .status("DRAFT")
                .portalToken(portalToken)
                .promisedDeliveryDate(request.getPromisedDeliveryDate())
                .version(1)
                .lastActivityAt(LocalDateTime.now())
                .build();

        quotation = quotationRepository.save(quotation);

        if (request.getLines() != null && !request.getLines().isEmpty()) {
            applyLineItems(quotation, request.getLines());
        }

        recalculateQuotation(quotation);
        createVersionSnapshot(quotation, salesRep.getName(), "Initial quotation draft created");

        auditService.log("QUOTATION", quotation.getId(), "CREATED", salesRep.getName(),
                null, "DRAFT", "New quotation initiated for customer: " + customer.getName(),
                quotation.getMarginPercentage());

        return quotation;
    }

    public Quotation updateQuotationLines(Long quotationId, List<LineItemRequest> lineRequests, String changedBy) {
        Quotation quotation = getQuotationById(quotationId);

        BigDecimal beforeMargin = quotation.getMarginPercentage();

        quotationLineRepository.deleteAll(quotation.getLines());
        quotation.getLines().clear();

        applyLineItems(quotation, lineRequests);
        recalculateQuotation(quotation);

        quotation.setVersion(quotation.getVersion() + 1);
        quotation.setLastActivityAt(LocalDateTime.now());
        quotationRepository.save(quotation);

        createVersionSnapshot(quotation, changedBy, "Quotation lines updated");

        BigDecimal marginDelta = quotation.getMarginPercentage().subtract(beforeMargin);
        auditService.log("QUOTATION", quotation.getId(), "EDITED", changedBy,
                "Version " + (quotation.getVersion() - 1), "Version " + quotation.getVersion(),
                "Line items and discounts recalculated", marginDelta);

        // Push live margin update via WebSocket
        Map<String, Object> wsPayload = new HashMap<>();
        wsPayload.put("quotationId", quotation.getId());
        wsPayload.put("totalAmount", quotation.getTotalAmount());
        wsPayload.put("totalMarginAmount", quotation.getTotalMarginAmount());
        wsPayload.put("marginPercentage", quotation.getMarginPercentage());
        wsPayload.put("blendedRiskScore", quotation.getBlendedRiskScore());
        webSocketPublisher.publishMarginUpdate(quotation.getId(), wsPayload);

        return quotation;
    }

    public Quotation addProductLine(Long quotationId, Long productId, int quantity, BigDecimal discountPercent, String changedBy) {
        Quotation quotation = getQuotationById(quotationId);
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found: " + productId));

        BigDecimal disc = discountPercent != null ? discountPercent : BigDecimal.ZERO;
        BigDecimal unitPrice = product.getBasePrice();
        BigDecimal discountFactor = BigDecimal.ONE.subtract(disc.divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP));
        BigDecimal discAmount = unitPrice.multiply(disc.divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP));
        int qty = Math.max(1, quantity);
        BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(qty)).multiply(discountFactor).setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalCost = product.getCostPrice().multiply(BigDecimal.valueOf(qty)).setScale(2, RoundingMode.HALF_UP);
        BigDecimal marginAmount = lineTotal.subtract(totalCost).setScale(2, RoundingMode.HALF_UP);

        String lineType = Boolean.TRUE.equals(product.getIsSubscription()) ? "RECURRING" : "ONE_TIME";

        QuotationLine line = QuotationLine.builder()
                .quotation(quotation)
                .product(product)
                .quantity(qty)
                .unitPrice(unitPrice)
                .discountPercent(disc)
                .lineTotal(lineTotal)
                .costPrice(product.getCostPrice())
                .marginAmount(marginAmount)
                .lineType(lineType)
                .status("OK")
                .overagePoints(BigDecimal.ZERO)
                .build();

        quotation.getLines().add(line);
        quotationLineRepository.save(line);
        recalculateQuotation(quotation);

        quotation.setVersion(quotation.getVersion() + 1);
        quotation.setLastActivityAt(LocalDateTime.now());
        quotationRepository.save(quotation);

        createVersionSnapshot(quotation, changedBy != null ? changedBy : "System", "Added product: " + product.getName());

        // Push live margin update via WebSocket
        Map<String, Object> wsPayload = new HashMap<>();
        wsPayload.put("quotationId", quotation.getId());
        wsPayload.put("totalAmount", quotation.getTotalAmount());
        wsPayload.put("totalMarginAmount", quotation.getTotalMarginAmount());
        wsPayload.put("marginPercentage", quotation.getMarginPercentage());
        wsPayload.put("blendedRiskScore", quotation.getBlendedRiskScore());
        webSocketPublisher.publishMarginUpdate(quotation.getId(), wsPayload);

        return quotation;
    }

    public Quotation confirmQuotation(Long quotationId, String confirmedBy) {
        Quotation quotation = getQuotationById(quotationId);
        String prevStatus = quotation.getStatus();
        quotation.setStatus("CONFIRMED");
        quotation.setLastActivityAt(LocalDateTime.now());
        quotation = quotationRepository.save(quotation);

        auditService.log("QUOTATION", quotation.getId(), "CONFIRMED", confirmedBy,
                prevStatus, "CONFIRMED", "Quotation confirmed by sales representative",
                quotation.getMarginPercentage());

        return quotation;
    }

    private void applyLineItems(Quotation quotation, List<LineItemRequest> lineRequests) {
        for (LineItemRequest lr : lineRequests) {
            Product product = productRepository.findById(lr.getProductId())
                    .orElseThrow(() -> new RuntimeException("Product not found: " + lr.getProductId()));

            int qty = lr.getQuantity() != null && lr.getQuantity() > 0 ? lr.getQuantity() : 1;
            BigDecimal unitPrice = lr.getUnitPrice() != null ? lr.getUnitPrice() : product.getBasePrice();
            BigDecimal costPrice = product.getCostPrice();
            BigDecimal discount = lr.getDiscountPercent() != null ? lr.getDiscountPercent() : BigDecimal.ZERO;

            BigDecimal discountFactor = BigDecimal.ONE.subtract(discount.divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP));
            BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(qty)).multiply(discountFactor).setScale(2, RoundingMode.HALF_UP);
            BigDecimal totalCost = costPrice.multiply(BigDecimal.valueOf(qty)).setScale(2, RoundingMode.HALF_UP);
            BigDecimal marginAmount = lineTotal.subtract(totalCost).setScale(2, RoundingMode.HALF_UP);

            String lineType = lr.getLineType() != null ? lr.getLineType() : (product.getIsSubscription() ? "RECURRING" : "ONE_TIME");

            QuotationLine line = QuotationLine.builder()
                    .quotation(quotation)
                    .product(product)
                    .quantity(qty)
                    .unitPrice(unitPrice)
                    .costPrice(costPrice)
                    .discountPercent(discount)
                    .lineTotal(lineTotal)
                    .marginAmount(marginAmount)
                    .lineType(lineType)
                    .subscriptionPlanId(lr.getSubscriptionPlanId())
                    .status("OK")
                    .overagePoints(BigDecimal.ZERO)
                    .build();

            quotation.getLines().add(line);
        }
    }

    public void recalculateQuotation(Quotation quotation) {
        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal totalAmount = BigDecimal.ZERO;
        BigDecimal totalCost = BigDecimal.ZERO;

        for (QuotationLine line : quotation.getLines()) {
            BigDecimal lineGross = line.getUnitPrice().multiply(BigDecimal.valueOf(line.getQuantity()));
            subtotal = subtotal.add(lineGross);
            totalAmount = totalAmount.add(line.getLineTotal());
            totalCost = totalCost.add(line.getCostPrice().multiply(BigDecimal.valueOf(line.getQuantity())));
        }

        BigDecimal totalDiscountAmount = subtotal.subtract(totalAmount).max(BigDecimal.ZERO);
        BigDecimal totalMarginAmount = totalAmount.subtract(totalCost);
        BigDecimal marginPercentage = totalAmount.compareTo(BigDecimal.ZERO) > 0
                ? totalMarginAmount.divide(totalAmount, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        quotation.setSubtotalAmount(subtotal.setScale(2, RoundingMode.HALF_UP));
        quotation.setTotalDiscountAmount(totalDiscountAmount.setScale(2, RoundingMode.HALF_UP));
        quotation.setTotalAmount(totalAmount.setScale(2, RoundingMode.HALF_UP));
        quotation.setTotalCost(totalCost.setScale(2, RoundingMode.HALF_UP));
        quotation.setTotalMarginAmount(totalMarginAmount.setScale(2, RoundingMode.HALF_UP));
        quotation.setMarginPercentage(marginPercentage);

        // Run Algorithmic Engine 6.1: Risk Score Engine
        BigDecimal customerTierCeiling = BigDecimal.valueOf(5.00); // Default Bronze
        if (quotation.getCustomer() != null && quotation.getCustomer().getTier() != null) {
            Optional<CustomerTier> tierOpt = customerTierRepository.findByTierName(quotation.getCustomer().getTier());
            if (tierOpt.isPresent()) {
                customerTierCeiling = tierOpt.get().getMaxDiscountPercent();
            }
        }

        List<RiskScoreEngine.LineInput> inputs = new ArrayList<>();
        for (QuotationLine line : quotation.getLines()) {
            inputs.add(new RiskScoreEngine.LineInput(line.getId(), line.getProduct(), line.getDiscountPercent(), line.getLineTotal()));
        }

        RiskCalculationResult riskResult = riskScoreEngine.calculateRisk(customerTierCeiling, inputs);
        quotation.setBlendedRiskScore(riskResult.getBlendedRiskScore());

        // Update line-level overage and status
        if (riskResult.getLineDetails() != null && riskResult.getLineDetails().size() == quotation.getLines().size()) {
            for (int i = 0; i < quotation.getLines().size(); i++) {
                LineOverageDetail lod = riskResult.getLineDetails().get(i);
                QuotationLine ql = quotation.getLines().get(i);
                ql.setOveragePoints(lod.getOveragePoints());
                ql.setStatus(lod.getIsCulprit() ? "OVER" : "OK");
            }
        }

        quotationRepository.save(quotation);
    }

    public RiskCalculationResult getQuotationRiskBreakdown(Long quotationId) {
        Quotation quotation = getQuotationById(quotationId);

        BigDecimal customerTierCeiling = BigDecimal.valueOf(5.00);
        if (quotation.getCustomer() != null && quotation.getCustomer().getTier() != null) {
            Optional<CustomerTier> tierOpt = customerTierRepository.findByTierName(quotation.getCustomer().getTier());
            if (tierOpt.isPresent()) {
                customerTierCeiling = tierOpt.get().getMaxDiscountPercent();
            }
        }

        List<RiskScoreEngine.LineInput> inputs = new ArrayList<>();
        for (QuotationLine line : quotation.getLines()) {
            inputs.add(new RiskScoreEngine.LineInput(line.getId(), line.getProduct(), line.getDiscountPercent(), line.getLineTotal()));
        }

        return riskScoreEngine.calculateRisk(customerTierCeiling, inputs);
    }

    public Map<String, Object> submitForApproval(Long quotationId, String submittedBy) {
        Quotation quotation = getQuotationById(quotationId);
        recalculateQuotation(quotation);

        RiskCalculationResult risk = getQuotationRiskBreakdown(quotationId);

        if (!risk.getRequiresApproval()) {
            // Auto-approved! No manager review needed.
            quotation.setStatus("APPROVED");
            quotation.setLastActivityAt(LocalDateTime.now());
            quotationRepository.save(quotation);

            auditService.log("QUOTATION", quotation.getId(), "AUTO_APPROVED", "System Engine",
                    "DRAFT", "APPROVED", risk.getFullExplanation(), BigDecimal.ZERO);

            return Map.of(
                    "status", "APPROVED",
                    "requiresApproval", false,
                    "riskScore", risk.getBlendedRiskScore(),
                    "message", risk.getFullExplanation()
            );
        }

        // Approval required -> Route to Sales Manager, and optionally Finance
        quotation.setStatus("PENDING_APPROVAL");
        quotation.setLastActivityAt(LocalDateTime.now());
        quotationRepository.save(quotation);

        // Delete existing approval requests for this quotation if re-routing
        approvalRequestRepository.findByQuotationId(quotationId).ifPresent(approvalRequestRepository::delete);

        ApprovalRequest request = ApprovalRequest.builder()
                .quotation(quotation)
                .status("PENDING")
                .currentStage("SALES_MANAGER")
                .blendedRiskScore(risk.getBlendedRiskScore())
                .riskLevel(risk.getRiskLevel())
                .explanation(risk.getFullExplanation())
                .build();

        request = approvalRequestRepository.save(request);

        // Stage 1: Sales Manager Step
        ApprovalStep managerStep = ApprovalStep.builder()
                .approvalRequest(request)
                .quotation(quotation)
                .level("STAGE_1_MANAGER")
                .requiredRole("SALES_MANAGER")
                .status("PENDING")
                .assignedAt(LocalDateTime.now())
                .slaDeadline(LocalDateTime.now().plusHours(2))
                .build();
        approvalStepRepository.save(managerStep);

        // Stage 2: Finance Step (if score > 10 or single line > 8pt)
        if (risk.getRequiresFinance()) {
            ApprovalStep financeStep = ApprovalStep.builder()
                    .approvalRequest(request)
                    .quotation(quotation)
                    .level("STAGE_2_FINANCE")
                    .requiredRole("FINANCE")
                    .status("PENDING")
                    .assignedAt(LocalDateTime.now())
                    .slaDeadline(LocalDateTime.now().plusHours(4))
                    .build();
            approvalStepRepository.save(financeStep);
        }

        auditService.log("QUOTATION", quotation.getId(), "SUBMITTED", submittedBy,
                "DRAFT", "PENDING_APPROVAL", risk.getFullExplanation(), BigDecimal.ZERO);

        // Notify via WebSocket
        webSocketPublisher.publishApprovalUpdate(quotation.getId(), Map.of(
                "quotationId", quotation.getId(),
                "quoteNumber", quotation.getQuoteNumber(),
                "customerName", quotation.getCustomer().getName(),
                "riskScore", risk.getBlendedRiskScore(),
                "riskLevel", risk.getRiskLevel(),
                "requiresFinance", risk.getRequiresFinance()
        ));

        return Map.of(
                "status", "PENDING_APPROVAL",
                "requiresApproval", true,
                "riskScore", risk.getBlendedRiskScore(),
                "riskLevel", risk.getRiskLevel(),
                "requiresFinance", risk.getRequiresFinance(),
                "explanation", risk.getFullExplanation()
        );
    }

    private void createVersionSnapshot(Quotation quotation, String changedBy, String summary) {
        try {
            Map<String, Object> snapshot = new HashMap<>();
            snapshot.put("quotationId", quotation.getId());
            snapshot.put("quoteNumber", quotation.getQuoteNumber());
            snapshot.put("version", quotation.getVersion());
            snapshot.put("customer", quotation.getCustomer().getName());
            snapshot.put("totalAmount", quotation.getTotalAmount());
            snapshot.put("marginPercentage", quotation.getMarginPercentage());
            snapshot.put("blendedRiskScore", quotation.getBlendedRiskScore());
            snapshot.put("status", quotation.getStatus());

            List<Map<String, Object>> lineSnapshots = new ArrayList<>();
            for (QuotationLine line : quotation.getLines()) {
                Map<String, Object> lineMap = new HashMap<>();
                lineMap.put("product", line.getProduct().getName());
                lineMap.put("quantity", line.getQuantity());
                lineMap.put("unitPrice", line.getUnitPrice());
                lineMap.put("discountPercent", line.getDiscountPercent());
                lineMap.put("lineTotal", line.getLineTotal());
                lineMap.put("overagePoints", line.getOveragePoints());
                lineSnapshots.add(lineMap);
            }
            snapshot.put("lines", lineSnapshots);

            String json = objectMapper.writeValueAsString(snapshot);

            QuotationVersion version = QuotationVersion.builder()
                    .quotationId(quotation.getId())
                    .versionNumber(quotation.getVersion())
                    .snapshotJson(json)
                    .changedBy(changedBy != null ? changedBy : "System")
                    .changeSummary(summary)
                    .build();

            quotationVersionRepository.save(version);
        } catch (Exception ex) {
            // log error
        }
    }

    public List<QuotationVersion> getQuotationVersions(Long quotationId) {
        return quotationVersionRepository.findByQuotationIdOrderByVersionNumberAsc(quotationId);
    }
}
