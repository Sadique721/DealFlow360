# Module 5 Walkthrough: Blended Discount Risk Engine & Submit-for-Approval Workflow

## 1. Overview & Objectives
Module 5 implements the authoritative, mathematical **Blended Discount Risk Engine** and the automated **Submit-for-Approval Governance Pipeline** in DealFlow360.
When a Sales Representative clicks **"Submit for Approval"**, the system automatically calculates the exact risk score, checks each line item against strict customer tier and category discount ceilings, and routes the quotation autonomously into either instant auto-approval or sequential multi-tier governance (Sales Manager $\to$ Finance Controller).

---

## 2. Mathematical Risk Calculation Engine

### The Algorithm:
For each line item $i \in \{1, \dots, n\}$:
1. **Effective Line Ceiling**:
   $$\text{line\_ceiling}_i = \min(\text{customer.tier.maxDiscountPercent}, \text{product.category.maxDiscountPercent})$$
2. **Line Overage**:
   $$\text{line\_overage}_i = \max(0, \text{discountPercent}_i - \text{line\_ceiling}_i)$$
3. **Revenue Weight**:
   $$\text{line\_weight}_i = \frac{\text{lineTotal}_i}{\text{quotation.totalAmount}}$$
4. **Sensitivity Adjusted Risk Contribution**:
   $$\text{risk\_contrib}_i = \text{line\_overage}_i \times \text{line\_weight}_i \times \gamma_{\text{category}}$$
5. **Blended Risk Score**:
   $$\text{blended\_score} = \left(\sum_{i=1}^n \text{risk\_contrib}_i \times 10\right) + (5.0 \text{ if ANY } \text{line\_overage}_i > 5.0\% \text{ else } 0)$$

---

## 3. Governance Routing Matrix

| Condition | Blended Score | Required Approval Chain | Resulting Status |
| :--- | :---: | :---: | :---: |
| **Within All Ceilings** | `score == 0.00` | **Level 0 (Auto-Approved)** — 0 Approval Steps | `APPROVED` |
| **Minor Overage** | `0.0 < score <= 10.0` & no line overage $\ge 8\%$ | **1-Tier Governance** — `STAGE_1_MANAGER` (Sales Manager) | `PENDING_APPROVAL` |
| **Major Erosion / Spike** | `score > 10.0` OR any line overage $\ge 8.0\%$ | **2-Tier Dual Governance** — `STAGE_1_MANAGER` $\to$ `STAGE_2_FINANCE` | `PENDING_APPROVAL` |

---

## 4. Key Implementation Details

### Backend Architecture
- **`RiskScoreEngine.java`**:
  - Implements the mathematical formula with `BigDecimal` precision, category gamma multipliers ($\gamma=2.0$ for Services, $\gamma=1.0$ for Hardware), single-line spike detection ($>5\%$), and critical threshold flags ($\ge 8\%$).
  - Returns explainable `RiskCalculationResult` with culprit summaries, full audit rationale, and line-by-line overage breakdowns.
- **`QuotationService.submitForApproval`**:
  - Validates quote state (`DRAFT`, `RETURNED`, `UNDER_NEGOTIATION`) and rep ownership security.
  - Automatically provisions `ApprovalRequest` and sequential `ApprovalStep` entities (`STAGE_1_MANAGER`, `STAGE_2_FINANCE`) with SLA deadlines.
  - Logs immutable audit entries (`AUTO_APPROVED` or `SUBMITTED`) and broadcasts WebSocket STOMP updates.
- **`QuotationController.java` & `ApprovalController.java`**:
  - `POST /api/quotations/{id}/submit` triggers server-side risk evaluation.
  - `GET /api/approvals/quotation/{id}` returns the approval status and active steps.
  - `POST /api/approvals/act` allows authorized Managers and Finance Controllers to act.

### Frontend UI & Aesthetics
- **`quote-builder.component.ts`**:
  - Real-time client preview of the **Blended Discount Risk Engine** card.
  - Visual color-coded risk meter (`#10b981` Emerald for Auto-Approved, `#f59e0b` Amber for 1-Tier Manager, `#ef4444` Rose for 2-Tier Dual Governance).
  - Submit button triggers server execution, displays server explanation banner, and immediately reflects updated quotation status.
- **`approval.service.ts`**:
  - Direct REST integration with backend `/api/approvals` endpoints.

---

## 5. Verification & Test Results

### 1. Standalone Unit Test Suite (`RiskScoreEngineTest.java`)
```bash
./gradlew.bat test --tests com.dealflow360.discount.RiskScoreEngineTest
```
- **Test 1 (`testWithinLimits_AutoApproved`)**: Within ceiling discounts $\to$ Blended Score 0.00, `AUTO_APPROVED`, `requiresApproval = false`. **[PASSED]**
- **Test 2 (`testJudgeScenario_BreachStricterServiceCeiling`)**: Gold customer (15%), Laptop 12% (OK), Service 18% (overage 8.0pt) $\to$ High Risk sequential dual-tier approval. **[PASSED]**
- **Test 3 (`testSmallOverage_RoutesToManagerOnly`)**: Small single-line overage (0.8%) $\to$ Score 8.00 $\le 10.0 \to$ `SALES_MANAGER_ONLY` (1-tier). **[PASSED]**
- **Test 4 (`testMultiLineSystemicErosion_CatchesBlendedRisk`)**: 3 lines each 2.5% over ceiling $\to$ Score 25.00 $\to$ `SEQUENTIAL_MANAGER_AND_FINANCE`. **[PASSED]**

