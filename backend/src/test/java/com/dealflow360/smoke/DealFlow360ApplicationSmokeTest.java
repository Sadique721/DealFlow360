package com.dealflow360.smoke;

import com.dealflow360.DealFlow360Application;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;

import static org.junit.jupiter.api.Assertions.assertNotNull;

@SpringBootTest(classes = DealFlow360Application.class)
class DealFlow360ApplicationSmokeTest {

    @Autowired
    private ApplicationContext applicationContext;

    @Test
    @DisplayName("Smoke Test: Complete Spring Boot Application Context boots with all beans and controllers")
    void contextLoads() {
        assertNotNull(applicationContext, "ApplicationContext must be initialized");
        assertNotNull(applicationContext.getBean("quotationController"), "QuotationController must be registered");
        assertNotNull(applicationContext.getBean("invoiceController"), "InvoiceController must be registered");
        assertNotNull(applicationContext.getBean("approvalController"), "ApprovalController must be registered");
        assertNotNull(applicationContext.getBean("fulfillmentController"), "FulfillmentController must be registered");
        assertNotNull(applicationContext.getBean("approvalSlaEscalationScheduler"), "ApprovalSlaEscalationScheduler must be registered");
    }
}
