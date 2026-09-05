package com.dealflow360.invoice;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/invoices")
@Tag(name = "Invoicing & Delivery Reconciliation", description = "Endpoints for commercial invoices, payment tracking, and dispatch status reconciliation")
public class InvoiceController {

    private final InvoiceService invoiceService;

    public InvoiceController(InvoiceService invoiceService) {
        this.invoiceService = invoiceService;
    }

    @GetMapping
    @Operation(summary = "List all invoices with optional status filter")
    public ResponseEntity<List<Invoice>> listInvoices(@RequestParam(required = false) String status) {
        return ResponseEntity.ok(invoiceService.listInvoices(status));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get invoice by ID")
    public ResponseEntity<Invoice> getInvoice(@PathVariable Long id) {
        return ResponseEntity.ok(invoiceService.getInvoiceById(id));
    }

    @GetMapping("/quotation/{quotationId}")
    @Operation(summary = "Get all invoices linked to a specific quotation")
    public ResponseEntity<List<Invoice>> getInvoicesForQuotation(@PathVariable Long quotationId) {
        return ResponseEntity.ok(invoiceService.getInvoicesForQuotation(quotationId));
    }

    @PostMapping("/quotation/{quotationId}/generate")
    @Operation(summary = "Issue a new commercial invoice or recurring invoice for a confirmed quotation")
    public ResponseEntity<Invoice> generateInvoice(
            @PathVariable Long quotationId,
            @RequestParam(defaultValue = "ONE_TIME") String invoiceType,
            @RequestParam(required = false) BigDecimal amount) {
        return ResponseEntity.ok(invoiceService.generateInvoice(quotationId, invoiceType, amount));
    }

    @PostMapping("/{id}/pay")
    @Operation(summary = "Record customer payment against an outstanding invoice")
    public ResponseEntity<Invoice> recordPayment(@PathVariable Long id) {
        return ResponseEntity.ok(invoiceService.recordPayment(id));
    }

    @PostMapping("/{id}/delivery-status")
    @Operation(summary = "Update delivery-to-invoice reconciliation status (ORDER_CONFIRMED, SHIPPED, INVOICED, PAID)")
    public ResponseEntity<Invoice> updateDeliveryStatus(
            @PathVariable Long id,
            @RequestParam String deliveryStatus) {
        return ResponseEntity.ok(invoiceService.updateDeliveryStatus(id, deliveryStatus));
    }

    @PostMapping("/{id}/void")
    @Operation(summary = "Void an outstanding invoice")
    public ResponseEntity<Invoice> voidInvoice(
            @PathVariable Long id,
            @RequestParam(required = false) String reason) {
        return ResponseEntity.ok(invoiceService.voidInvoice(id, reason));
    }
}
