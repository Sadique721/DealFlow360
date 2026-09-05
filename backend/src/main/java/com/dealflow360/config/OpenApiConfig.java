package com.dealflow360.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI dealFlowOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("DealFlow360 REST API")
                        .description("High-Velocity B2B Configure-Price-Quote (CPQ), Multi-Warehouse Logistics & Self-Governing Deal Engine")
                        .version("1.0.0")
                        .contact(new Contact().name("DealFlow360 Team").email("ops@dealflow360.com"))
                        .license(new License().name("Apache 2.0")))
                .addSecurityItem(new SecurityRequirement().addList("BearerAuth"))
                .components(new io.swagger.v3.oas.models.Components()
                        .addSecuritySchemes("BearerAuth", new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("Enter JWT Bearer token to authorize internal endpoints")));
    }
}
