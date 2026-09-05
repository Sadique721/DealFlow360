-- DealFlow360 Approval Chains Schema & Seed (V3__approval_chains.sql)
-- Defines configurable governance approval chains mapping risk score brackets to required approver levels

CREATE TABLE IF NOT EXISTS approval_chains (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    min_score DECIMAL(6,2) NOT NULL,
    max_score DECIMAL(6,2) NOT NULL,
    required_level VARCHAR(50) NOT NULL, -- MANAGER, MANAGER_THEN_FINANCE
    description VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO approval_chains (id, min_score, max_score, required_level, description) VALUES
(1, 0.01, 10.00, 'MANAGER', 'Standard risk (Score 0.01–10.00) -> Sales Manager sign-off required'),
(2, 10.01, 999.00, 'MANAGER_THEN_FINANCE', 'Elevated risk (Score > 10.00 or severe overage) -> Two-tier Manager then Finance approval');
