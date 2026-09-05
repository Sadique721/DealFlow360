# DealFlow360 — Module 2 Walkthrough: Catalog Setup (Categories, Products, Price Lists)

## 1. Overview
Module 2 establishes the core master data foundation for DealFlow360's CPQ (Configure, Price, Quote) engine:
- **Product Categories**: Hierarchical categories with discount ceilings and sensitivity factor $\gamma$ (gamma) used for non-linear risk calculations.
- **Products & Services**: Sellable catalog items with base prices, unit cost prices, profit margins, tax rates, units of measure, and subscription/recurring billing frequency.
- **Customer Tier Price Lists**: Tier-specific pricing adjustments and currency multipliers (`STANDARD`, `SILVER`, `GOLD`, `PLATINUM`, `ENTERPRISE`).

---

## 2. Changes Implemented

### A. Backend Architecture (Spring Boot 3.2.4 + Java 17 + MySQL 9.7)
1. **DTO Decoupling**:
   - `CategoryRequest.java` & `CategoryResponse.java` in `com.dealflow360.catalog.dto`
   - `ProductRequest.java` & `ProductResponse.java` in `com.dealflow360.catalog.dto` (including live calculated `marginPercent`, category ceiling info)
   - `PriceListRequest.java` & `PriceListResponse.java` in `com.dealflow360.catalog.dto`
2. **Service Layer**:
   - `CatalogService.java`: Full validated CRUD operations for Category, Product, and Price List entities.
3. **REST Controller & RBAC**:
   - `CatalogController.java`:
     - `@PreAuthorize("hasRole('ADMIN')")` on all mutation endpoints (`POST`, `PUT`, `DELETE`).
     - `GET /api/catalog/products`: Returns active sellable products for Sales Reps, Managers, Finance, and Admins.
     - `GET /api/catalog/products/all`: Admin-only endpoint returning all items including inactive/deactivated products.
     - Unauthenticated/Unauthorized non-admin mutations correctly return HTTP `403 Forbidden`.

### B. Frontend Architecture (Angular 17 + TypeScript + Glassmorphism UI)
1. **Service Layer**:
   - `catalog.service.ts`: Connected to all backend endpoints for Category, Product, and Price List CRUD operations.
2. **Catalog Management UI**:
   - `catalog-management.component.ts`: Standalone Angular component with 3 tabs:
     - **Products Tab**: Table showing SKU, Name, Category pill, Base Price, Cost Price, Margin %, Tax %, Subscription interval, Active status, and Admin Edit/Deactivate actions.
     - **Categories Tab**: Table showing Name, Discount Ceiling %, Sensitivity $\gamma$, Description, and Admin Edit/Delete actions.
     - **Tier Price Lists Tab**: Table showing Customer Tier badge, Currency, Discount Adjustment %, Effective Multiplier, and Admin Edit/Delete actions.
     - **Modal Dialogs**: Create & Edit dialogs for Products, Categories, and Price Lists with validation and toast alerts.
     - **Filters**: Real-time search by name/SKU/tier and category dropdown filtering.
     - **Role-Aware Views**: Displays "Admin Full Access" for Admins and "Read-Only Mode" for non-admins.
3. **Routing & Sidebar**:
   - Registered `/dashboard/catalog` and `/catalog` in `app.routes.ts`.
   - Added "Catalog & Pricing" nav item in `dashboard.component.ts`.

---

## 3. Automated Verification Results

Automated verification suite `backend/scratch/test-module2.ps1` passed with 100% success:
- **Admin Authentication**: `200 OK`
- **Category Endpoints**: `200 OK` (Verified discount ceilings and sensitivity gamma)
- **Product Endpoints**: `200 OK` (Verified base pricing, cost pricing, margins, subscription flags)
- **Price List Endpoints**: `200 OK` (Verified tier discounts)
- **Sales Rep Read Access**: `200 OK` (Can view active products)
- **Sales Rep Mutation Block**: `403 Forbidden` (Blocked from POST/PUT/DELETE)
- **Angular Build**: Compiled with `0 errors` (exit code 0).
