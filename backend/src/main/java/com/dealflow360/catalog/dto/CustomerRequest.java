package com.dealflow360.catalog.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerRequest {

    @NotBlank(message = "Customer name is required")
    private String name;

    @NotBlank(message = "Customer tier is required (e.g. BRONZE, SILVER, GOLD, PLATINUM, ENTERPRISE)")
    private String tier;

    @NotBlank(message = "Email is required")
    @Email(message = "Must be a valid email address")
    private String email;

    private String contactPerson;

    private String phone;

    private String address;

    private Long portalUserId;
}
