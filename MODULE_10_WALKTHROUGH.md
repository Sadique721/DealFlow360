# DealFlow360 — Module 10: Customer Portal & Negotiation Walkthrough

## 1. Overview
Module 10 implements a dedicated, secure, tokenized **Customer Portal and Real-time Negotiation Environment**. External enterprise buyers can access their quotation via a magic-link portal token (`/portal/:token`), review commercial terms, negotiate line-item discounts or dates directly with the sales representative without email back-and-forth, and confirm terms.

---

## 2. Key Architecture & Features Delivered

### 2.1 Zero-Leakage Data Model & Access Control
- **Zero Commercial Leakage**:
  - `PortalQuotationView.java` exposes only client-facing line unit prices, discount percentages, and final amounts. Internal cost prices (`costPrice`), gross margin amounts (`marginAmount`), and margin percentages (`marginPercentage`) are completely absent from the DTO.
- **Strict Route Guard Isolation**:
  - `CustomerPortalComponent` operates on a dedicated public/tokenized route (`/portal/:token`).
  - Internal workspace routes under `/dashboard/*` are strictly protected by `authGuard` and `roleGuard`. Attempting to access an internal route with a customer token or unauthenticated session redirects to `/login` or `/unauthorized`.

### 2.2 Negotiation & Counter-Offer Governance Loop
- **`GET /api/portal/quotations/{portalToken}`**: Fetches sanitized commercial view for external buyer.
- **`POST /api/portal/quotations/{portalToken}/message`**: Submits a threaded question, comment, or proposed line-item counter-discount. Recalculates quotation and updates status to `UNDER_NEGOTIATION`.
- **`POST /api/portal/quotations/{portalToken}/confirm`**:
  - **Threshold Breach Re-Approval**: If proposed counter-discounts cause the deal's risk score or discount allowances to exceed policy limits (`risk.getRequiresApproval() == true`), the quotation **automatically re-locks to `PENDING_APPROVAL` and re-enters Module 6's Approval Flow**.
  - **Direct Fulfillment Dispatch**: If terms remain within standard policy limits (`risk.getRequiresApproval() == false`), the quotation updates to `CONFIRMED`, triggers automatic warehouse split allocation (`FulfillmentService`), generates recurring subscriptions (`SubscriptionService`), and issues the initial invoice (`InvoiceService`).

---

## 3. Automated Test Suite Verification

### 3.1 JUnit 5 Integration Test Suite
```bash
./gradlew.bat test --tests com.dealflow360.integration.CustomerPortalIntegrationTest
```
**Result**: `BUILD SUCCESSFUL (3 tests passed, 100% Success)`.

**Tested Scenarios**:
1. `testPortalQuotationViewZeroLeakage`: Verified zero cost or margin field leakage in `PortalQuotationView`.
2. `testCounterNegotiationOverThresholdAutoReLocksForApproval`: Confirmed 35% counter-discount automatically re-locked quote to `PENDING_APPROVAL` and re-triggered approval flow.
3. `testConfirmationWithinThresholdConfirmsDirectly`: Confirmed quote within threshold updated directly to `CONFIRMED` and dispatched fulfillment/invoice.

### 3.2 End-to-End PowerShell Verification Script (`test-module10.ps1`)
```powershell
powershell.exe -ExecutionPolicy Bypass -File backend\scratch\test-module10.ps1
```

**Verification Results Summary**:
1. **Step 1: Sales Rep Authentication**: JWT token generated.
2. **Step 2: Quotation Creation with Magic Portal Token**: Created draft quotation with token `portal-3d678ec5-3b53-4368-bf90-82bed4207b90`.
3. **Step 3: Unauthenticated Buyer Access**: Retrieved Portal View, verified customer name and line items, confirmed 0% COGS/margin leakage.
4. **Step 4: Threaded Redline Message**: Message posted to negotiation thread.
5. **Step 5: Counter-Offer Over Threshold**: Submitted 35% counter-discount. Confirmed quotation auto-locked to `PENDING_APPROVAL`.
6. **Step 6: Confirmation Within Policy**: Confirmed quote within limits; status updated to `CONFIRMED` skipping manager sign-off.

**Overall Script Result**: `12 PASSED, 0 FAILED (100% Pass)`.

---

## 4. Workspace Build Validation
- **Backend Tests**: `./gradlew.bat test` → `BUILD SUCCESSFUL`.
- **Frontend Build**: `npm run build` → Compiled clean `dist/frontend`.
