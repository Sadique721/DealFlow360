# DealFlow360 — Module 3 Walkthrough: Customers, Discount Tiers & Approval Chains

## 1. Overview
Module 3 establishes customer account master data, discount tier allowances, and governance approval routing brackets for DealFlow360:
- **Customer Directory**: Master data for customer companies with assigned tier, primary contact, email, phone, and shipping address.
- **Customer Discount Tiers**: Configurable commercial discount ceilings (`BRONZE` 5%, `SILVER` 10%, `GOLD` 15%, `PLATINUM` 20%, `ENTERPRISE` 25%).
- **Approval Chains Configuration**: Governance routing rules mapping non-linear risk score brackets to required sign-off levels (`MANAGER` 1-tier approval vs. `MANAGER_THEN_FINANCE` 2-tier approval).

---

## 2. Changes Implemented

### A. Database Migration (MySQL 9.7 + Flyway)
- **`V3__approval_chains.sql`**: Added `approval_chains` table with default risk score brackets:
  - Range `0.01` to `10.00` $\to$ `MANAGER` approval
  - Range `10.01` to `999.00` $\to$ `MANAGER_THEN_FINANCE` 2-tier approval

### B. Backend Architecture (Spring Boot 3.2.4 + Java 17)
1. **JPA Entity & Repositories**:
   - `ApprovalChain.java` in `com.dealflow360.catalog`
   - `ApprovalChainRepository.java` in `com.dealflow360.catalog`
   - `CustomerTierRepository.java` updated with `findByTierNameIgnoreCase`
2. **DTO Layer Decoupling**:
   - `CustomerRequest.java` & `CustomerResponse.java` (includes calculated `tierMaxDiscount`)
   - `CustomerTierRequest.java` & `CustomerTierResponse.java`
   - `ApprovalChainRequest.java` & `ApprovalChainResponse.java`
3. **Service Layer**:
   - `CatalogService.java`: Full validated CRUD operations for Customers, Customer Tiers, and Approval Chains.
4. **REST Controller & RBAC**:
   - `CatalogController.java`:
     - `@PreAuthorize("hasRole('ADMIN')")` on all mutation endpoints (`POST`, `PUT`, `DELETE`).
     - `GET` endpoints open to all authenticated internal roles (`ADMIN`, `SALES_REP`, `SALES_MANAGER`, `FINANCE`).
     - Unauthorized non-admin mutation attempts strictly return HTTP `403 Forbidden`.

### C. Frontend Architecture (Angular 17 + TypeScript + Glassmorphism UI)
1. **Models & Service**:
   - `dealflow.model.ts`: Added `CustomerRequest`, `CustomerTierRequest`, `ApprovalChainRule`, `ApprovalChainRequest`.
   - `catalog.service.ts`: Connected to all backend endpoints for Customers, Tiers, and Approval Chains CRUD operations.
2. **Customer Management UI**:
   - `customer-management.component.ts`: Standalone Angular component featuring:
     - **Customers Tab**: Directory table showing Company Name, Tier badge, Max Discount Cap %, Contact Person, Email, Phone, Address, and Admin Edit/Delete actions.
     - **Discount Tiers Tab**: Table showing Tier Name, Max Allowed Discount %, Description, and Admin Edit/Delete actions.
     - **Approval Chains Tab**: Matrix table showing Min/Max Risk Score range, Required Level badge, Multi-step Workflow badges, Description, and Admin Edit/Delete actions.
     - **Modal Dialogs**: Create & Edit dialogs for Customers, Discount Tiers, and Approval Chains with full validation and feedback toasts.
     - **Search & Tier Filter**: Real-time filtering across all tabs.
     - **Role-Aware Views**: Displays "Admin Full Access" for Admins and "Read-Only Mode" for non-admins.
3. **Routing & Sidebar**:
   - Registered `/dashboard/customers` and alias `/customers` in `app.routes.ts`.
   - Added "Customers & Governance" navigation link in `dashboard.component.ts`.

---

## 3. Automated Verification Results

Automated verification test suite `backend/scratch/test-module3.ps1` passed with 100% success:
```text
========================================================
  DEALFLOW360 MODULE 3 VERIFICATION TEST SUITE
  Customers, Discount Tiers & Approval Chains Setup
========================================================

[Step 1] Logging in as Admin (admin@dealflow360.com)...
  -> SUCCESS: Admin authenticated. Token received (Length: 257)

[Step 2] Testing Customer Discount Tier Endpoints (Admin)...
  -> Created Customer Tier: PLATINUM (20% max discount allowance)
  -> Total Configured Discount Tiers: 4

[Step 3] Testing Customer Accounts Endpoints (Admin)...
  -> Verified Existing Customer 1: Acme Corp (Tier: GOLD, Cap: 15.00%)
  -> Created Customer 2: TechNova Solutions Ltd (Tier: SILVER, Cap: 10.00%, Contact: Sarah Jenkins)
  -> Created Customer 3: SmallBiz Direct LLC (Tier: BRONZE, Cap: 5.00%, Contact: Michael Chang)

[Step 4] Testing Approval Chains Setup Endpoints (Admin)...
  -> Verified Existing Approval Rule 1: Score [0.01 to 10.00] -> Level: MANAGER
  -> Verified Existing Approval Rule 2: Score [10.01 to 999.00] -> Level: MANAGER_THEN_FINANCE
  -> Total Configured Governance Approval Chains: 2

[Step 5] Testing Non-Admin (Sales Rep) Access Controls...
  -> Authenticated Sales Rep user (eyJhbGciOiJIUzI1NiJ9...)
  -> [200 OK] Sales Rep successfully read 8 customers, 4 tiers, and 2 approval rules.
  -> [403 Forbidden] Sales Rep POST customer mutation properly blocked by RBAC.
  -> [403 Forbidden] Sales Rep POST customer tier mutation properly blocked by RBAC.
  -> [403 Forbidden] Sales Rep POST approval chain mutation properly blocked by RBAC.

========================================================
  MODULE 3 VERIFICATION SUMMARY: ALL CHECKS PASSED!
========================================================
```

- **Backend Java Build**: `BUILD SUCCESSFUL` (exit code 0).
- **Angular Frontend Build**: `Compiled with 0 errors` (exit code 0).
