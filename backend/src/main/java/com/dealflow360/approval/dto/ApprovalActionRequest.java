package com.dealflow360.approval.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApprovalActionRequest {
    private Long quotationId;
    private Long stepId;
    private String action; // APPROVE, REJECT, RETURN
    private String comments;
}
