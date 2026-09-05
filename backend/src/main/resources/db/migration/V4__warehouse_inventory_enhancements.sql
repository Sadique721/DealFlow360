-- DealFlow360 Warehouse & Inventory Enhancements (V4__warehouse_inventory_enhancements.sql)
-- Adds warehouse_code, status, and audit timestamps to warehouses and warehouse_stocks

ALTER TABLE warehouses ADD COLUMN warehouse_code VARCHAR(50) NULL AFTER id;
ALTER TABLE warehouses ADD COLUMN status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' AFTER location;
ALTER TABLE warehouses ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE warehouses ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Backfill unique codes for existing seeded warehouses
UPDATE warehouses SET warehouse_code = CONCAT('WH-00', id) WHERE warehouse_code IS NULL;

-- Enforce NOT NULL and UNIQUE constraint on warehouse_code
ALTER TABLE warehouses MODIFY COLUMN warehouse_code VARCHAR(50) NOT NULL;
ALTER TABLE warehouses ADD CONSTRAINT uk_warehouse_code UNIQUE (warehouse_code);

-- Enhance warehouse_stocks with timestamps
ALTER TABLE warehouse_stocks ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE warehouse_stocks ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
