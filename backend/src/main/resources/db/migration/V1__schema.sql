-- DealFlow360 Complete Relational Schema (V1__schema.sql)
-- Covers all 18 Excalidraw screens and 4 Core Algorithmic Engines

CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL, -- ADMIN, SALES_REP, SALES_MANAGER, FINANCE, CUSTOMER
    team VARCHAR(100) DEFAULT 'Global Sales',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customer_tiers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tier_name VARCHAR(50) NOT NULL UNIQUE, -- BRONZE, SILVER, GOLD
    max_discount_percent DECIMAL(5,2) NOT NULL,
    description VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    tier VARCHAR(50) NOT NULL DEFAULT 'BRONZE',
    email VARCHAR(150) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(50),
    address TEXT,
    portal_user_id BIGINT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cust_portal_user FOREIGN KEY (portal_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS categories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE, -- Hardware, Services, Subscriptions
    max_discount_percent DECIMAL(5,2) NOT NULL,
    sensitivity_gamma DECIMAL(4,2) DEFAULT 1.0, -- Services gamma = 2.0, Hardware gamma = 1.0
    description VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    category_id BIGINT NOT NULL,
    base_price DECIMAL(12,2) NOT NULL,
    cost_price DECIMAL(12,2) NOT NULL,
    unit_of_measure VARCHAR(50) DEFAULT 'Each',
    tax_percentage DECIMAL(5,2) DEFAULT 15.0,
    is_subscription BOOLEAN DEFAULT FALSE,
    recurring_interval VARCHAR(50) NULL, -- WEEKLY, MONTHLY, QUARTERLY, YEARLY
    stock_on_hand INT DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_prod_category FOREIGN KEY (category_id) REFERENCES categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_variants (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT NOT NULL,
    attribute_name VARCHAR(50) NOT NULL, -- Size, RAM, Color, Manufacturer
    attribute_value VARCHAR(100) NOT NULL,
    price_delta DECIMAL(12,2) DEFAULT 0.00,
    CONSTRAINT fk_variant_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS price_lists (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    customer_tier VARCHAR(50) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    discount_adjustment_percent DECIMAL(5,2) DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS warehouses (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE, -- Main Warehouse, East Depot
    location VARCHAR(150) NOT NULL,
    shipping_cost_weight DECIMAL(6,2) NOT NULL DEFAULT 1.00,
    base_freight DECIMAL(10,2) NOT NULL DEFAULT 20.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS warehouse_stocks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    warehouse_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    in_stock INT NOT NULL DEFAULT 0,
    reserved INT NOT NULL DEFAULT 0,
    available INT NOT NULL DEFAULT 0,
    reorder_level INT NOT NULL DEFAULT 10,
    CONSTRAINT fk_stock_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
    CONSTRAINT fk_stock_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY uk_wh_prod (warehouse_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quotations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    quote_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id BIGINT NOT NULL,
    sales_rep_id BIGINT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT', -- DRAFT, PENDING_APPROVAL, APPROVED, RETURNED, REJECTED, SENT_TO_CUSTOMER, UNDER_NEGOTIATION, CONFIRMED, FULFILLED, CLOSED
    subtotal_amount DECIMAL(14,2) DEFAULT 0.00,
    total_discount_amount DECIMAL(14,2) DEFAULT 0.00,
    total_amount DECIMAL(14,2) DEFAULT 0.00,
    total_cost DECIMAL(14,2) DEFAULT 0.00,
    total_margin_amount DECIMAL(14,2) DEFAULT 0.00,
    margin_percentage DECIMAL(5,2) DEFAULT 0.00,
    blended_risk_score DECIMAL(6,2) DEFAULT 0.00,
    version INT DEFAULT 1,
    portal_token VARCHAR(100) NOT NULL UNIQUE,
    promised_delivery_date DATE NULL,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_quote_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
    CONSTRAINT fk_quote_rep FOREIGN KEY (sales_rep_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quotation_lines (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    quotation_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(12,2) NOT NULL,
    cost_price DECIMAL(12,2) NOT NULL,
    discount_percent DECIMAL(5,2) DEFAULT 0.00,
    line_total DECIMAL(14,2) NOT NULL,
    margin_amount DECIMAL(14,2) NOT NULL,
    line_type VARCHAR(50) NOT NULL DEFAULT 'ONE_TIME', -- ONE_TIME, RECURRING
    subscription_plan_id BIGINT NULL,
    overage_points DECIMAL(5,2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'OK', -- OK, OVER
    CONSTRAINT fk_line_quotation FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
    CONSTRAINT fk_line_product FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quotation_versions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    quotation_id BIGINT NOT NULL,
    version_number INT NOT NULL,
    snapshot_json LONGTEXT NOT NULL,
    changed_by VARCHAR(100) NOT NULL,
    change_summary VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ver_quotation FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS approval_requests (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    quotation_id BIGINT NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, RETURNED, AUTO_APPROVED
    current_stage VARCHAR(50) NOT NULL DEFAULT 'SALES_MANAGER', -- SALES_MANAGER, FINANCE, COMPLETED
    blended_risk_score DECIMAL(6,2) NOT NULL,
    risk_level VARCHAR(20) NOT NULL, -- LOW, MEDIUM, HIGH
    explanation TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_req_quotation FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS approval_steps (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    approval_request_id BIGINT NOT NULL,
    quotation_id BIGINT NOT NULL,
    level VARCHAR(50) NOT NULL, -- STAGE_1_MANAGER, STAGE_2_FINANCE
    required_role VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, RETURNED, SKIPPED
    approver_id BIGINT NULL,
    approver_name VARCHAR(100) NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    acted_at TIMESTAMP NULL,
    comments TEXT,
    sla_deadline TIMESTAMP NULL,
    CONSTRAINT fk_step_request FOREIGN KEY (approval_request_id) REFERENCES approval_requests(id) ON DELETE CASCADE,
    CONSTRAINT fk_step_quotation FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
    CONSTRAINT fk_step_approver FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fulfillment_plans (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    quotation_id BIGINT NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, SPLIT_PENDING, FULFILLED, OVERRIDDEN
    total_shipping_cost DECIMAL(12,2) DEFAULT 0.00,
    shipment_count INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ful_quotation FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fulfillment_splits (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    fulfillment_plan_id BIGINT NOT NULL,
    quotation_id BIGINT NOT NULL,
    warehouse_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    quantity INT NOT NULL,
    is_backorder BOOLEAN DEFAULT FALSE,
    estimated_cost DECIMAL(10,2) DEFAULT 0.00,
    shipment_group VARCHAR(50) DEFAULT 'GROUP_1',
    status VARCHAR(50) DEFAULT 'ALLOCATED', -- ALLOCATED, SHIPPED, DELIVERED, BACKORDERED
    CONSTRAINT fk_split_plan FOREIGN KEY (fulfillment_plan_id) REFERENCES fulfillment_plans(id) ON DELETE CASCADE,
    CONSTRAINT fk_split_wh FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    CONSTRAINT fk_split_prod FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subscription_plans (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    billing_cycle VARCHAR(50) NOT NULL, -- MONTHLY, QUARTERLY, YEARLY
    base_price DECIMAL(12,2) NOT NULL,
    default_proration_rule VARCHAR(100) DEFAULT 'DAILY_PRORATION',
    cancellation_rule VARCHAR(100) DEFAULT 'PARTIAL_REFUND_UNUSED_DAYS',
    active BOOLEAN DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subscriptions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    quotation_id BIGINT NOT NULL,
    quotation_line_id BIGINT NULL,
    plan_name VARCHAR(100) NOT NULL,
    cycle VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    next_bill_date DATE NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    quantity INT DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, PAUSED, CANCELED
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_sub_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
    CONSTRAINT fk_sub_quotation FOREIGN KEY (quotation_id) REFERENCES quotations(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS billing_schedules (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    subscription_id BIGINT NOT NULL,
    quotation_line_id BIGINT NULL,
    billing_date DATE NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, INVOICED, PAID
    proration_factor DECIMAL(6,4) DEFAULT 1.0000,
    proration_note VARCHAR(255),
    invoice_id BIGINT NULL,
    CONSTRAINT fk_bs_sub FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS invoices (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    quotation_id BIGINT NOT NULL,
    customer_id BIGINT NOT NULL,
    invoice_type VARCHAR(50) NOT NULL DEFAULT 'ONE_TIME', -- ONE_TIME, RECURRING, CREDIT_NOTE
    amount DECIMAL(14,2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'UNPAID', -- UNPAID, PAID, VOID
    due_date DATE NOT NULL,
    paid_at TIMESTAMP NULL,
    delivery_status VARCHAR(50) DEFAULT 'SHIPPED', -- ORDER_CONFIRMED, SHIPPED, INVOICED, PAID
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_inv_quotation FOREIGN KEY (quotation_id) REFERENCES quotations(id),
    CONSTRAINT fk_inv_customer FOREIGN KEY (customer_id) REFERENCES customers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS upsell_rules (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    base_product_id BIGINT NOT NULL,
    suggested_product_id BIGINT NOT NULL,
    co_purchase_score DECIMAL(5,2) DEFAULT 0.85,
    is_promoted BOOLEAN DEFAULT FALSE,
    promo_tag VARCHAR(100) NULL, -- e.g. "12% off promo"
    promo_discount_percent DECIMAL(5,2) DEFAULT 0.00,
    min_margin_threshold DECIMAL(5,2) DEFAULT 20.00,
    CONSTRAINT fk_up_base FOREIGN KEY (base_product_id) REFERENCES products(id),
    CONSTRAINT fk_up_sugg FOREIGN KEY (suggested_product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS negotiation_messages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    quotation_id BIGINT NOT NULL,
    sender_role VARCHAR(50) NOT NULL, -- CUSTOMER, SALES_REP, SYSTEM
    sender_name VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    line_reference_id BIGINT NULL,
    counter_discount_percent DECIMAL(5,2) NULL,
    requested_delivery_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_neg_quotation FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL, -- QUOTATION, APPROVAL, FULFILLMENT, SUBSCRIPTION
    entity_id BIGINT NOT NULL,
    action VARCHAR(50) NOT NULL, -- CREATED, SUBMITTED, APPROVED, RETURNED, REJECTED, NEGOTIATED, SPLIT_OVERRIDE
    performed_by VARCHAR(100) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    before_state TEXT,
    after_state TEXT,
    reason TEXT,
    margin_delta DECIMAL(6,2) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS deal_health_flags (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    quotation_id BIGINT NOT NULL,
    flag_type VARCHAR(50) NOT NULL, -- STALLED, DISCOUNT_ANOMALY, DELIVERY_SLIPPAGE, SLA_BREACH
    severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
    description TEXT NOT NULL,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP NULL,
    action_taken VARCHAR(100) NULL,
    CONSTRAINT fk_dh_quotation FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    related_entity_type VARCHAR(50),
    related_entity_id BIGINT,
    read_status BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
