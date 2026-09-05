-- DealFlow360 Seed Data (V2__seed_data.sql)
-- Password for all seed users is: password123 ($2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a)

-- 1. Identity & Users
INSERT INTO users (id, name, email, password_hash, role, team) VALUES
(1, 'Administrator', 'admin@dealflow360.com', '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a', 'ADMIN', 'Executive Operations'),
(2, 'Jay Rao', 'j.rao@dealflow360.com', '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a', 'SALES_REP', 'North America Enterprise'),
(3, 'Samir Patel', 's.patel@dealflow360.com', '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a', 'SALES_REP', 'Strategic Accounts'),
(4, 'Maya Shah', 'm.shah@dealflow360.com', '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a', 'SALES_MANAGER', 'Global Sales Leadership'),
(5, 'Rohan Iyer', 'r.iyer@dealflow360.com', '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a', 'FINANCE', 'Commercial Finance & RevOps'),
(6, 'Alex Mercer (Acme Buyer)', 'buyer@acmecorp.com', '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a', 'CUSTOMER', 'External Procurement');

-- 2. Customer Tiers
INSERT INTO customer_tiers (id, tier_name, max_discount_percent, description) VALUES
(1, 'BRONZE', 5.00, 'Standard commercial tier - up to 5% line discount'),
(2, 'SILVER', 10.00, 'Growth partners - up to 10% line discount'),
(3, 'GOLD', 15.00, 'High-volume tier - up to 15% line discount');

-- 3. Customers
INSERT INTO customers (id, name, tier, email, contact_person, phone, address, portal_user_id) VALUES
(1, 'Acme Corp', 'GOLD', 'buyer@acmecorp.com', 'Alex Mercer', '+1-555-0192', '100 Silicon Valley Way, San Jose, CA', 6),
(2, 'Beta Industries', 'SILVER', 'procurement@betaind.com', 'Elena Rostova', '+1-555-0143', '450 Industrial Parkway, Chicago, IL', NULL),
(3, 'Nova Retail Group', 'GOLD', 'ops@novaretail.com', 'David Kim', '+1-555-0177', '782 Broadway Blvd, New York, NY', NULL),
(4, 'Delta Logistics LLC', 'BRONZE', 'purchasing@deltallc.com', 'Sarah Connor', '+1-555-0188', '330 Harbor Expressway, Houston, TX', NULL),
(5, 'Zenith Systems Co', 'SILVER', 'deals@zenithco.com', 'Marcus Vance', '+1-555-0112', '12 Lakeview Plaza, Minneapolis, MN', NULL),
(6, 'Orion Technology Ltd', 'GOLD', 'info@orionltd.com', 'Priya Sharma', '+1-555-0155', '500 Tech Hub Drive, Austin, TX', NULL);

-- 4. Product Categories
INSERT INTO categories (id, name, max_discount_percent, sensitivity_gamma, description) VALUES
(1, 'Hardware', 15.00, 1.00, 'Physical IT hardware and enterprise peripherals. Standard risk.'),
(2, 'Services', 10.00, 2.00, 'Professional implementation and consulting services. High margin sensitivity (gamma = 2.0).'),
(3, 'Subscriptions', 12.00, 1.50, 'Recurring software licenses and extended care agreements.');

