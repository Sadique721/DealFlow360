package com.dealflow360.reporting;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping({"/api/reports", "/api/reporting"})
@Tag(name = "Reporting & Analytics", description = "Endpoints for executive dashboards, revenue KPIs, and exportable reports")
public class ReportingController {

    private final ReportingService reportingService;

    public ReportingController(ReportingService reportingService) {
        this.reportingService = reportingService;
    }

    @GetMapping({"/kpis", "/dashboard"})
    @Operation(summary = "Get executive sales performance KPIs and governance metrics")
    public ResponseEntity<Map<String, Object>> getKpis(
            @RequestParam(required = false, defaultValue = "all") String period,
            @RequestParam(required = false) Long repId,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(reportingService.getExecutiveKpis(period, repId, status));
    }

    @GetMapping("/export")
    @Operation(summary = "Export quotations and performance reports as CSV")
    public ResponseEntity<byte[]> exportReports(
            @RequestParam(required = false) Long repId,
            @RequestParam(required = false) String status) {
        String csv = reportingService.exportToCsv(repId, status);
        byte[] bytes = csv.getBytes(java.nio.charset.StandardCharsets.UTF_8);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=dealflow360_sales_report.csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(bytes);
    }
}
