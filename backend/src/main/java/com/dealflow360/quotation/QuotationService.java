package com.dealflow360.quotation;

import com.dealflow360.approval.ApprovalRequest;
import com.dealflow360.approval.ApprovalRequestRepository;
import com.dealflow360.approval.ApprovalStep;
import com.dealflow360.approval.ApprovalStepRepository;
import com.dealflow360.audit.AuditService;
import com.dealflow360.auth.AuthUser;
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
import com.dealflow360.quotation.dto.QuotationCalculateRequest;
import com.dealflow360.quotation.dto.QuotationCalculateResponse;
import com.dealflow360.quotation.dto.QuotationCreateRequest;
import com.dealflow360.websocket.WebSocketPublisher;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

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

    public List<Quotation> listQuotations(Long repId, String status, AuthUser authUser) {
        String role = authUser != null && authUser.getUser() != null ? authUser.getUser().getRole() : "ADMIN";
        Long currentUserId = authUser != null && authUser.getUser() != null ? authUser.getUser().getId() : null;

        if ("SALES_REP".equals(role) && currentUserId != null) {
            if (status != null && !status.isBlank()) {
                return quotationRepository.findBySalesRepIdAndStatus(currentUserId, status);
            }
            return quotationRepository.findBySalesRepId(currentUserId);
        }

        if ("CUSTOMER".equals(role) && currentUserId != null) {
            Optional<Customer> custOpt = customerRepository.findByPortalUserId(currentUserId);
            if (custOpt.isEmpty() && authUser.getUsername() != null) {
                custOpt = customerRepository.findByEmail(authUser.getUsername());
            }
            if (custOpt.isPresent()) {
                Long custId = custOpt.get().getId();
                if (status != null && !status.isBlank()) {
                    return quotationRepository.findByCustomerIdAndStatus(custId, status);
                }
                return quotationRepository.findByCustomerId(custId);
            }
            return List.of();
        }

        // ADMIN, SALES_MANAGER, FINANCE can view all (or scoped by repId/status)
        if (repId != null && status != null && !status.isBlank()) {
            return quotationRepository.findBySalesRepIdAndStatus(repId, status);
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

    public Quotation getQuotationByIdSecured(Long id, AuthUser authUser) {
        Quotation q = getQuotationById(id);
        if (authUser == null || authUser.getUser() == null) {
            return q;
        }
        String role = authUser.getUser().getRole();
        Long userId = authUser.getUser().getId();

        if ("SALES_REP".equals(role)) {
            if (q.getSalesRep() != null && !userId.equals(q.getSalesRep().getId())) {
                throw new org.springframework.security.access.AccessDeniedException(
                        "Access Denied: You can only view quotations assigned to you.");
            }
        } else if ("CUSTOMER".equals(role)) {
            if (q.getCustomer() != null) {
                boolean matchesPortal = userId.equals(q.getCustomer().getPortalUserId());
                boolean matchesEmail = authUser.getUsername().equalsIgnoreCase(q.getCustomer().getEmail());
                if (!matchesPortal && !matchesEmail) {
                    throw new org.springframework.security.access.AccessDeniedException(
                            "Access Denied: You can only view quotations belonging to your company.");
                }
            }
        }
        return q;
    }

    public Quotation getQuotationByPortalToken(String portalToken) {
        return quotationRepository.findByPortalToken(portalToken)
                .orElseThrow(() -> new RuntimeException("Invalid portal token: " + portalToken));
    }

    public QuotationCalculateResponse calculateQuotationPreview(QuotationCalculateRequest request) {
        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal totalDiscountAmount = BigDecimal.ZERO;
        BigDecimal totalTaxAmount = BigDecimal.ZERO;
        BigDecimal totalAmount = BigDecimal.ZERO;
        BigDecimal totalCost = BigDecimal.ZERO;

        BigDecimal customerTierCeiling = BigDecimal.valueOf(5.00); // Default Bronze
        if (request.getCustomerId() != null) {
            Optional<Customer> custOpt = customerRepository.findById(request.getCustomerId());
            if (custOpt.isPresent() && custOpt.get().getTier() != null) {
                Optional<CustomerTier> tierOpt = customerTierRepository.findByTierName(custOpt.get().getTier());
                if (tierOpt.isEmpty()) {
                    tierOpt = customerTierRepository.findByTierNameIgnoreCase(custOpt.get().getTier());
                }
                if (tierOpt.isPresent()) {
                    customerTierCeiling = tierOpt.get().getMaxDiscountPercent();
                }
            }
        }

        List<QuotationCalculateResponse.CalculatedLineResponse> calcLines = new ArrayList<>();
        List<RiskScoreEngine.LineInput> riskInputs = new ArrayList<>();

        if (request.getLines() != null && !request.getLines().isEmpty()) {
            List<Long> productIds = request.getLines().stream()
                    .map(LineItemRequest::getProductId)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());
            Map<Long, Product> productMap = fetchProductsBatch(productIds);

            for (int i = 0; i < request.getLines().size(); i++) {
                LineItemRequest lr = request.getLines().get(i);
                Product product = productMap.get(lr.getProductId());
                if (product == null) {
                    product = productRepository.findById(lr.getProductId())
                            .orElseThrow(() -> new RuntimeException("Product not found: " + lr.getProductId()));
                }

                int qty = lr.getQuantity() != null && lr.getQuantity() > 0 ? lr.getQuantity() : 1;
                BigDecimal unitPrice = lr.getUnitPrice() != null ? lr.getUnitPrice() : product.getBasePrice();
                BigDecimal costPrice = product.getCostPrice() != null ? product.getCostPrice() : BigDecimal.ZERO;
                BigDecimal discountPercent = lr.getDiscountPercent() != null ? lr.getDiscountPercent() : BigDecimal.ZERO;

                BigDecimal lineGross = unitPrice.multiply(BigDecimal.valueOf(qty));
                BigDecimal discountFactor = discountPercent.divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
                BigDecimal lineDiscountAmount = lineGross.multiply(discountFactor).setScale(2, RoundingMode.HALF_UP);
                BigDecimal netPrice = unitPrice.multiply(BigDecimal.ONE.subtract(discountFactor)).setScale(2, RoundingMode.HALF_UP);
                BigDecimal lineTotal = lineGross.subtract(lineDiscountAmount).setScale(2, RoundingMode.HALF_UP);

                BigDecimal taxPercent = product.getTaxPercentage() != null ? product.getTaxPercentage() : BigDecimal.ZERO;
                BigDecimal lineTaxAmount = lineTotal.multiply(taxPercent.divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP)).setScale(2, RoundingMode.HALF_UP);

                BigDecimal lineCost = costPrice.multiply(BigDecimal.valueOf(qty)).setScale(2, RoundingMode.HALF_UP);
                BigDecimal marginAmount = lineTotal.subtract(lineCost).setScale(2, RoundingMode.HALF_UP);
                BigDecimal lineMarginPct = lineTotal.compareTo(BigDecimal.ZERO) > 0
                        ? marginAmount.divide(lineTotal, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_UP)
                        : BigDecimal.ZERO;

                subtotal = subtotal.add(lineGross);
                totalDiscountAmount = totalDiscountAmount.add(lineDiscountAmount);
                totalTaxAmount = totalTaxAmount.add(lineTaxAmount);
                totalAmount = totalAmount.add(lineTotal);
                totalCost = totalCost.add(lineCost);

                String lineType = lr.getLineType() != null ? lr.getLineType() : (Boolean.TRUE.equals(product.getIsSubscription()) ? "RECURRING" : "ONE_TIME");

                calcLines.add(QuotationCalculateResponse.CalculatedLineResponse.builder()
                        .productId(product.getId())
                        .productName(product.getName())
                        .quantity(qty)
                        .unitPrice(unitPrice)
                        .costPrice(costPrice)
                        .discountPercent(discountPercent)
                        .discountAmount(lineDiscountAmount)
                        .netPrice(netPrice)
                        .taxPercent(taxPercent)
                        .taxAmount(lineTaxAmount)
                        .lineTotal(lineTotal)
                        .lineCost(lineCost)
                        .marginAmount(marginAmount)
                        .marginPercentage(lineMarginPct)
                        .status("OK")
                        .overagePoints(BigDecimal.ZERO)
                        .lineType(lineType)
                        .build());

                riskInputs.add(new RiskScoreEngine.LineInput((long) i, product, discountPercent, lineTotal));
            }
        }

        BigDecimal totalMarginAmount = totalAmount.subtract(totalCost);
        BigDecimal marginPercentage = totalAmount.compareTo(BigDecimal.ZERO) > 0
                ? totalMarginAmount.divide(totalAmount, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        RiskCalculationResult riskResult = riskScoreEngine.calculateRisk(customerTierCeiling, riskInputs);

        if (riskResult.getLineDetails() != null && riskResult.getLineDetails().size() == calcLines.size()) {
            for (int i = 0; i < calcLines.size(); i++) {
                LineOverageDetail lod = riskResult.getLineDetails().get(i);
                calcLines.get(i).setOveragePoints(lod.getOveragePoints());
                calcLines.get(i).setStatus(Boolean.TRUE.equals(lod.getIsCulprit()) ? "OVER" : "OK");
            }
        }

        return QuotationCalculateResponse.builder()
                .subtotalAmount(subtotal.setScale(2, RoundingMode.HALF_UP))
                .totalDiscountAmount(totalDiscountAmount.setScale(2, RoundingMode.HALF_UP))
                .taxAmount(totalTaxAmount.setScale(2, RoundingMode.HALF_UP))
                .totalAmount(totalAmount.setScale(2, RoundingMode.HALF_UP))
                .totalCost(totalCost.setScale(2, RoundingMode.HALF_UP))
                .totalMarginAmount(totalMarginAmount.setScale(2, RoundingMode.HALF_UP))
                .marginPercentage(marginPercentage)
                .blendedRiskScore(riskResult.getBlendedRiskScore())
                .riskLevel(riskResult.getRiskLevel())
                .requiresApproval(riskResult.getRequiresApproval())
                .requiresFinance(riskResult.getRequiresFinance())
                .explanation(riskResult.getFullExplanation())
                .lines(calcLines)
                .build();
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
        if (quotationRepository.findByQuoteNumber(quoteNumber).isPresent()) {
            quoteNumber = "Q-" + (System.currentTimeMillis() % 1000000);
        }
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
                .lines(new ArrayList<>())
                .build();

        if (request.getLines() != null && !request.getLines().isEmpty()) {
            applyLineItems(quotation, request.getLines());
        }

        recalculateQuotation(quotation, false);
        quotation = quotationRepository.save(quotation);

        createVersionSnapshot(quotation, salesRep.getName(), "Initial quotation draft created");

        auditService.log("QUOTATION", quotation.getId(), "CREATED", salesRep.getName(),
                null, "DRAFT", "New quotation initiated for customer: " + customer.getName(),
                quotation.getMarginPercentage());

        return quotation;
    }

    public Quotation updateQuotationLines(Long quotationId, List<LineItemRequest> lineRequests, String changedBy) {
        return updateQuotationLines(quotationId, lineRequests, changedBy, null);
    }

    public Quotation updateQuotationLines(Long quotationId, List<LineItemRequest> lineRequests, String changedBy, AuthUser authUser) {
        Quotation quotation = getQuotationByIdSecured(quotationId, authUser);

        if ("PENDING_APPROVAL".equals(quotation.getStatus()) || "CONFIRMED".equals(quotation.getStatus()) || "CLOSED".equals(quotation.getStatus())) {
            throw new IllegalStateException("Cannot edit quotation lines while status is " + quotation.getStatus());
        }

        BigDecimal beforeMargin = quotation.getMarginPercentage();

        quotation.getLines().clear();
        applyLineItems(quotation, lineRequests);
        recalculateQuotation(quotation, false);

        quotation.setVersion(quotation.getVersion() + 1);
        quotation.setLastActivityAt(LocalDateTime.now());
        quotation = quotationRepository.save(quotation);

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

    public Quotation confirmQuotation(Long quotationId, String confirmedBy) {
        Quotation quotation = getQuotationById(quotationId);
        quotation.setStatus("CONFIRMED");
        quotation.setLastActivityAt(LocalDateTime.now());
        quotationRepository.save(quotation);

        auditService.log("QUOTATION", quotation.getId(), "CONFIRMED", confirmedBy,
                quotation.getStatus(), "CONFIRMED", "Quotation confirmed and converted to order", BigDecimal.ZERO);
        return quotation;
    }

    public Quotation cancelQuotation(Long quotationId, String cancelledBy) {
        Quotation quotation = getQuotationById(quotationId);
        quotation.setStatus("CANCELLED");
        quotation.setLastActivityAt(LocalDateTime.now());
        quotationRepository.save(quotation);

        auditService.log("QUOTATION", quotation.getId(), "CANCELLED", cancelledBy,
                quotation.getStatus(), "CANCELLED", "Quotation cancelled", BigDecimal.ZERO);
        return quotation;
    }

    private Map<Long, Product> fetchProductsBatch(Collection<Long> productIds) {
        if (productIds == null || productIds.isEmpty()) {
            return Collections.emptyMap();
        }
        try {
            List<Product> products = productRepository.findAllByIdInWithCategory(productIds);
            if (products != null && !products.isEmpty()) {
                return products.stream().collect(Collectors.toMap(Product::getId, p -> p, (a, b) -> a));
            }
            products = productRepository.findAllById(productIds);
            if (products != null && !products.isEmpty()) {
                return products.stream().collect(Collectors.toMap(Product::getId, p -> p, (a, b) -> a));
            }
        } catch (Exception ignored) {
        }
        return Collections.emptyMap();
    }

    private void applyLineItems(Quotation quotation, List<LineItemRequest> lineRequests) {
        if (lineRequests == null || lineRequests.isEmpty()) return;

        List<Long> productIds = lineRequests.stream()
                .map(LineItemRequest::getProductId)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
        Map<Long, Product> productMap = fetchProductsBatch(productIds);

        for (LineItemRequest lr : lineRequests) {
            Product product = productMap.get(lr.getProductId());
            if (product == null) {
                product = productRepository.findById(lr.getProductId())
                        .orElseThrow(() -> new RuntimeException("Product not found: " + lr.getProductId()));
            }

            int qty = lr.getQuantity() != null && lr.getQuantity() > 0 ? lr.getQuantity() : 1;
            BigDecimal unitPrice = lr.getUnitPrice() != null ? lr.getUnitPrice() : product.getBasePrice();
            BigDecimal costPrice = product.getCostPrice() != null ? product.getCostPrice() : BigDecimal.ZERO;
            BigDecimal discount = lr.getDiscountPercent() != null ? lr.getDiscountPercent() : BigDecimal.ZERO;

            BigDecimal discountFactor = BigDecimal.ONE.subtract(discount.divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP));
            BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(qty)).multiply(discountFactor).setScale(2, RoundingMode.HALF_UP);
            BigDecimal totalCost = costPrice.multiply(BigDecimal.valueOf(qty)).setScale(2, RoundingMode.HALF_UP);
            BigDecimal marginAmount = lineTotal.subtract(totalCost).setScale(2, RoundingMode.HALF_UP);

            String lineType = lr.getLineType() != null ? lr.getLineType() : (Boolean.TRUE.equals(product.getIsSubscription()) ? "RECURRING" : "ONE_TIME");

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
        recalculateQuotation(quotation, true);
    }

    public void recalculateQuotation(Quotation quotation, boolean persist) {
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
            if (tierOpt.isEmpty()) {
                tierOpt = customerTierRepository.findByTierNameIgnoreCase(quotation.getCustomer().getTier());
            }
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
                ql.setStatus(Boolean.TRUE.equals(lod.getIsCulprit()) ? "OVER" : "OK");
            }
        }

        if (persist) {
            quotationRepository.save(quotation);
        }
    }

    public RiskCalculationResult getQuotationRiskBreakdown(Long quotationId) {
        Quotation quotation = getQuotationById(quotationId);

        BigDecimal customerTierCeiling = BigDecimal.valueOf(5.00);
        if (quotation.getCustomer() != null && quotation.getCustomer().getTier() != null) {
            Optional<CustomerTier> tierOpt = customerTierRepository.findByTierName(quotation.getCustomer().getTier());
            if (tierOpt.isEmpty()) {
                tierOpt = customerTierRepository.findByTierNameIgnoreCase(quotation.getCustomer().getTier());
            }
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
        return submitForApproval(quotationId, submittedBy, null);
    }

    public Map<String, Object> submitForApproval(Long quotationId, String submittedBy, AuthUser authUser) {
        Quotation quotation = getQuotationByIdSecured(quotationId, authUser);

        if (quotation.getLines() == null || quotation.getLines().isEmpty()) {
            throw new IllegalArgumentException("Cannot submit quotation with no line items");
        }

        if ("CONFIRMED".equals(quotation.getStatus()) || "CLOSED".equals(quotation.getStatus()) || "CANCELLED".equals(quotation.getStatus())) {
            throw new IllegalStateException("Cannot submit quotation in status: " + quotation.getStatus());
        }

        recalculateQuotation(quotation);
        RiskCalculationResult risk = getQuotationRiskBreakdown(quotationId);

        if (!risk.getRequiresApproval()) {
            // Auto-approved! No manager review needed.
            approvalRequestRepository.findByQuotationId(quotationId).ifPresent(req -> {
                approvalRequestRepository.delete(req);
                approvalRequestRepository.flush();
            });
            quotation.setStatus("APPROVED");
            quotation.setLastActivityAt(LocalDateTime.now());
            quotationRepository.save(quotation);

            auditService.log("QUOTATION", quotation.getId(), "AUTO_APPROVED", "System Engine",
                    "DRAFT", "APPROVED", risk.getFullExplanation(), BigDecimal.ZERO);

            return Map.of(
                    "status", "APPROVED",
                    "requiresApproval", false,
                    "riskScore", risk.getBlendedRiskScore(),
                    "riskLevel", risk.getRiskLevel(),
                    "requiresFinance", false,
                    "message", risk.getFullExplanation(),
                    "explanation", risk.getFullExplanation()
            );
        }

        // Approval required -> Route to Sales Manager, and optionally Finance
        quotation.setStatus("PENDING_APPROVAL");
        quotation.setLastActivityAt(LocalDateTime.now());
        quotationRepository.save(quotation);

        Optional<ApprovalRequest> existingReqOpt = approvalRequestRepository.findByQuotationId(quotationId);
        ApprovalRequest request;
        if (existingReqOpt.isPresent()) {
            request = existingReqOpt.get();
            request.setStatus("PENDING");
            request.setCurrentStage("SALES_MANAGER");
            request.setBlendedRiskScore(risk.getBlendedRiskScore());
            request.setRiskLevel(risk.getRiskLevel());
            request.setExplanation(risk.getFullExplanation());
            request.setUpdatedAt(LocalDateTime.now());
            request.getSteps().clear();
        } else {
            request = ApprovalRequest.builder()
                    .quotation(quotation)
                    .status("PENDING")
                    .currentStage("SALES_MANAGER")
                    .blendedRiskScore(risk.getBlendedRiskScore())
                    .riskLevel(risk.getRiskLevel())
                    .explanation(risk.getFullExplanation())
                    .build();
        }

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
        request.getSteps().add(managerStep);

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
            request.getSteps().add(financeStep);
        }

        approvalRequestRepository.saveAndFlush(request);

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
                "message", risk.getFullExplanation(),
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