-- 5. Products
INSERT INTO products (id, name, category_id, base_price, cost_price, unit_of_measure, tax_percentage, is_subscription, recurring_interval, stock_on_hand, description) VALUES
(1, 'Laptop Pro 14', 1, 1200.00, 850.00, 'Unit', 15.00, FALSE, NULL, 50, 'High-performance 14-inch professional laptop with M-series architecture.'),
(2, 'Docking Station USB-C', 1, 180.00, 110.00, 'Unit', 15.00, FALSE, NULL, 80, 'Universal triple-display 4K Thunderbolt docking hub with 100W PD.'),
(3, 'Wireless Ergonomic Mouse', 1, 45.00, 22.00, 'Unit', 15.00, FALSE, NULL, 150, 'Precision sensor ergonomic wireless mouse with silent mechanical switches.'),
(4, 'UltraWide Monitor 34', 1, 650.00, 420.00, 'Unit', 15.00, FALSE, NULL, 35, '34-inch curved WQHD IPS display with 99% sRGB color accuracy.'),
(5, 'Onsite Setup Service', 2, 450.00, 300.00, 'Day', 10.00, FALSE, NULL, 999, 'On-premises workstation provisioning and network endpoint integration.'),
(6, 'Network Migration Consulting', 2, 1800.00, 1200.00, 'Project', 10.00, FALSE, NULL, 999, 'Comprehensive hybrid-cloud architecture migration and topology hardening.'),
(7, 'Dedicated Implementation Engineer', 2, 2500.00, 1600.00, 'Week', 10.00, FALSE, NULL, 999, 'Full-time embedded systems architect on-site for custom enterprise integration.'),
(8, 'Care Plan 2yr', 3, 46.00, 15.00, 'Seat/Mo', 0.00, TRUE, 'MONTHLY', 999, '24/7 next-business-day replacement guarantee and tier-3 VIP engineering access.'),
(9, 'Care Plan 1yr', 3, 30.00, 10.00, 'Seat/Mo', 0.00, TRUE, 'MONTHLY', 999, 'Standard 1-year extended warranty and continuous firmware lifecycle updates.'),
(10, 'Enterprise Support SLA', 3, 300.00, 80.00, 'Quarter', 0.00, TRUE, 'QUARTERLY', 999, 'Guaranteed 15-minute response SLA with dedicated crisis incident commander.');

-- 6. Product Variants
INSERT INTO product_variants (id, product_id, attribute_name, attribute_value, price_delta) VALUES
(1, 1, 'RAM', '16GB Unified Memory', 0.00),
(2, 1, 'RAM', '32GB Unified Memory', 200.00),
(3, 1, 'RAM', '64GB Unified Memory', 450.00),
(4, 1, 'Color', 'Space Gray', 0.00),
(5, 1, 'Color', 'Silver', 0.00),
(6, 2, 'Color', 'Midnight Black', 0.00),
(7, 2, 'Color', 'Anodized Silver', 10.00);

-- 7. Price Lists
INSERT INTO price_lists (id, customer_tier, currency, discount_adjustment_percent) VALUES
(1, 'BRONZE', 'USD', 0.00),
(2, 'SILVER', 'USD', 5.00),
(3, 'GOLD', 'USD', 10.00);

-- 8. Warehouses
INSERT INTO warehouses (id, name, location, shipping_cost_weight, base_freight) VALUES
(1, 'Main Warehouse', 'Chicago Logistics Center, IL', 1.00, 42.00),
(2, 'East Depot', 'New Jersey Port Depot, NJ', 1.40, 29.00);

-- 9. Warehouse Stocks
INSERT INTO warehouse_stocks (id, warehouse_id, product_id, in_stock, reserved, available, reorder_level) VALUES
(1, 1, 1, 40, 18, 22, 10), -- Laptop Pro 14 in Main WH
(2, 2, 1, 10, 6, 4, 5),   -- Laptop Pro 14 in East Depot
(3, 1, 2, 65, 12, 53, 15), -- Docking Station in Main WH
(4, 2, 2, 15, 0, 15, 10),  -- Docking Station in East Depot
(5, 1, 3, 100, 10, 90, 20), -- Mouse in Main WH
(6, 2, 3, 50, 0, 50, 15),   -- Mouse in East Depot
(7, 1, 4, 25, 5, 20, 8),    -- Monitor in Main WH
(8, 2, 4, 10, 0, 10, 5);    -- Monitor in East Depot

-- 10. Subscription Plans
INSERT INTO subscription_plans (id, name, billing_cycle, base_price, default_proration_rule, cancellation_rule) VALUES
(1, 'Care Plan 2yr Monthly', 'MONTHLY', 46.00, 'DAILY_PRORATION', 'PARTIAL_REFUND_UNUSED_DAYS'),
(2, 'Care Plan 1yr Monthly', 'MONTHLY', 30.00, 'DAILY_PRORATION', 'PARTIAL_REFUND_UNUSED_DAYS'),
(3, 'Enterprise Support SLA Quarterly', 'QUARTERLY', 300.00, 'DAILY_PRORATION', 'PARTIAL_REFUND_UNUSED_DAYS'),
(4, 'Annual VIP Dedicated Plan', 'YEARLY', 1200.00, 'MONTHLY_PRORATION', 'NO_REFUND_AFTER_30_DAYS');

