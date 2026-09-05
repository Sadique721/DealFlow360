package com.dealflow360.websocket;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class WebSocketPublisher {

    private final SimpMessagingTemplate messagingTemplate;

    public WebSocketPublisher(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void publishMarginUpdate(Long quotationId, Map<String, Object> payload) {
        messagingTemplate.convertAndSend("/topic/margin-updates", payload);
    }

    public void publishDealHealthAlert(Map<String, Object> payload) {
        messagingTemplate.convertAndSend("/topic/deal-health", payload);
    }

    public void publishApprovalUpdate(Long quotationId, Map<String, Object> payload) {
        messagingTemplate.convertAndSend("/topic/approvals", payload);
    }

    public void publishNegotiationMessage(Long quotationId, Map<String, Object> payload) {
        messagingTemplate.convertAndSend("/topic/negotiations/" + quotationId, payload);
    }
}
