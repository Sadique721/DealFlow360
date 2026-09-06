import random
import datetime

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
    
    pwd_hash = "$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a"
    
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
    
    # 5. Populate CUSTOMERS up to ~350 total
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
    
    sql.append("-- Link customer catalog entries to portal users")
    sql.append("UPDATE customers c JOIN users u ON u.email LIKE 'user_sec_%@dealflow360corp.com' AND u.role = 'CUSTOMER' AND c.portal_user_id IS NULL SET c.portal_user_id = u.id WHERE c.id > 21 AND rand() < 0.7;\n")

    # 6. Populate PRODUCTS up to ~350 total BEFORE product_variants
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

    # 7. Populate PRODUCT_VARIANTS up to ~350 total (referencing products 1..350)
    sql.append("-- 7. Seed Product Variants (Bringing total variants to 350)")
    var_rows = []
    attrs = [("RAM", ["16GB", "32GB", "64GB", "128GB"]), ("Color", ["Space Gray", "Silver", "Black"]), ("Storage", ["512GB SSD", "1TB SSD", "2TB NVMe"])]
    for i in range(1, 344):
        pid = random.randint(1, 350)
        attr, vals = random.choice(attrs)
        val = random.choice(vals)
        delta = round(random.choice([0.0, 50.0, 150.0, 300.0]), 2)
        var_rows.append(f"({pid}, '{attr}', '{val}', {delta})")
    sql.append("INSERT INTO product_variants (product_id, attribute_name, attribute_value, price_delta) VALUES\n" + ",\n".join(var_rows) + ";\n")

    # 8. Seed WAREHOUSE_STOCKS for newly inserted products
    sql.append("-- 8. Seed Warehouse Stocks for Products")
    wh_stock_rows = []
    for pid in range(27, 351):
        wh_stock_rows.append(f"(1, {pid}, {random.randint(20, 100)}, 0, {random.randint(20, 100)}, 10)")
        wh_stock_rows.append(f"(2, {pid}, {random.randint(10, 50)}, 0, {random.randint(10, 50)}, 5)")
    sql.append("INSERT IGNORE INTO warehouse_stocks (warehouse_id, product_id, in_stock, reserved, available, reorder_level) VALUES\n" + ",\n".join(wh_stock_rows) + ";\n")

    # 9. Populate QUOTATIONS up to ~350 total
    sql.append("-- 9. Seed Quotations (Bringing total quotations to 350)")
    quote_statuses = ["DRAFT", "PENDING_APPROVAL", "APPROVED", "RETURNED", "REJECTED", "SENT_TO_CUSTOMER", "UNDER_NEGOTIATION", "CONFIRMED", "FULFILLED", "CLOSED"]
    
    quote_rows = []
    for i in range(1001, 1293):
        qnum = f"Q-EXP-{i}"
        cust_id = random.randint(1, 350)
        sales_rep_id = random.choice([1, 2, 3, 4, 7, 9, 12])
        status = random.choice(quote_statuses)
        subtotal = round(random.uniform(1500.0, 15000.0), 2)
        disc = round(subtotal * random.uniform(0.02, 0.15), 2)
        tot = round(subtotal - disc, 2)
        cost = round(tot * random.uniform(0.60, 0.80), 2)
        margin = round(tot - cost, 2)
        margin_pct = round((margin / tot) * 100.0, 2) if tot > 0 else 0.0
        risk_score = round(random.uniform(0.0, 25.0), 2)
        token = f"magic-exp-token-{i}-{random.randint(100000, 999999)}"
        deliv_date = f"2026-{random.randint(9, 12):02d}-{random.randint(1, 28):02d}"
        
        quote_rows.append(f"('{qnum}', {cust_id}, {sales_rep_id}, '{status}', {subtotal}, {disc}, {tot}, {cost}, {margin}, {margin_pct}, {risk_score}, 1, '{token}', '{deliv_date}', NOW() - INTERVAL {random.randint(1, 90)} DAY, NOW() - INTERVAL {random.randint(1, 90)} DAY)")
    
    sql.append("INSERT INTO quotations (quote_number, customer_id, sales_rep_id, status, subtotal_amount, total_discount_amount, total_amount, total_cost, total_margin_amount, margin_percentage, blended_risk_score, version, portal_token, promised_delivery_date, last_activity_at, created_at) VALUES\n" + ",\n".join(quote_rows) + ";\n")

    # 10. Populate QUOTATION_LINES up to ~400 total
    sql.append("-- 10. Seed Quotation Lines (Bringing total lines to 400)")
    qline_rows = []
    for i in range(1, 307):
        qid = random.randint(1, 350)
        pid = random.randint(1, 350)
        qty = random.randint(1, 10)
        uprice = round(random.uniform(100.0, 2000.0), 2)
        cprice = round(uprice * random.uniform(0.6, 0.8), 2)
        dpct = round(random.uniform(0.0, 15.0), 2)
        ltotal = round(qty * uprice * (1.0 - dpct/100.0), 2)
        margin = round(ltotal - (qty * cprice), 2)
        ltype = random.choice(["ONE_TIME", "RECURRING"])
        sub_plan_id = "1" if ltype == "RECURRING" else "NULL"
        status = "OK" if dpct <= 12.0 else "OVER"
        ov_pts = round(dpct - 12.0, 2) if status == "OVER" else 0.0
        
        qline_rows.append(f"({qid}, {pid}, {qty}, {uprice}, {cprice}, {dpct}, {ltotal}, {margin}, '{ltype}', {sub_plan_id}, {ov_pts}, '{status}')")
    
    sql.append("INSERT INTO quotation_lines (quotation_id, product_id, quantity, unit_price, cost_price, discount_percent, line_total, margin_amount, line_type, subscription_plan_id, overage_points, status) VALUES\n" + ",\n".join(qline_rows) + ";\n")

    # 11. Populate APPROVAL_REQUESTS up to ~350 total (unique quotation_id constraint)
    sql.append("-- 11. Seed Approval Requests (Bringing total to 350)")
    app_req_rows = []
    for qid in range(24, 351):
        status = random.choice(["PENDING", "APPROVED", "REJECTED", "RETURNED", "AUTO_APPROVED"])
        stage = random.choice(["SALES_MANAGER", "FINANCE", "COMPLETED"])
        risk_score = round(random.uniform(5.0, 30.0), 2)
        r_level = "HIGH" if risk_score > 15.0 else ("MEDIUM" if risk_score > 8.0 else "LOW")
        expl = f"System risk evaluation for Quote #{qid}: Blended risk score = {risk_score} ({r_level} Risk)."
        app_req_rows.append(f"({qid}, '{status}', '{stage}', {risk_score}, '{r_level}', '{expl}', NOW() - INTERVAL {random.randint(1, 60)} DAY)")
    
    sql.append("INSERT INTO approval_requests (quotation_id, status, current_stage, blended_risk_score, risk_level, explanation, created_at) VALUES\n" + ",\n".join(app_req_rows) + ";\n")

    # 12. Populate APPROVAL_STEPS up to ~380 total
    sql.append("-- 12. Seed Approval Steps (Bringing total to 380)")
    app_step_rows = []
    for i in range(1, 350):
        req_id = i + 1
        qid = req_id
        lvl = random.choice(["STAGE_1_MANAGER", "STAGE_2_FINANCE"])
        role = "SALES_MANAGER" if lvl == "STAGE_1_MANAGER" else "FINANCE"
        status = random.choice(["PENDING", "APPROVED", "REJECTED", "RETURNED"])
        app_id = 4 if role == "SALES_MANAGER" else 5
        app_name = "Maya Shah" if app_id == 4 else "Rohan Iyer"
        app_step_rows.append(f"({req_id}, {qid}, '{lvl}', '{role}', '{status}', {app_id}, '{app_name}', NOW() - INTERVAL {random.randint(1, 30)} DAY, 'Processed step review.', NOW() + INTERVAL 4 HOUR)")
    
    sql.append("INSERT INTO approval_steps (approval_request_id, quotation_id, level, required_role, status, approver_id, approver_name, assigned_at, comments, sla_deadline) VALUES\n" + ",\n".join(app_step_rows) + ";\n")

    # 13. Populate FULFILLMENT_PLANS up to ~350 total (unique quotation_id)
    sql.append("-- 13. Seed Fulfillment Plans (Bringing total to 350)")
    ful_plan_rows = []
    for qid in range(21, 351):
        status = random.choice(["PENDING", "SPLIT_PENDING", "FULFILLED", "OVERRIDDEN"])
        cost = round(random.uniform(20.0, 150.0), 2)
        count = random.randint(1, 3)
        ful_plan_rows.append(f"({qid}, '{status}', {cost}, {count}, NOW() - INTERVAL {random.randint(1, 60)} DAY)")
    
    sql.append("INSERT INTO fulfillment_plans (quotation_id, status, total_shipping_cost, shipment_count, created_at) VALUES\n" + ",\n".join(ful_plan_rows) + ";\n")

    # 14. Populate FULFILLMENT_SPLITS up to ~360 total
    sql.append("-- 14. Seed Fulfillment Splits (Bringing total to 360)")
    ful_split_rows = []
    for i in range(1, 333):
        fplan_id = i + 1
        qid = fplan_id
        wh_id = random.choice([1, 2])
        pid = random.randint(1, 350)
        qty = random.randint(1, 20)
        cost = round(random.uniform(15.0, 80.0), 2)
        group = f"GRP-{random.randint(100, 999)}"
        status = random.choice(["ALLOCATED", "SHIPPED", "DELIVERED", "BACKORDERED"])
        ful_split_rows.append(f"({fplan_id}, {qid}, {wh_id}, {pid}, {qty}, FALSE, {cost}, '{group}', '{status}')")
    
    sql.append("INSERT INTO fulfillment_splits (fulfillment_plan_id, quotation_id, warehouse_id, product_id, quantity, is_backorder, estimated_cost, shipment_group, status) VALUES\n" + ",\n".join(ful_split_rows) + ";\n")

    # 15. Populate INVOICES up to ~350 total (unique invoice_number)
    sql.append("-- 15. Seed Invoices (Bringing total to 350)")
    inv_rows = []
    for i in range(1001, 1311):
        inv_num = f"INV-2026-EXP-{i}"
        qid = random.randint(1, 350)
        cid = random.randint(1, 350)
        itype = random.choice(["ONE_TIME", "RECURRING", "CREDIT_NOTE"])
        amt = round(random.uniform(500.0, 12000.0), 2)
        status = random.choice(["UNPAID", "PAID", "VOID"])
        due_date = f"2026-{random.randint(9, 12):02d}-{random.randint(1, 28):02d}"
        paid_at = "NOW()" if status == "PAID" else "NULL"
        dstatus = random.choice(["ORDER_CONFIRMED", "SHIPPED", "INVOICED", "PAID"])
        inv_rows.append(f"('{inv_num}', {qid}, {cid}, '{itype}', {amt}, '{status}', '{due_date}', {paid_at}, '{dstatus}', NOW() - INTERVAL {random.randint(1, 60)} DAY)")
    
    sql.append("INSERT INTO invoices (invoice_number, quotation_id, customer_id, invoice_type, amount, status, due_date, paid_at, delivery_status, created_at) VALUES\n" + ",\n".join(inv_rows) + ";\n")

    # 16. Populate SUBSCRIPTIONS up to ~350 total
    sql.append("-- 16. Seed Subscriptions (Bringing total to 350)")
    sub_rows = []
    plans = ["Care Plan 2yr Monthly", "Care Plan 1yr Monthly", "Enterprise Support SLA Quarterly", "Annual VIP Dedicated Plan"]
    cycles = ["MONTHLY", "QUARTERLY", "YEARLY"]
    for i in range(1, 330):
        cid = random.randint(1, 350)
        qid = random.randint(1, 350)
        plan = random.choice(plans)
        cycle = random.choice(cycles)
        sdate = f"2026-0{random.randint(1, 8)}-15"
        nbill = f"2026-{random.randint(9, 12):02d}-15"
        amt = round(random.uniform(50.0, 1500.0), 2)
        qty = random.randint(1, 10)
        status = random.choice(["ACTIVE", "PAUSED", "CANCELED"])
        sub_rows.append(f"({cid}, {qid}, NULL, '{plan}', '{cycle}', '{sdate}', '{nbill}', {amt}, {qty}, '{status}', NOW() - INTERVAL {random.randint(1, 90)} DAY)")
    
    sql.append("INSERT INTO subscriptions (customer_id, quotation_id, quotation_line_id, plan_name, cycle, start_date, next_bill_date, amount, quantity, status, created_at) VALUES\n" + ",\n".join(sub_rows) + ";\n")

    # 17. Populate BILLING_SCHEDULES up to ~350 total
    sql.append("-- 17. Seed Billing Schedules (Bringing total to 350)")
    bs_rows = []
    for i in range(1, 346):
        sub_id = random.randint(1, 350)
        bdate = f"2026-{random.randint(9, 12):02d}-{random.randint(1, 28):02d}"
        amt = round(random.uniform(50.0, 1500.0), 2)
        status = random.choice(["PENDING", "INVOICED", "PAID"])
        bs_rows.append(f"({sub_id}, NULL, '{bdate}', {amt}, '{status}', 1.0000, 'Scheduled billing milestone', NULL)")
    
    sql.append("INSERT INTO billing_schedules (subscription_id, quotation_line_id, billing_date, amount, status, proration_factor, proration_note, invoice_id) VALUES\n" + ",\n".join(bs_rows) + ";\n")

    # 18. Populate DEAL_HEALTH_FLAGS up to ~350 total
    sql.append("-- 18. Seed Deal Health Flags (Bringing total to 350)")
    dh_types = ["STALLED", "DISCOUNT_ANOMALY", "DELIVERY_SLIPPAGE", "SLA_BREACH"]
    severities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    dh_rows = []
    for i in range(1, 311):
        qid = random.randint(1, 350)
        ftype = random.choice(dh_types)
        sev = random.choice(severities)
        desc = f"Algorithmic trigger: Quote #{qid} flagged for {ftype} with {sev} severity."
        resolved = random.choice(["TRUE", "FALSE"])
        res_at = "NOW()" if resolved == "TRUE" else "NULL"
        dh_rows.append(f"({qid}, '{ftype}', '{sev}', '{desc}', NOW() - INTERVAL {random.randint(1, 30)} DAY, {resolved}, {res_at})")
    
    sql.append("INSERT INTO deal_health_flags (quotation_id, flag_type, severity, description, detected_at, resolved, resolved_at) VALUES\n" + ",\n".join(dh_rows) + ";\n")

    # 19. Populate NEGOTIATION_MESSAGES up to ~350 total
    sql.append("-- 19. Seed Negotiation Messages (Bringing total to 350)")
    neg_rows = []
    for i in range(1, 317):
        qid = random.randint(1, 350)
        role = random.choice(["CUSTOMER", "SALES_REP", "SYSTEM"])
        name = "Buyer Procurement" if role == "CUSTOMER" else ("Jay Rao" if role == "SALES_REP" else "System Negotiator")
        msg = f"Discussion update for quote #{qid}: terms review and discount counter proposal."
        cdisc = round(random.uniform(5.0, 15.0), 2)
        rdate = f"2026-10-{random.randint(1, 28):02d}"
        neg_rows.append(f"({qid}, '{role}', '{name}', '{msg}', NULL, {cdisc}, '{rdate}', NOW() - INTERVAL {random.randint(1, 45)} DAY)")
    
    sql.append("INSERT INTO negotiation_messages (quotation_id, sender_role, sender_name, message, line_reference_id, counter_discount_percent, requested_delivery_date, created_at) VALUES\n" + ",\n".join(neg_rows) + ";\n")

    with open("populate_db.sql", "w", encoding="utf-8") as f:
        f.write("\n".join(sql))
    print("populate_db.sql regenerated with reset cleanup successfully!")

if __name__ == "__main__":
    generate_sql()