-- 11. Upsell Rules
INSERT INTO upsell_rules (id, base_product_id, suggested_product_id, co_purchase_score, is_promoted, promo_tag, promo_discount_percent, min_margin_threshold) VALUES
(1, 1, 3, 0.92, FALSE, NULL, 0.00, 20.00), -- Laptop -> Mouse (+18 Margin)
(2, 1, 2, 0.88, TRUE, 'Promo 12% off', 12.00, 25.00), -- Laptop -> Docking Hub (+35 Margin)
(3, 1, 8, 0.95, TRUE, 'Best Protection', 0.00, 30.00), -- Laptop -> 2yr Care Plan (+46 Margin)
(4, 4, 2, 0.82, FALSE, NULL, 0.00, 20.00); -- Monitor -> Docking Hub

-- 12. Quotations (Realistic Demo Deals mapped to Judge Test Flow)
-- Q-1042: Acme Corp (GOLD) - The exact Judge Scenario: Gold customer, Laptop discount 12% (OK), Setup Service 18% (OVER by 8pt) -> Blended Risk triggers approval
INSERT INTO quotations (id, quote_number, customer_id, sales_rep_id, status, subtotal_amount, total_discount_amount, total_amount, total_cost, total_margin_amount, margin_percentage, blended_risk_score, version, portal_token, promised_delivery_date, last_activity_at) VALUES
(1, 'Q-1042', 1, 2, 'PENDING_APPROVAL', 1696.00, 229.20, 1466.80, 1165.00, 301.80, 20.57, 18.00, 1, 'magic-token-acme-1042-demo', '2026-09-20', NOW()),
(2, 'Q-1039', 2, 2, 'PENDING_APPROVAL', 3200.00, 380.00, 2820.00, 2100.00, 720.00, 25.53, 9.50, 1, 'magic-token-beta-1039-demo', '2026-09-25', NOW() - INTERVAL 1 DAY),
(3, 'Q-1035', 3, 3, 'APPROVED', 5400.00, 270.00, 5130.00, 3800.00, 1330.00, 25.92, 0.00, 1, 'magic-token-nova-1035-demo', '2026-09-18', NOW() - INTERVAL 2 DAY),
(4, 'Q-1030', 5, 2, 'UNDER_NEGOTIATION', 4100.00, 300.00, 3800.00, 2900.00, 900.00, 23.68, 4.00, 2, 'magic-token-zenith-1030-demo', '2026-09-15', NOW() - INTERVAL 9 DAY), -- STALLED (>7 days)
(5, 'Q-1041', 4, 3, 'DRAFT', 2800.00, 672.00, 2128.00, 1700.00, 428.00, 20.11, 24.00, 1, 'magic-token-delta-1041-demo', '2026-09-30', NOW() - INTERVAL 3 HOUR), -- Rep discount anomaly (24% vs avg 8%)
(6, 'Q-1045', 6, 2, 'CONFIRMED', 7200.00, 500.00, 6700.00, 4900.00, 1800.00, 26.86, 0.00, 1, 'magic-token-orion-1045-demo', '2026-09-22', NOW() - INTERVAL 5 HOUR);

-- Lines for Q-1042
INSERT INTO quotation_lines (id, quotation_id, product_id, quantity, unit_price, cost_price, discount_percent, line_total, margin_amount, line_type, subscription_plan_id, overage_points, status) VALUES
(1, 1, 1, 1, 1200.00, 850.00, 12.00, 1056.00, 206.00, 'ONE_TIME', NULL, 0.00, 'OK'), -- Laptop 12% <= 15% allowed
(2, 1, 5, 1, 450.00, 300.00, 18.00, 369.00, 69.00, 'ONE_TIME', NULL, 8.00, 'OVER'),   -- Setup Service 18% > 10% allowed! OVER by 8pt
(3, 1, 8, 1, 46.00, 15.00, 9.13, 41.80, 26.80, 'RECURRING', 1, 0.00, 'OK');           -- Care Plan 2yr Monthly

