package com.dealflow360.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SignupRequest {
    @NotBlank
    private String name;

    @NotBlank
    @Email
    private String email;

    @NotBlank
    private String password;

    @Builder.Default
    private String role = "SALES_REP";

    @Builder.Default
    private String team = "Global Sales";

    private String tier;
    private String phone;
    private String address;
    private String contactPerson;
}