### 2. End-to-End API Test Suite (`test-module5.ps1`)
```powershell
powershell -ExecutionPolicy Bypass -File .\backend\scratch\test-module5.ps1
```
```
=================================================================
  DEALFLOW360 - MODULE 5 AUTOMATED VERIFICATION SUITE
=================================================================

[STEP 1] Authenticating Users...
  [PASS] POST /api/auth/login -> HTTP 200 (Sales Rep A: Jay Rao)
  [PASS] POST /api/auth/login -> HTTP 200 (Sales Rep B: Samir Patel)

[STEP 2] Fetching Catalog and Customer Data...
  [PASS] GET /api/catalog/customers -> HTTP 200 (Acme Corp, GOLD)
  [PASS] GET /api/catalog/products -> HTTP 200 (Laptop Pro 14, Onsite Setup Service)

=================================================================
  TEST CASE 1: Within-Ceiling Quotation -> AUTO-APPROVED (Score 0)
=================================================================
  [PASS] POST /api/quotations -> HTTP 200 (Created Draft Quote: Q-1014)
  [PASS] POST /api/quotations/14/submit -> HTTP 200
  Submit Result: Status=APPROVED, RiskScore=0.00, RequiresApproval=False
  [VERIFIED] Quote within ceiling was AUTO-APPROVED with Risk Score = 0.00!
  [PASS] GET /api/approvals/quotation/14 -> HTTP 200
  [VERIFIED] 0 ApprovalStep records exist in DB for auto-approved quotation.

=================================================================
  TEST CASE 2: Guide Case (Hardware 12% + Service 18%) -> Dual Governance
=================================================================
  [PASS] POST /api/quotations -> HTTP 200 (Created Draft Quote: Q-1015)
  [PASS] POST /api/quotations/15/submit -> HTTP 200
  Submit Result: Status=PENDING_APPROVAL, RiskScore=46.43, RiskLevel=HIGH, RequiresFinance=True
  [VERIFIED] Correctly triggered 2-tier governance (Sales Manager + Finance)!
  [PASS] GET /api/approvals/quotation/15 -> HTTP 200
  Approval Steps Created in DB: 2
    - Level: STAGE_1_MANAGER, Role: SALES_MANAGER, Status: PENDING, SLA: +2h
    - Level: STAGE_2_FINANCE, Role: FINANCE, Status: PENDING, SLA: +4h
  [VERIFIED] Exact 2-tier sequence created: Step 1 (SALES_MANAGER) -> Step 2 (FINANCE)!

=================================================================
  TEST CASE 3: Multi-Line Blended Risk Catch
=================================================================
  [PASS] POST /api/quotations -> HTTP 200 (Created Draft Quote for Silver Customer: Q-1016)
  [PASS] POST /api/quotations/16/submit -> HTTP 200
  Submit Result: Status=PENDING_APPROVAL, RiskScore=25.00, Level=HIGH
  [VERIFIED] Multi-line cumulative discount erosion properly caught by blended score (25.00)!

=================================================================
  TEST CASE 4: Security RBAC & Immutability when Pending
=================================================================
  [PASS] POST /api/quotations/15/submit (by Rep B) -> HTTP 403 Forbidden
  [VERIFIED] Blocked Rep B from submitting Rep A's quotation (HTTP 403 Forbidden)!
  [PASS] PUT /api/quotations/15/lines (while PENDING_APPROVAL) -> HTTP 400 Bad Request
  [VERIFIED] Blocked modification of line items during active approval governance!
=================================================================
  ALL MODULE 5 VERIFICATION CHECKS COMPLETED AND PASSING!
=================================================================
```

---

## 6. Summary of Key Files
- [`RiskScoreEngine.java`](file:///d:/odoo/DealFlow360/backend/src/main/java/com/dealflow360/discount/RiskScoreEngine.java)
- [`RiskScoreEngineTest.java`](file:///d:/odoo/DealFlow360/backend/src/test/java/com/dealflow360/discount/RiskScoreEngineTest.java)
- [`QuotationService.java`](file:///d:/odoo/DealFlow360/backend/src/main/java/com/dealflow360/quotation/QuotationService.java)
- [`QuotationController.java`](file:///d:/odoo/DealFlow360/backend/src/main/java/com/dealflow360/quotation/QuotationController.java)
- [`quote-builder.component.ts`](file:///d:/odoo/DealFlow360/frontend/src/app/pages/quote-builder.component.ts)
- [`approval.service.ts`](file:///d:/odoo/DealFlow360/frontend/src/app/services/approval.service.ts)
- [`test-module5.ps1`](file:///d:/odoo/DealFlow360/backend/scratch/test-module5.ps1)
