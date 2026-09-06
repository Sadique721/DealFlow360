-- V5: Add commercial fields to users table for Direct Unified User-Customer Model
ALTER TABLE users 
    ADD COLUMN tier VARCHAR(50) DEFAULT 'BRONZE',
    ADD COLUMN phone VARCHAR(50),
    ADD COLUMN address TEXT,
    ADD COLUMN contact_person VARCHAR(100);
