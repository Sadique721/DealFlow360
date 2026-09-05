# DealFlow360 — Module 6: Approval Workflow & Multi-Tier Governance Walkthrough

## 1. Overview
Module 6 implements the complete enterprise discount governance workflow, strict sequential approval gating, RBAC signing authority enforcement, dynamic state transitions (`APPROVE`, `REJECT`, `RETURN`), real-time STOMP notification dispatch, and an immutable audit timeline.

---

## 2. Key Architecture & Features Delivered

### 2.1 Backend Multi-Tier Governance & Sequential Gating
- **[ApprovalService.java](file:///d:/odoo/DealFlow360/backend/src/main/java/com/dealflow360/approval/ApprovalService.java)**:
  - **Sequential Gating**: For 2-tier governance (`STAGE_1_MANAGER` $\to$ `STAGE_2_FINANCE`), Finance sign-off is strictly blocked while `STAGE_1_MANAGER` remains pending.
  - **Decision Comments Enforcement**: Mandatory non-empty comments required for all decisions (`APPROVE`, `REJECT`, `RETURN`).
  - **Role Gating & RBAC Authorization**: Sales Reps and Customers receive `AccessDeniedException` (HTTP 403) if attempting to act on approvals. Sales Managers are restricted to Stage 1 and Finance Officers to Stage 2.
  - **State Machine Transitions**:
    - `APPROVE` on Stage 1 (2-tier) $\to$ status remains `PENDING_APPROVAL`, current stage advances to `FINANCE`.
    - `APPROVE` on Final Stage $\to$ Quotation & Approval Request status transition to `APPROVED`.
    - `REJECT` $\to$ Quotation & Approval Request transition to `REJECTED`.
    - `RETURN` $\to$ Quotation transitions to `RETURNED` for Sales Rep margin rebalancing.
  - **Auto-Routing on Re-submission**: When returned quotes are revised below risk thresholds, re-submission automatically transitions them to `APPROVED` without redundant approval chains.

### 2.2 REST & Audit API Endpoints
- **[ApprovalController.java](file:///d:/odoo/DealFlow360/backend/src/main/java/com/dealflow360/approval/ApprovalController.java)**:
  - `GET /api/approvals`: List pending approval queue (restricted to `ADMIN`, `SALES_MANAGER`, `FINANCE`).
  - `GET /api/approvals/quotation/{id}`: Detailed step breakdown and SLA targets.
  - `POST /api/approvals/act`: Execute approval decision with comments.
- **[QuotationController.java](file:///d:/odoo/DealFlow360/backend/src/main/java/com/dealflow360/quotation/QuotationController.java)**:
  - `PUT /api/quotations/{id}`: Update quotation lines with live recalculation on draft or returned quotes.
  - `POST /api/quotations/{id}/approval/act`: Alias endpoint for quotation approval actions.
- **[AuditController.java](file:///d:/odoo/DealFlow360/backend/src/main/java/com/dealflow360/audit/AuditController.java)**:
  - `GET /api/audit`: Timeline of deal creation, submissions, stage approvals, rejections, and margin modifications.

### 2.3 Frontend Multi-Tier Governance Center
- **[approval-center.component.ts](file:///d:/odoo/DealFlow360/frontend/src/app/pages/approval-center.component.ts)**:
  - Responsive approval queue with role filtering, SLA indicators, and risk score badges.
  - Audit & Decision pane with line overage culprit breakdown and mandatory comment validation.
  - Seamless live integration with backend REST endpoints and WebSocket events.

---

## 3. Automated Test Suite Verification

### 3.1 JUnit 5 Integration Test Suite
```bash
./gradlew.bat test --tests com.dealflow360.integration.ApprovalHierarchyIntegrationTest
```
**Result**: `BUILD SUCCESSFUL (100% Passed)`.

### 3.2 End-to-End PowerShell Verification Script (`test-module6.ps1`)
```powershell
powershell.exe -ExecutionPolicy Bypass -File d:\odoo\DealFlow360\backend\scratch\test-module6.ps1
```

**Verification Results Summary**:
1. **Test 1: 1-Tier Approval Flow (Sales Manager Sign-off)**:
   - 15.5% discount quotation created & submitted $\to$ `PENDING_APPROVAL` with 1 step (`SALES_MANAGER`).
   - Sales Rep unauthorized approval attempt blocked with `HTTP 403 Forbidden`.
   - Sales Manager approved with strategic comments $\to$ quotation state transitioned to `APPROVED`.
2. **Test 2: 2-Tier Approval Flow & Strict Sequential Gating**:
   - Hardware 12% + Service 18% discount quotation created $\to$ 2 steps registered (`SALES_MANAGER` + `FINANCE`).
   - Finance premature approval attempt blocked with `HTTP 400 Bad Request`.
   - Manager approved Stage 1 $\to$ escalated to Finance, quotation remained `PENDING_APPROVAL`.
   - Finance approved Stage 2 $\to$ quotation transitioned to `APPROVED`.
3. **Test 3: Rejection Workflow**:
   - 19% discount quotation rejected by Manager $\to$ transitioned to `REJECTED` and locked.
4. **Test 4: Return for Revision & Re-submission Flow**:
   - 17% discount quotation returned by Manager with comments.
   - Sales Rep updated lines to 5% discount via `PUT /api/quotations/{id}`.
   - Re-submission auto-approved the revised quotation immediately.
5. **Test 5: Audit Trail Verification**:
   - Verified immutable audit records (`CREATED`, `SUBMITTED`, `FINAL_APPROVED`) with user identity and notes.

---

## 4. Frontend Compilation & Quality Assurance
- Frontend Angular application built successfully with zero errors via `npm run build`.
