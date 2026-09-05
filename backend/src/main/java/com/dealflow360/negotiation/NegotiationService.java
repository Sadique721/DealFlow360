package com.dealflow360.negotiation;

import com.dealflow360.audit.AuditService;
import com.dealflow360.discount.RiskCalculationResult;
import com.dealflow360.invoice.InvoiceService;
import com.dealflow360.negotiation.dto.NegotiationProposalRequest;
import com.dealflow360.negotiation.dto.PortalQuotationView;
import com.dealflow360.quotation.Quotation;
import com.dealflow360.quotation.QuotationLine;
import com.dealflow360.quotation.QuotationRepository;
import com.dealflow360.quotation.QuotationService;
import com.dealflow360.subscription.SubscriptionService;
import com.dealflow360.warehouse.FulfillmentService;
import com.dealflow360.websocket.WebSocketPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@Transactional
public class NegotiationService {

    private final QuotationRepository quotationRepository;
    private final NegotiationMessageRepository negotiationMessageRepository;
    private final QuotationService quotationService;
    private final FulfillmentService fulfillmentService;
    private final SubscriptionService subscriptionService;
    private final InvoiceService invoiceService;
    private final AuditService auditService;
    private final WebSocketPublisher webSocketPublisher;

    public NegotiationService(QuotationRepository quotationRepository,
                              NegotiationMessageRepository negotiationMessageRepository,
                              QuotationService quotationService,
                              FulfillmentService fulfillmentService,
                              SubscriptionService subscriptionService,
                              InvoiceService invoiceService,
                              AuditService auditService,
                              WebSocketPublisher webSocketPublisher) {
        this.quotationRepository = quotationRepository;
        this.negotiationMessageRepository = negotiationMessageRepository;
        this.quotationService = quotationService;
        this.fulfillmentService = fulfillmentService;
        this.subscriptionService = subscriptionService;
        this.invoiceService = invoiceService;
        this.auditService = auditService;
        this.webSocketPublisher = webSocketPublisher;
    }

    public PortalQuotationView getPortalView(String portalToken) {
        Quotation quote = quotationRepository.findByPortalToken(portalToken)
                .orElseThrow(() -> new RuntimeException("Invalid portal access token: " + portalToken));

        List<PortalQuotationView.PortalLineView> lineViews = new ArrayList<>();
        for (QuotationLine line : quote.getLines()) {
            lineViews.add(PortalQuotationView.PortalLineView.builder()
                    .lineId(line.getId())
                    .productId(line.getProduct().getId())
                    .productName(line.getProduct().getName())
                    .categoryName(line.getProduct().getCategory().getName())
                    .quantity(line.getQuantity())
                    .unitPrice(line.getUnitPrice())
                    .discountPercent(line.getDiscountPercent())
                    .lineTotal(line.getLineTotal())
                    .lineType(line.getLineType())
                    .build());
        }

        List<NegotiationMessage> messages = negotiationMessageRepository.findByQuotationIdOrderByCreatedAtAsc(quote.getId());
        List<PortalQuotationView.PortalMessageView> messageViews = new ArrayList<>();
        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("MMM dd, yyyy HH:mm");

        for (NegotiationMessage msg : messages) {
            messageViews.add(PortalQuotationView.PortalMessageView.builder()
                    .id(msg.getId())
                    .senderRole(msg.getSenderRole())
                    .senderName(msg.getSenderName())
                    .message(msg.getMessage())
                    .lineReferenceId(msg.getLineReferenceId())
                    .counterDiscountPercent(msg.getCounterDiscountPercent())
                    .requestedDeliveryDate(msg.getRequestedDeliveryDate())
                    .timestamp(msg.getCreatedAt().format(dtf))
                    .build());
        }

        return PortalQuotationView.builder()
                .quotationId(quote.getId())
                .quoteNumber(quote.getQuoteNumber())
                .customerName(quote.getCustomer().getName())
                .customerEmail(quote.getCustomer().getEmail())
                .salesRepName(quote.getSalesRep().getName())
                .status(quote.getStatus())
                .subtotalAmount(quote.getSubtotalAmount())
                .totalDiscountAmount(quote.getTotalDiscountAmount())
                .totalAmount(quote.getTotalAmount())
                .promisedDeliveryDate(quote.getPromisedDeliveryDate())
                .version(quote.getVersion())
                .lines(lineViews)
                .messages(messageViews)
                .build();
    }

    public NegotiationMessage submitMessage(String portalToken, NegotiationProposalRequest request, String senderRole) {
        Quotation quote = quotationRepository.findByPortalToken(portalToken)
                .orElseThrow(() -> new RuntimeException("Invalid portal token: " + portalToken));

        // If customer proposed a counter discount on a specific line, adjust the quotation line discount!
        if (request.getLineReferenceId() != null && request.getCounterDiscountPercent() != null) {
            for (QuotationLine line : quote.getLines()) {
                if (line.getId().equals(request.getLineReferenceId())) {
                    line.setDiscountPercent(request.getCounterDiscountPercent());
                    BigDecimal factor = BigDecimal.ONE.subtract(request.getCounterDiscountPercent().divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP));
                    line.setLineTotal(line.getUnitPrice().multiply(BigDecimal.valueOf(line.getQuantity())).multiply(factor).setScale(2, RoundingMode.HALF_UP));
                    break;
                }
            }
            quotationService.recalculateQuotation(quote);
        }