-- Lines for Q-1039
INSERT INTO quotation_lines (id, quotation_id, product_id, quantity, unit_price, cost_price, discount_percent, line_total, margin_amount, line_type, subscription_plan_id, overage_points, status) VALUES
(4, 2, 1, 2, 1200.00, 850.00, 10.00, 2160.00, 460.00, 'ONE_TIME', NULL, 0.00, 'OK'),
(5, 2, 4, 1, 650.00, 420.00, 8.00, 598.00, 178.00, 'ONE_TIME', NULL, 0.00, 'OK');

-- Lines for Q-1045
INSERT INTO quotation_lines (id, quotation_id, product_id, quantity, unit_price, cost_price, discount_percent, line_total, margin_amount, line_type, subscription_plan_id, overage_points, status) VALUES
(6, 6, 1, 5, 1200.00, 850.00, 5.00, 5700.00, 1450.00, 'ONE_TIME', NULL, 0.00, 'OK'),
(7, 6, 2, 5, 180.00, 110.00, 5.00, 855.00, 305.00, 'ONE_TIME', NULL, 0.00, 'OK'),
(8, 6, 8, 5, 46.00, 15.00, 0.00, 230.00, 155.00, 'RECURRING', 1, 0.00, 'OK');

-- 13. Approval Request for Q-1042
INSERT INTO approval_requests (id, quotation_id, status, current_stage, blended_risk_score, risk_level, explanation) VALUES
(1, 1, 'PENDING', 'SALES_MANAGER', 18.00, 'HIGH', 'Line 2 [Onsite Setup Service] exceeds Services category ceiling by 8.00 percentage points (given 18.00%, cap 10.00%). Single line spike penalty +5 applied. Blended Risk Score = 18.00 (High Risk). Requires Sales Manager followed by Finance Controller sequential approval.');

INSERT INTO approval_steps (id, approval_request_id, quotation_id, level, required_role, status, approver_id, approver_name, assigned_at, comments, sla_deadline) VALUES
(1, 1, 1, 'STAGE_1_MANAGER', 'SALES_MANAGER', 'PENDING', 4, 'Maya Shah', NOW(), NULL, NOW() + INTERVAL 2 HOUR),
(2, 1, 1, 'STAGE_2_FINANCE', 'FINANCE', 'PENDING', 5, 'Rohan Iyer', NOW(), NULL, NOW() + INTERVAL 4 HOUR);

-- Approval Request for Q-1039
INSERT INTO approval_requests (id, quotation_id, status, current_stage, blended_risk_score, risk_level, explanation) VALUES
(2, 2, 'PENDING', 'SALES_MANAGER', 9.50, 'MEDIUM', 'Blended risk score 9.50 within manager review threshold (<= 10.0). Requires Sales Manager approval.');

INSERT INTO approval_steps (id, approval_request_id, quotation_id, level, required_role, status, approver_id, approver_name, assigned_at, comments, sla_deadline) VALUES
(3, 2, 2, 'STAGE_1_MANAGER', 'SALES_MANAGER', 'PENDING', 4, 'Maya Shah', NOW() - INTERVAL 1 DAY, NULL, NOW() + INTERVAL 1 HOUR);

-- 14. Fulfillment Plans
-- Q-1045 (Orion Ltd) Fulfillment Plan - Multi-Warehouse Split:
-- Laptop Pro 14: 5 units needed -> Main WH fulfills 4, East Depot fulfills 1. Docking Station: 5 units from Main WH.
INSERT INTO fulfillment_plans (id, quotation_id, status, total_shipping_cost, shipment_count) VALUES
(1, 6, 'FULFILLED', 71.00, 2);

INSERT INTO fulfillment_splits (id, fulfillment_plan_id, quotation_id, warehouse_id, product_id, quantity, is_backorder, estimated_cost, shipment_group, status) VALUES
(1, 1, 6, 1, 1, 4, FALSE, 42.00, 'MAIN-SHIP-01', 'SHIPPED'),
(2, 1, 6, 2, 1, 1, FALSE, 29.00, 'EAST-SHIP-02', 'SHIPPED'),
(3, 1, 6, 1, 2, 5, FALSE, 0.00, 'MAIN-SHIP-01', 'SHIPPED');

