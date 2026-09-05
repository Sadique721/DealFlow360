package com.dealflow360.catalog.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerResponse {

    private Long id;
    private String name;
    private String tier;
    private BigDecimal tierMaxDiscount;
    private String email;
    private String contactPerson;
    private String phone;
    private String address;
    private Long portalUserId;
    private LocalDateTime createdAt;
}
