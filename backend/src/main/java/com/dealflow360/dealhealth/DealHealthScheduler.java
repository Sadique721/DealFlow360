package com.dealflow360.dealhealth;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class DealHealthScheduler {

    private final AnomalyDetectionService anomalyDetectionService;

    public DealHealthScheduler(AnomalyDetectionService anomalyDetectionService) {
        this.anomalyDetectionService = anomalyDetectionService;
    }

    // Runs every 60 seconds in the background
    @Scheduled(fixedRate = 60000, initialDelay = 10000)
    public void runScheduledScan() {
        anomalyDetectionService.runFullHealthScan();
    }
}