-- 15. Invoices & Subscriptions for Q-1045
INSERT INTO invoices (id, invoice_number, quotation_id, customer_id, invoice_type, amount, status, due_date, paid_at, delivery_status) VALUES
(1, 'INV-2026-001', 6, 6, 'ONE_TIME', 6555.00, 'PAID', '2026-10-01', NOW(), 'PAID'),
(2, 'INV-2026-002', 6, 6, 'RECURRING', 230.00, 'PAID', '2026-10-01', NOW(), 'PAID');

INSERT INTO subscriptions (id, customer_id, quotation_id, quotation_line_id, plan_name, cycle, start_date, next_bill_date, amount, quantity, status) VALUES
(1, 6, 6, 8, 'Care Plan 2yr Monthly', 'MONTHLY', '2026-09-01', '2026-10-01', 230.00, 5, 'ACTIVE');

INSERT INTO billing_schedules (id, subscription_id, quotation_line_id, billing_date, amount, status, proration_factor, proration_note, invoice_id) VALUES
(1, 1, 8, '2026-09-01', 230.00, 'PAID', 1.0000, 'Cycle 1: Full Month Initial Charge', 2),
(2, 1, 8, '2026-10-01', 230.00, 'PENDING', 1.0000, 'Cycle 2: Upcoming recurring milestone', NULL),
(3, 1, 8, '2026-11-01', 230.00, 'PENDING', 1.0000, 'Cycle 3: Upcoming recurring milestone', NULL);

-- 16. Deal Health Flags
INSERT INTO deal_health_flags (id, quotation_id, flag_type, severity, description, detected_at, resolved) VALUES
(1, 4, 'STALLED', 'HIGH', 'Quotation Q-1030 for Zenith Systems Co has had zero sales activity for 9 consecutive days (configured threshold: 7 days). Stage: UNDER_NEGOTIATION.', NOW() - INTERVAL 2 DAY, FALSE),
(2, 5, 'DISCOUNT_ANOMALY', 'CRITICAL', 'Sales Rep Samir Patel applied a 24.00% discount on quotation Q-1041. Rep historical confirmed average is 8.20% (Z-score = 2.45 >= 2.0). Potential margin leak.', NOW() - INTERVAL 3 HOUR, FALSE),
(3, 2, 'DELIVERY_SLIPPAGE', 'MEDIUM', 'Quotation Q-1039 promised delivery date (Sep 25) is at risk due to pending Stage-1 approval latency (assigned > 24h ago).', NOW() - INTERVAL 6 HOUR, FALSE);

-- 17. Negotiation Messages for Q-1030
INSERT INTO negotiation_messages (id, quotation_id, sender_role, sender_name, message, line_reference_id, counter_discount_percent, requested_delivery_date, created_at) VALUES
(1, 4, 'SALES_REP', 'Jay Rao', 'Hi Marcus, please find the proposed configuration attached. We have bundled the UltraWide displays with docking hubs.', NULL, NULL, '2026-09-15', NOW() - INTERVAL 10 DAY),
(2, 4, 'CUSTOMER', 'Marcus Vance', 'Thanks Jay. Can we get an additional 4% discount on the UltraWide displays? Our procurement ceiling is firm at $3,650.', 5, 12.00, '2026-09-20', NOW() - INTERVAL 9 DAY);

-- 18. Audit Logs
INSERT INTO audit_logs (id, entity_type, entity_id, action, performed_by, timestamp, before_state, after_state, reason, margin_delta) VALUES
(1, 'QUOTATION', 1, 'SUBMITTED', 'Jay Rao (Sales Rep)', NOW(), 'DRAFT', 'PENDING_APPROVAL', 'Submitted for review. Setup Service line exceeds 10% ceiling by 8 points.', -3.80),
(2, 'QUOTATION', 6, 'CONFIRMED', 'Priya Sharma (Customer)', NOW() - INTERVAL 5 HOUR, 'SENT_TO_CUSTOMER', 'CONFIRMED', 'Accepted terms via tokenized Customer Portal.', 0.00),
(3, 'FULFILLMENT', 6, 'SPLIT_OPTIMIZED', 'System Optimizer', NOW() - INTERVAL 4 HOUR, 'PENDING', 'SPLIT_PENDING', 'Greedy freight minimization routed 4 units to Main WH and 1 unit to East Depot. Saved $22.00 in cross-zone freight.', 0.00);
