package com.dealflow360.auth.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoginResponse {
    private String token;
    @Builder.Default
    private String type = "Bearer";
    private Long id;
    private String name;
    private String email;
    private String role;
    private String team;
    private String tier;
    private String phone;
    private String address;
    private String contactPerson;
}
