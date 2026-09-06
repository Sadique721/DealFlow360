import random

def generate_sql():
    sql = []
    sql.append("-- DealFlow360 Database Cleanup & 330-400 Record Mass Seed Expansion Script")
    sql.append("USE dealflow360_db;\n")
    
    dup_apex_user_ids = "15,16,17,18,19,20,21,22,23,24,25,26,27,28,29"
    dup_live_user_ids = "31,32,33,34,35"
    dup_acme_user_ids = "37,38,39,40,41,42"
    all_dup_user_ids = f"{dup_apex_user_ids},{dup_live_user_ids},{dup_acme_user_ids}"

    sql.append("-- 0. Reset idempotency cleanup for previous script runs")
    sql.append("DELETE FROM billing_schedules WHERE id > 5;")
    sql.append("DELETE FROM subscriptions WHERE id > 21;")
    sql.append("DELETE FROM invoices WHERE id > 40;")
    sql.append("DELETE FROM fulfillment_splits WHERE id > 28;")
    sql.append("DELETE FROM fulfillment_plans WHERE id > 20;")
    sql.append("DELETE FROM approval_steps WHERE id > 31;")
    sql.append("DELETE FROM approval_requests WHERE id > 23;")
    sql.append("DELETE FROM quotation_lines WHERE id > 94;")
    sql.append("DELETE FROM deal_health_flags WHERE id > 40;")
    sql.append("DELETE FROM negotiation_messages WHERE id > 34;")
    sql.append("DELETE FROM quotations WHERE id > 58;")
    sql.append("DELETE FROM product_variants WHERE id > 7;")
    sql.append("DELETE FROM warehouse_stocks WHERE product_id > 26;")
    sql.append("DELETE FROM products WHERE id > 26;")
    sql.append("DELETE FROM customers WHERE id > 21 AND portal_user_id NOT IN (14, 30, 36);")
    sql.append("DELETE FROM users WHERE email LIKE 'user_sec_%@dealflow360corp.com';\n")

    # 1. Re-link quotes, invoices, subscriptions to canonical customer IDs before deleting duplicate customer rows
    sql.append("-- 1. Re-link test transactions to canonical customers")
    sql.append(f"UPDATE quotations SET customer_id = 58 WHERE customer_id IN (SELECT id FROM customers WHERE portal_user_id IN ({dup_apex_user_ids}));")
    sql.append(f"UPDATE invoices SET customer_id = 58 WHERE customer_id IN (SELECT id FROM customers WHERE portal_user_id IN ({dup_apex_user_ids}));")
    sql.append(f"UPDATE subscriptions SET customer_id = 58 WHERE customer_id IN (SELECT id FROM customers WHERE portal_user_id IN ({dup_apex_user_ids}));")
    
    sql.append(f"UPDATE quotations SET customer_id = 85 WHERE customer_id IN (SELECT id FROM customers WHERE portal_user_id IN ({dup_live_user_ids}));")
    sql.append(f"UPDATE invoices SET customer_id = 85 WHERE customer_id IN (SELECT id FROM customers WHERE portal_user_id IN ({dup_live_user_ids}));")
    sql.append(f"UPDATE subscriptions SET customer_id = 85 WHERE customer_id IN (SELECT id FROM customers WHERE portal_user_id IN ({dup_live_user_ids}));")
    
    sql.append(f"UPDATE quotations SET customer_id = 96 WHERE customer_id IN (SELECT id FROM customers WHERE portal_user_id IN ({dup_acme_user_ids}));")
    sql.append(f"UPDATE invoices SET customer_id = 96 WHERE customer_id IN (SELECT id FROM customers WHERE portal_user_id IN ({dup_acme_user_ids}));")
    sql.append(f"UPDATE subscriptions SET customer_id = 96 WHERE customer_id IN (SELECT id FROM customers WHERE portal_user_id IN ({dup_acme_user_ids}));")

    # 2. Delete duplicate customer records
    sql.append(f"\n-- 2. Direct Deletion of Duplicate Customers")
    sql.append(f"DELETE FROM customers WHERE portal_user_id IN ({all_dup_user_ids});")
    
    # 3. Delete duplicate user records
    sql.append(f"\n-- 3. Direct Deletion of Duplicate Users")
    sql.append(f"DELETE FROM users WHERE id IN ({all_dup_user_ids});\n")
    
    pwd_hash = "$2a$10$SxudYTlNHCFiFqwwu0QFgu/kMMImeQjzQHZOt3mEVPt4gn6fld.7a"
    
    # 4. Populate USERS up to ~350 total
    sql.append("-- 4. Seed Users (Bringing total users to 350)")
    first_names = ["Aarav", "Aditi", "Rohan", "Priya", "Vikram", "Sneha", "Karan", "Ananya", "Rahul", "Meera", 
                   "Arjun", "Neha", "Siddharth", "Pooja", "Amit", "Kavya", "Deepak", "Ritu", "Gaurav", "Simran",
                   "Michael", "Sarah", "David", "Jessica", "James", "Emily", "Robert", "Amanda", "William", "Ashley"]
    last_names = ["Sharma", "Verma", "Patel", "Gupta", "Singh", "Kumar", "Joshi", "Mehta", "Nair", "Reddy",
                  "Rao", "Chopra", "Shah", "Malhotra", "Kapoor", "Smith", "Johnson", "Brown", "Taylor", "Miller"]
    teams_rep = ["North America Enterprise", "APAC Commercial", "EMEA Accounts", "Strategic Accounts", "Global Sales Leadership"]
    
    user_rows = []
    for i in range(1, 335):
        fn = random.choice(first_names)
        ln = random.choice(last_names)
        name = f"{fn} {ln}"
        email = f"user_sec_{i:04d}@dealflow360corp.com"
        r_val = random.random()
        if r_val < 0.75:
            role = "CUSTOMER"
            team = "External Business"
        elif r_val < 0.90:
            role = "SALES_REP"
            team = random.choice(teams_rep)
        elif r_val < 0.95:
            role = "SALES_MANAGER"
            team = "Global Sales Leadership"
        elif r_val < 0.98:
            role = "FINANCE"
            team = "Commercial Finance & RevOps"
        else:
            role = "ADMIN"
            team = "Executive Operations"
        
        user_rows.append(f"('{name}', '{email}', '{pwd_hash}', '{role}', '{team}', TRUE, NOW() - INTERVAL {random.randint(1, 180)} DAY)")
    
    sql.append("INSERT INTO users (name, email, password_hash, role, team, active, created_at) VALUES\n" + ",\n".join(user_rows) + ";\n")
    
    # 5. Populate CUSTOMERS up to ~350 total (with unique email and null portal_user_id to prevent non-unique result exceptions)
    sql.append("-- 5. Seed Customers (Bringing total customers to 350)")
    company_prefixes = ["Apex", "Vertex", "Quantum", "Nexus", "Synergy", "Horizon", "Pinnacle", "Starlight", "Omni", "Vanguard",
                        "Titan", "Echo", "Velocity", "Summit", "Zenith", "Aether", "Infinitum", "Optima", "Crest", "Solaris"]
    company_types = ["Logistics", "Technologies", "Solutions", "Enterprises", "Global", "Systems", "Industries", "Group", "Networks", "Capital"]
    tiers = ["BRONZE", "SILVER", "GOLD"]
    
    cust_rows = []
    for i in range(1, 330):
        cname = f"{random.choice(company_prefixes)} {random.choice(company_types)} {i}"
        cemail = f"procurement_{i:04d}@clientcorp{i}.com"
        cperson = f"{random.choice(first_names)} {random.choice(last_names)}"
        phone = f"+1-555-{random.randint(1000, 9999)}"
        addr = f"{random.randint(100, 999)} Commerce Way, Suite {random.randint(10, 500)}, CA"
        tier = random.choice(tiers)
        cust_rows.append(f"('{cname}', '{tier}', '{cemail}', '{cperson}', '{phone}', '{addr}', NULL, NOW() - INTERVAL {random.randint(1, 150)} DAY)")
    
    sql.append("INSERT INTO customers (name, tier, email, contact_person, phone, address, portal_user_id, created_at) VALUES\n" + ",\n".join(cust_rows) + ";\n")

    # 6. Populate PRODUCTS up to ~350 total
    sql.append("-- 6. Seed Products (Bringing total products to 350)")
    prod_names_hw = ["Enterprise Server R", "Workstation Pro", "Fiber Router X", "Storage Array SAN", "Switch 48-Port 10G",
                     "UPS Battery Backup 3000VA", "High-Gain Wi-Fi 7 AP", "KVM Matrix Switch", "Thermal Camera Endpoint", "Security Firewall Gateway"]
    prod_names_svc = ["Cloud Deployment Audit", "Custom API Integration", "Security Penetration Testing", "Database Performance Tuning",
                      "24/7 Dedicated Ops Lead", "Architecture Review Day", "DevOps Pipeline Setup", "Disaster Recovery Drill"]
    prod_names_sub = ["Enterprise Cloud License", "VIP Security Suite Sub", "Analytics Dashboard Pro", "Automated Backup SLA",
                      "AI Optimization Engine Seat", "Compliance Monitoring Plan", "Realtime Telemetry Feed"]
    
    prod_rows = []
    for i in range(1, 325):
        cat_id = random.choice([1, 2, 3])
        if cat_id == 1:
            pname = f"{random.choice(prod_names_hw)} {i}"
            bprice = round(random.uniform(200.0, 450.0), 2)
            cprice = round(bprice * random.uniform(0.55, 0.75), 2)
            uom = "Unit"
            is_sub = "FALSE"
            rec_int = "NULL"
            stock = random.randint(10, 200)
        elif cat_id == 2:
            pname = f"{random.choice(prod_names_svc)} {i}"
            bprice = round(random.uniform(500.0, 3000.0), 2)
            cprice = round(bprice * random.uniform(0.50, 0.70), 2)
            uom = random.choice(["Day", "Project", "Hour"])
            is_sub = "FALSE"
            rec_int = "NULL"
            stock = 999
        else:
            pname = f"{random.choice(prod_names_sub)} {i}"
            bprice = round(random.uniform(25.0, 500.0), 2)
            cprice = round(bprice * random.uniform(0.30, 0.50), 2)
            uom = "Seat/Mo"
            is_sub = "TRUE"
            rec_int = f"'{random.choice(['MONTHLY', 'QUARTERLY', 'YEARLY'])}'"
            stock = 999
        
        desc = f"High reliability commercial grade asset - {pname}."
        prod_rows.append(f"('{pname}', {cat_id}, {bprice}, {cprice}, '{uom}', 15.00, {is_sub}, {rec_int}, {stock}, TRUE, '{desc}', NOW())")
    
    sql.append("INSERT INTO products (name, category_id, base_price, cost_price, unit_of_measure, tax_percentage, is_subscription, recurring_interval, stock_on_hand, active, description, created_at) VALUES\n" + ",\n".join(prod_rows) + ";\n")

    # 7. Populate PRODUCT_VARIANTS dynamically using existing product IDs
    sql.append("-- 7. Seed Product Variants dynamically for products")
    sql.append("INSERT INTO product_variants (product_id, attribute_name, attribute_value, price_delta) SELECT id, 'RAM', '32GB Unified Memory', 150.00 FROM products WHERE id > 26;")
    sql.append("INSERT INTO product_variants (product_id, attribute_name, attribute_value, price_delta) SELECT id, 'Storage', '1TB High-Speed SSD', 250.00 FROM products WHERE id > 26;\n")

    # 8. Seed WAREHOUSE_STOCKS dynamically for products
    sql.append("-- 8. Seed Warehouse Stocks dynamically for products")
    sql.append("INSERT IGNORE INTO warehouse_stocks (warehouse_id, product_id, in_stock, reserved, available, reorder_level) SELECT 1, id, 80, 5, 75, 10 FROM products WHERE id NOT IN (SELECT product_id FROM warehouse_stocks WHERE warehouse_id = 1);")
    sql.append("INSERT IGNORE INTO warehouse_stocks (warehouse_id, product_id, in_stock, reserved, available, reorder_level) SELECT 2, id, 40, 2, 38, 5 FROM products WHERE id NOT IN (SELECT product_id FROM warehouse_stocks WHERE warehouse_id = 2);\n")

    # 9. Populate QUOTATIONS dynamically selecting valid customer_id and sales_rep_id
    sql.append("-- 9. Seed Quotations (Bringing total quotations to 350)")
    sql.append("INSERT INTO quotations (quote_number, customer_id, sales_rep_id, status, subtotal_amount, total_discount_amount, total_amount, total_cost, total_margin_amount, margin_percentage, blended_risk_score, version, portal_token, promised_delivery_date, last_activity_at, created_at)")
    sql.append("SELECT ")
    sql.append("  CONCAT('Q-EXP-', c.id, '-', ROW_NUMBER() OVER (ORDER BY c.id)),")
    sql.append("  c.id,")
    sql.append("  COALESCE((SELECT id FROM users WHERE role IN ('SALES_REP', 'ADMIN') ORDER BY RAND() LIMIT 1), 2),")
    sql.append("  ELT(1 + (c.id % 10), 'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'RETURNED', 'REJECTED', 'SENT_TO_CUSTOMER', 'UNDER_NEGOTIATION', 'CONFIRMED', 'FULFILLED', 'CLOSED'),")
    sql.append("  ROUND(3000 + (c.id * 15.5), 2),")
    sql.append("  ROUND((3000 + (c.id * 15.5)) * 0.08, 2),")
    sql.append("  ROUND((3000 + (c.id * 15.5)) * 0.92, 2),")
    sql.append("  ROUND((3000 + (c.id * 15.5)) * 0.70, 2),")
    sql.append("  ROUND((3000 + (c.id * 15.5)) * 0.22, 2),")
    sql.append("  22.00,")
    sql.append("  ROUND((c.id % 20) + 2.5, 2),")
    sql.append("  1,")
    sql.append("  CONCAT('tok-exp-dyn-', c.id, '-', UUID()),")
    sql.append("  DATE_ADD(CURRENT_DATE, INTERVAL (c.id % 30) DAY),")
    sql.append("  NOW() - INTERVAL (c.id % 60) DAY,")
    sql.append("  NOW() - INTERVAL (c.id % 90) DAY ")
    sql.append("FROM customers c WHERE c.id > 21;\n")

    # 10. Populate QUOTATION_LINES dynamically selecting valid quotation_id and product_id
    sql.append("-- 10. Seed Quotation Lines (Bringing total lines to 400+)")
    sql.append("INSERT INTO quotation_lines (quotation_id, product_id, quantity, unit_price, cost_price, discount_percent, line_total, margin_amount, line_type, subscription_plan_id, overage_points, status)")
    sql.append("SELECT ")
    sql.append("  q.id,")
    sql.append("  COALESCE((SELECT id FROM products ORDER BY RAND() LIMIT 1), 1),")
    sql.append("  2,")
    sql.append("  ROUND(q.total_amount * 0.45, 2),")
    sql.append("  ROUND(q.total_amount * 0.30, 2),")
    sql.append("  5.00,")
    sql.append("  ROUND(q.total_amount * 0.45 * 2 * 0.95, 2),")
    sql.append("  ROUND((q.total_amount * 0.45 * 2 * 0.95) - (q.total_amount * 0.30 * 2), 2),")
    sql.append("  IF(q.id % 3 = 0, 'RECURRING', 'ONE_TIME'),")
    sql.append("  IF(q.id % 3 = 0, 1, NULL),")
    sql.append("  0.00,")
    sql.append("  'OK' ")
    sql.append("FROM quotations q WHERE q.id > 58;\n")

    # 11. Populate APPROVAL_REQUESTS dynamically for quotations
    sql.append("-- 11. Seed Approval Requests (Bringing total to 350)")
    sql.append("INSERT INTO approval_requests (quotation_id, status, current_stage, blended_risk_score, risk_level, explanation, created_at)")
    sql.append("SELECT ")
    sql.append("  q.id,")
    sql.append("  ELT(1 + (q.id % 5), 'PENDING', 'APPROVED', 'REJECTED', 'RETURNED', 'AUTO_APPROVED'),")
    sql.append("  ELT(1 + (q.id % 3), 'SALES_MANAGER', 'FINANCE', 'COMPLETED'),")
    sql.append("  ROUND(q.blended_risk_score, 2),")
    sql.append("  IF(q.blended_risk_score > 15, 'HIGH', IF(q.blended_risk_score > 8, 'MEDIUM', 'LOW')),")
    sql.append("  CONCAT('Automated approval record generated for Quote #', q.quote_number),")
    sql.append("  NOW() - INTERVAL (q.id % 45) DAY ")
    sql.append("FROM quotations q WHERE q.id > 23 AND q.id NOT IN (SELECT quotation_id FROM approval_requests);\n")

    # 12. Populate APPROVAL_STEPS dynamically
    sql.append("-- 12. Seed Approval Steps (Bringing total to 380)")
    sql.append("INSERT INTO approval_steps (approval_request_id, quotation_id, level, required_role, status, approver_id, approver_name, assigned_at, comments, sla_deadline)")
    sql.append("SELECT ")
    sql.append("  ar.id,")
    sql.append("  ar.quotation_id,")
    sql.append("  IF(ar.id % 2 = 0, 'STAGE_1_MANAGER', 'STAGE_2_FINANCE'),")
    sql.append("  IF(ar.id % 2 = 0, 'SALES_MANAGER', 'FINANCE'),")
    sql.append("  ar.status,")
    sql.append("  IF(ar.id % 2 = 0, 4, 5),")
    sql.append("  IF(ar.id % 2 = 0, 'Maya Shah', 'Rohan Iyer'),")
    sql.append("  ar.created_at,")
    sql.append("  'Step review evaluated by governance rule.',")
    sql.append("  DATE_ADD(ar.created_at, INTERVAL 4 HOUR) ")
    sql.append("FROM approval_requests ar WHERE ar.id > 31;\n")

    # 13. Populate FULFILLMENT_PLANS dynamically
    sql.append("-- 13. Seed Fulfillment Plans (Bringing total to 350)")
    sql.append("INSERT INTO fulfillment_plans (quotation_id, status, total_shipping_cost, shipment_count, created_at)")
    sql.append("SELECT ")
    sql.append("  q.id,")
    sql.append("  ELT(1 + (q.id % 4), 'PENDING', 'SPLIT_PENDING', 'FULFILLED', 'OVERRIDDEN'),")
    sql.append("  ROUND(35.00 + (q.id % 50), 2),")
    sql.append("  1,")
    sql.append("  NOW() - INTERVAL (q.id % 50) DAY ")
    sql.append("FROM quotations q WHERE q.id > 20 AND q.id NOT IN (SELECT quotation_id FROM fulfillment_plans);\n")

    # 14. Populate FULFILLMENT_SPLITS dynamically
    sql.append("-- 14. Seed Fulfillment Splits (Bringing total to 360)")
    sql.append("INSERT INTO fulfillment_splits (fulfillment_plan_id, quotation_id, warehouse_id, product_id, quantity, is_backorder, estimated_cost, shipment_group, status)")
    sql.append("SELECT ")
    sql.append("  fp.id,")
    sql.append("  fp.quotation_id,")
    sql.append("  IF(fp.id % 2 = 0, 1, 2),")
    sql.append("  COALESCE((SELECT id FROM products ORDER BY RAND() LIMIT 1), 1),")
    sql.append("  5,")
    sql.append("  FALSE,")
    sql.append("  ROUND(fp.total_shipping_cost, 2),")
    sql.append("  CONCAT('GRP-', fp.id),")
    sql.append("  'ALLOCATED' ")
    sql.append("FROM fulfillment_plans fp WHERE fp.id > 28;\n")

    # 15. Populate INVOICES dynamically
    sql.append("-- 15. Seed Invoices (Bringing total to 350)")
    sql.append("INSERT INTO invoices (invoice_number, quotation_id, customer_id, invoice_type, amount, status, due_date, paid_at, delivery_status, created_at)")
    sql.append("SELECT ")
    sql.append("  CONCAT('INV-2026-DYN-', q.id),")
    sql.append("  q.id,")
    sql.append("  q.customer_id,")
    sql.append("  IF(q.id % 4 = 0, 'RECURRING', 'ONE_TIME'),")
    sql.append("  q.total_amount,")
    sql.append("  ELT(1 + (q.id % 3), 'UNPAID', 'PAID', 'VOID'),")
    sql.append("  DATE_ADD(CURRENT_DATE, INTERVAL (q.id % 45) DAY),")
    sql.append("  IF(q.id % 3 = 1, NOW(), NULL),")
    sql.append("  'INVOICED',")
    sql.append("  q.created_at ")
    sql.append("FROM quotations q WHERE q.id > 40;\n")

    # 16. Populate SUBSCRIPTIONS dynamically
    sql.append("-- 16. Seed Subscriptions (Bringing total to 350)")
    sql.append("INSERT INTO subscriptions (customer_id, quotation_id, quotation_line_id, plan_name, cycle, start_date, next_bill_date, amount, quantity, status, created_at)")
    sql.append("SELECT ")
    sql.append("  q.customer_id,")
    sql.append("  q.id,")
    sql.append("  NULL,")
    sql.append("  ELT(1 + (q.id % 4), 'Care Plan 2yr Monthly', 'Care Plan 1yr Monthly', 'Enterprise Support SLA Quarterly', 'Annual VIP Dedicated Plan'),")
    sql.append("  ELT(1 + (q.id % 3), 'MONTHLY', 'QUARTERLY', 'YEARLY'),")
    sql.append("  CURRENT_DATE,")
    sql.append("  DATE_ADD(CURRENT_DATE, INTERVAL 30 DAY),")
    sql.append("  ROUND(150.00 + (q.id % 100), 2),")
    sql.append("  1,")
    sql.append("  'ACTIVE',")
    sql.append("  q.created_at ")
    sql.append("FROM quotations q WHERE q.id > 21;\n")

    # 17. Populate BILLING_SCHEDULES dynamically
    sql.append("-- 17. Seed Billing Schedules (Bringing total to 350)")
    sql.append("INSERT INTO billing_schedules (subscription_id, quotation_line_id, billing_date, amount, status, proration_factor, proration_note, invoice_id)")
    sql.append("SELECT ")
    sql.append("  s.id,")
    sql.append("  NULL,")
    sql.append("  s.next_bill_date,")
    sql.append("  s.amount,")
    sql.append("  'PENDING',")
    sql.append("  1.0000,")
    sql.append("  'Scheduled billing milestone',")
    sql.append("  NULL ")
    sql.append("FROM subscriptions s WHERE s.id > 5;\n")

    # 18. Populate DEAL_HEALTH_FLAGS dynamically
    sql.append("-- 18. Seed Deal Health Flags (Bringing total to 350)")
    sql.append("INSERT INTO deal_health_flags (quotation_id, flag_type, severity, description, detected_at, resolved, resolved_at)")
    sql.append("SELECT ")
    sql.append("  q.id,")
    sql.append("  ELT(1 + (q.id % 4), 'STALLED', 'DISCOUNT_ANOMALY', 'DELIVERY_SLIPPAGE', 'SLA_BREACH'),")
    sql.append("  ELT(1 + (q.id % 4), 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),")
    sql.append("  CONCAT('Health monitoring trigger active on Quote #', q.quote_number),")
    sql.append("  NOW() - INTERVAL (q.id % 20) DAY,")
    sql.append("  IF(q.id % 2 = 0, TRUE, FALSE),")
    sql.append("  IF(q.id % 2 = 0, NOW(), NULL) ")
    sql.append("FROM quotations q WHERE q.id > 40;\n")

    # 19. Populate NEGOTIATION_MESSAGES dynamically
    sql.append("-- 19. Seed Negotiation Messages (Bringing total to 350)")
    sql.append("INSERT INTO negotiation_messages (quotation_id, sender_role, sender_name, message, line_reference_id, counter_discount_percent, requested_delivery_date, created_at)")
    sql.append("SELECT ")
    sql.append("  q.id,")
    sql.append("  ELT(1 + (q.id % 3), 'CUSTOMER', 'SALES_REP', 'SYSTEM'),")
    sql.append("  IF(q.id % 3 = 1, 'Buyer Procurement', 'Jay Rao'),")
    sql.append("  CONCAT('Negotiation update log for Quote #', q.quote_number),")
    sql.append("  NULL,")
    sql.append("  8.00,")
    sql.append("  DATE_ADD(CURRENT_DATE, INTERVAL 15 DAY),")
    sql.append("  NOW() - INTERVAL (q.id % 30) DAY ")
    sql.append("FROM quotations q WHERE q.id > 34;\n")

    with open("populate_db.sql", "w", encoding="utf-8") as f:
        f.write("\n".join(sql))
    print("populate_db.sql regenerated with unique customers successfully!")

if __name__ == "__main__":
    generate_sql()