        if (request.getRequestedDeliveryDate() != null) {
            quote.setPromisedDeliveryDate(request.getRequestedDeliveryDate());
        }

        quote.setStatus("UNDER_NEGOTIATION");
        quote.setLastActivityAt(LocalDateTime.now());
        quotationRepository.save(quote);

        NegotiationMessage message = NegotiationMessage.builder()
                .quotationId(quote.getId())
                .senderRole(senderRole != null ? senderRole : "CUSTOMER")
                .senderName(request.getSenderName() != null ? request.getSenderName() : "Customer Buyer")
                .message(request.getMessage())
                .lineReferenceId(request.getLineReferenceId())
                .counterDiscountPercent(request.getCounterDiscountPercent())
                .requestedDeliveryDate(request.getRequestedDeliveryDate())
                .build();

        message = negotiationMessageRepository.save(message);

        auditService.log("QUOTATION", quote.getId(), "NEGOTIATION_COUNTER", message.getSenderName(),
                "SENT_TO_CUSTOMER", "UNDER_NEGOTIATION",
                request.getMessage() + (request.getCounterDiscountPercent() != null ? " (Counter discount: " + request.getCounterDiscountPercent() + "%)" : ""),
                BigDecimal.ZERO);

        // Emit STOMP event
        webSocketPublisher.publishNegotiationMessage(quote.getId(), Map.of(
                "quotationId", quote.getId(),
                "quoteNumber", quote.getQuoteNumber(),
                "senderRole", message.getSenderRole(),
                "senderName", message.getSenderName(),
                "message", message.getMessage(),
                "counterDiscount", message.getCounterDiscountPercent() != null ? message.getCounterDiscountPercent() : 0
        ));

        return message;
    }

    public Map<String, Object> confirmPortalQuotation(String portalToken, String confirmedBy) {
        Quotation quote = quotationRepository.findByPortalToken(portalToken)
                .orElseThrow(() -> new RuntimeException("Invalid portal token: " + portalToken));

        quotationService.recalculateQuotation(quote);
        RiskCalculationResult risk = quotationService.getQuotationRiskBreakdown(quote.getId());

        // CRITICAL STATE LOOP:
        // If final terms exceed approval thresholds, quotation automatically re-locks and re-enters approval flow!
        if (risk.getRequiresApproval()) {
            quote.setStatus("PENDING_APPROVAL");
            quote.setLastActivityAt(LocalDateTime.now());
            quotationRepository.save(quote);

            // Re-trigger approval routing
            quotationService.submitForApproval(quote.getId(), confirmedBy != null ? confirmedBy : "Customer Portal (Counter)");

            auditService.log("QUOTATION", quote.getId(), "COUNTER_RE_APPROVAL_TRIGGERED", confirmedBy,
                    "UNDER_NEGOTIATION", "PENDING_APPROVAL",
                    "Customer confirmed terms with discounts exceeding policy threshold. Re-locked for managerial sign-off. " + risk.getFullExplanation(),
                    BigDecimal.ZERO);

            return Map.of(
                    "status", "PENDING_APPROVAL",
                    "reApprovedRequired", true,
                    "riskScore", risk.getBlendedRiskScore(),
                    "message", "Terms confirmed by customer exceed standard discount allowances. Quotation automatically re-locked and routed for internal Manager approval."
            );
        }

        // Within policy threshold: Order moves directly to fulfillment and billing!
        quote.setStatus("CONFIRMED");
        quote.setLastActivityAt(LocalDateTime.now());
        quotationRepository.save(quote);

        // 1. Auto Split Warehouses
        fulfillmentService.generateOrGetPlan(quote.getId());

        // 2. Generate Subscriptions if recurring items present
        subscriptionService.createSubscriptionsFromQuotation(quote);

        // 3. Issue initial invoice
        invoiceService.generateInvoice(quote.getId(), "ONE_TIME", quote.getTotalAmount());

        auditService.log("QUOTATION", quote.getId(), "CONFIRMED", confirmedBy != null ? confirmedBy : "Customer Buyer",
                "UNDER_NEGOTIATION", "CONFIRMED",
                "Final terms accepted via Customer Portal. Order confirmed and dispatched to warehouse logistics.",
                BigDecimal.ZERO);

        return Map.of(
                "status", "CONFIRMED",
                "reApprovedRequired", false,
                "message", "Quotation successfully confirmed! Fulfillment splits and invoice generated."
        );
    }
}
