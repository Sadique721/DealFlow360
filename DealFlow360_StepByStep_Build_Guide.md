# DealFlow360 — Step-by-Step Build & Verification Guide
### Follow this in order. Do not start the next module until the current one passes its verification checklist.

---

## 0. Where You Are Right Now

| Status | Module |
|---|---|
| ✅ Done | Authentication + Role-Based Login, Admin creates users |
| 🔧 Fix in progress | Quotation Management |
| ⬜ Not started | Everything from Module 3 onward below |

---

## 1. Why Order Matters (The One Rule To Never Break)

You cannot test Approval without a Quotation existing first. You cannot test Fulfillment without an Approved quotation. You cannot test Billing without Fulfillment. **Every module in this guide only works if the one before it is actually working — not "mostly working," actually working and verified.**

This is almost certainly why Quotation broke: something upstream (Catalog data, or the DTO/entity mismatch) was skipped or half-done, and the crack showed up one layer later. So from here on: **finish → verify with the checklist → only then move on.**

### The Full Build Order

1. ~~Auth + Role-Based Login~~ ✅
2. Catalog Setup (Categories, Products, Price Lists) — Admin
3. Customers + Discount Tiers + Approval Chain Setup — Admin
4. **Quotation Management (Builder)** — Sales Rep ← you are fixing this now
5. Blended Discount Risk Engine + Submit-for-Approval
6. Approval Workflow — Sales Manager / Finance
7. Warehouse Setup + Fulfillment Split
8. Subscription Plans + Billing/Proration
9. Upsell / Cross-Sell
10. Customer Portal + Negotiation
11. Deal Health Dashboard + Anomaly Detection
12. Reporting & Export
13. Audit Trail & Notifications (formalize — should already be woven in from Module 5 onward)
14. Final End-to-End Verification (full demo rehearsal)

---

## 2. How Each Role Experiences the Whole App (Read This Before Building Anything)

Before touching code for any module, know what "correct" looks like for each role. This is the picture you're building toward.

| Role | Lands on after login | Sees in navigation | Can NOT do |
|---|---|---|---|
| **Admin** | Backend Configuration dashboard | Products, Categories, Price Lists, Discount Tiers, Approval Chains, Warehouses, Subscription Plans, Upsell Rules, Reports, all Quotations (view-only) | Cannot build or edit a quotation itself |
| **Sales Rep** | Sales Workspace (their Quotation Pipeline) | Quotations, Pipeline, Reload Data, Close Workspace | Cannot edit another rep's quotation; cannot edit backend config |
| **Sales Manager** | Pending Approvals / Deal Health Dashboard | Approvals (Manager step), Deal Health Dashboard, Reports, all Quotations (view-only) | Cannot build quotations; cannot edit catalog/config |
| **Finance** | Pending Finance Approvals / Billing queue | Approvals (Finance step), Fulfillment overrides, Billing, Reports | Cannot build quotations |
| **Customer** | Their own quotation (Portal) | Only their own quotation(s) and negotiation thread | Cannot see ANY internal screen — separate app entirely |

Keep this table open while building each module below — every module's "verify" step includes logging in as more than one role to confirm this table holds true.

---

## 3. Module 2 — Catalog Setup (Categories, Products, Price Lists)

**What it does:** This is the "shop shelf" — before anyone can build a quotation, there must be products to put in it, organized into categories with their own discount ceilings.

**Roles:**
- **Admin** — creates/edits everything here
- **Sales Rep** — later reads this data (read-only) when building a quote
- Nobody else touches this module directly

**Backend checklist:**
- [ ] `Category` entity: id, name, maxDiscountPercent
- [ ] `Product` entity: id, name, categoryId, basePrice, unit, taxRate, marginPercent, active
- [ ] `PriceList` entity: id, productId, customerTier, currency, price
- [ ] CRUD REST endpoints for all three, protected so only `ADMIN` role can create/edit/delete (but `GET` should be open to any authenticated internal role)
- [ ] Return clean DTOs — never return the raw JPA entity from a controller (common cause of lazy-loading crashes later)

**Frontend checklist:**
- [ ] Admin screen: Category list + create/edit form
- [ ] Admin screen: Product list + create/edit form (with category dropdown)
- [ ] Admin screen: Price List manager (product + tier + price)

**How to verify before moving on:**
1. Log in as Admin.
2. Create 2 categories: `Hardware` (max discount 15%), `Service` (max discount 10%).
3. Create at least 3 products, at least one in each category.
4. Set a price for each product under each customer tier (Bronze/Silver/Gold).
5. Call `GET /api/admin/products` directly (Postman/browser) and confirm the JSON has correct `categoryId`, `basePrice`, etc. — **do this before touching Angular**, so you know the backend is correct in isolation.
6. Refresh the Angular product list screen and confirm it matches exactly what Postman showed.

---

## 4. Module 3 — Customers + Discount Tiers + Approval Chain Setup

**What it does:** Defines who your customers are, what tier they belong to, and the rules for how much discount is allowed and who must approve what.

**Roles:**
- **Admin** — creates/edits everything
- Everyone else — reads this data later, never edits it

**Backend checklist:**
- [ ] `Customer` entity: id, name, tier (BRONZE/SILVER/GOLD), email
- [ ] `DiscountTier` entity: id, tierName, maxDiscountPercent
- [ ] `ApprovalChain` entity: id, minScore, maxScore, requiredLevel (MANAGER / MANAGER_THEN_FINANCE)
- [ ] CRUD endpoints, Admin-only for write

**Frontend checklist:**
- [ ] Admin screen: Customer list + form
- [ ] Admin screen: Discount Tier config (Bronze=5%, Silver=10%, Gold=15%)
- [ ] Admin screen: Approval Chain config (e.g. score 0–10 → Manager, >10 → Manager then Finance)

**How to verify before moving on:**
1. Create 3 customers, one per tier.
2. Create the 3 discount tiers with the ceilings above.
3. Create 2 approval chain ranges as above.
4. `GET` each endpoint directly and confirm the JSON is correct before touching the frontend.
5. Confirm a non-Admin role gets a `403 Forbidden` when trying to `POST`/`PUT` to these endpoints — this is the single most common security bug (endpoints "working" but with no real role check).

---

## 5. Module 4 — Quotation Management (Builder) ⭐ Current Focus

**What it does:** The cart-building screen. A Sales Rep picks a customer, adds product lines, sets quantity and discount per line, and sees the total and margin update as they go. **This does NOT include the risk score or approval logic yet — that's Module 5.** Keep this module scoped to just: create → add lines → calculate totals → save draft.

**Roles:**
- **Sales Rep** — full create/edit access, but only on their own quotations
- **Sales Manager, Finance, Admin** — can view any quotation (read-only) but cannot edit lines
- **Customer** — no access at all yet (that's the Portal, Module 10)

**Backend checklist:**
- [ ] `Quotation` entity: id, customerId, salesRepId, status (start with just `DRAFT` for now), totalAmount, createdAt, updatedAt
- [ ] `QuotationLine` entity: id, quotationId, productId, quantity, unitPrice, discountPercent, lineTotal, marginAmount
- [ ] `POST /api/quotations` — create draft (customerId + salesRepId from logged-in user)
- [ ] `PUT /api/quotations/{id}/lines` — add/update/remove a line, and **recalculate `totalAmount` and margin on the server every time**, never trust a total sent from the frontend
- [ ] `GET /api/quotations/{id}` — full detail with lines, returned as a DTO (not the raw entity — this fixes the #1 cause of the "Lines" nested list crashing on serialization)
- [ ] `GET /api/quotations?repId=` — list for the logged-in rep
- [ ] Role check: reject edit attempts from any Sales Rep who is not the `salesRepId` owner of that quotation

**Frontend checklist:**
- [ ] `QuotationService` — TypeScript interfaces for `Quotation` and `QuotationLine` must match the backend DTO field names **exactly**, including casing (`totalAmount` not `total_amount`)
- [ ] Quotation List screen (simple table/cards is fine for now — full Kanban comes later)
- [ ] Quotation Builder screen: product picker (reads Module 2's product API), quantity +/-, discount input per line
- [ ] Live total + margin display, recalculated from the server response after every line change (don't calculate it in the frontend and hope it matches — always trust and display what the backend returns)
- [ ] Clear error messages on failed API calls (a red toast/banner, not a silent console error) — this alone would have made your current bug much faster to diagnose

**How to verify before moving on — do this exactly, in this order:**
1. Log in as Sales Rep A. Create a new quotation for one of your 3 seeded customers.
2. Add a product line: quantity 2, discount 5%. Confirm the returned total and margin are mathematically correct.
3. Add a second line with a different product. Confirm the total updates to reflect both lines.
4. Refresh the browser page. Confirm the quotation and its lines are still there exactly as saved (proves persistence, not just in-memory state).
5. Log out, log in as Sales Rep B. Try to open Rep A's quotation for editing. Confirm you get blocked (403) or a read-only view — not a silent failure.
6. Log in as Sales Manager. Confirm you can *view* Rep A's quotation but cannot see an "edit" option.
7. Open browser DevTools → Network tab while doing all of the above. Every request should return 200 (or the correct error code), with a response body matching your DTO — if anything returns 500, fix that before moving to Module 5, don't work around it.

---

## 6. Module 5 — Blended Discount Risk Engine + Submit-for-Approval

**What it does:** When a rep hits "Submit," the system checks every line's discount against its category/tier ceiling, computes a risk score, and automatically decides: auto-approve, send to Manager, or send to Manager then Finance. The rep never manually picks who approves.

**Roles:**
- **Sales Rep** — clicks Submit, sees the resulting status
- System — computes the score and creates approval records automatically

**The algorithm (implement and unit-test this as a plain function before wiring it into any endpoint):**

```
For each line:
    tier_ceiling     = customer.tier.maxDiscountPercent
    category_ceiling = line.product.category.maxDiscountPercent
    line_ceiling      = MIN(tier_ceiling, category_ceiling)
    line_overage      = MAX(0, line.discountPercent - line_ceiling)
    line_weight       = line.lineTotal / quotation.totalAmount

blended_score = (SUM(line_overage_i * line_weight_i) * 10)
              + (5 if ANY line_overage > 5 else 0)

Routing:
    score == 0                                → status = APPROVED (auto)
    0 < score <= 10                           → status = PENDING_APPROVAL, create 1 approval step (MANAGER)
    score > 10 OR any line overage > 8         → status = PENDING_APPROVAL, create 2 approval steps (MANAGER, then FINANCE)
```

**Backend checklist:**
- [ ] Pure function `calculateBlendedRiskScore(quotation)` — unit test it standalone first, no database, no HTTP
- [ ] Unit test with this exact case: Gold customer, Hardware line discount 12% (ceiling 15%, overage 0), Service line discount 18% (ceiling 10%, overage 8) → must result in MANAGER_THEN_FINANCE
- [ ] `POST /api/quotations/{id}/submit` — runs the function, updates `status`, creates `ApprovalStep` row(s) based on the result
- [ ] `ApprovalStep` entity: id, quotationId, level (MANAGER/FINANCE), status (PENDING/APPROVED/REJECTED), approverId, actedAt, comments

**Frontend checklist:**
- [ ] "Submit for Approval" button on the Quotation Builder
- [ ] Status badge on the quotation (Draft / Pending Approval / Approved) updates immediately after submit
- [ ] A simple "why is this pending" breakdown showing which line caused it (even a basic table is fine at this stage — polish comes later)

**How to verify before moving on:**
1. Build a quotation where every line is within its ceiling. Submit. Confirm status becomes `APPROVED` instantly, with zero approval steps created.
2. Build the exact Gold/Hardware/Service test case above. Submit. Confirm status is `PENDING_APPROVAL` and exactly 2 approval steps exist (MANAGER, FINANCE), in that order.
3. Build a case where no single line is badly over, but several lines are each a little over (e.g., three lines each 2–3 points over their ceiling). Confirm the blended score still catches it — this proves you didn't just build a single-line check.

---

## 7. Module 6 — Approval Workflow

**What it does:** Managers and Finance review flagged quotations and approve, reject, or send them back for revision.

**Roles:**
- **Sales Manager** — acts on the Manager-level step
- **Finance** — acts on the Finance-level step (only after Manager has approved, if both are required)
- **Sales Rep** — sees status update, can edit again if returned

**Backend checklist:**
- [ ] `POST /api/quotations/{id}/approval/act` — body: `{ level, decision: APPROVE|REJECT|RETURN, comments }`
- [ ] Enforce sequencing: Finance cannot act until Manager's step is `APPROVED` (if both steps exist)
- [ ] On final approval, update `Quotation.status = APPROVED`
- [ ] On reject, `status = REJECTED`
- [ ] On return, `status = DRAFT` (rep can edit again) and clear/reset the approval steps
- [ ] Log every action (who, when, decision, comments) — this is your audit trail data

**Frontend checklist:**
- [ ] Approval screen listing quotations pending the logged-in user's level
- [ ] Risk breakdown display (which line caused the flag)
- [ ] Approve / Reject / Return buttons with a required comment field
- [ ] Audit trail / history view on the quotation

**How to verify before moving on:**
1. As Manager, approve a Manager-only quotation → confirm status becomes `APPROVED` immediately.
2. As Manager, approve a Manager+Finance quotation → confirm status stays `PENDING_APPROVAL` (waiting on Finance), NOT approved yet.
3. As Finance, approve that same quotation → confirm status now becomes `APPROVED`.
4. As Manager, Reject a quotation → confirm status becomes `REJECTED` and the Sales Rep sees this on their list.
5. As Manager, Return a quotation → confirm the Sales Rep can now edit it again, and re-submitting re-runs the risk engine from scratch.

---

## 8. Module 7 — Warehouse Setup + Fulfillment Split

**What it does:** Once approved, the system figures out which warehouse(s) should ship the order, minimizing the number of shipments.

**Roles:**
- **Admin** — sets up warehouses and stock
- **Finance** — reviews/accepts/overrides the suggested split
- **Sales Rep** — views the split (read-only)

**Backend checklist:**
- [ ] `Warehouse` entity: id, name, shippingCostWeight
- [ ] `WarehouseStock` entity: id, warehouseId, productId, quantityAvailable
- [ ] Split algorithm: if one warehouse has enough stock, use only that one; otherwise allocate from cheapest-shipping warehouses first, flag any unmet quantity as `isBackorder`
- [ ] `FulfillmentSplit` entity + `GET/POST /api/quotations/{id}/fulfillment-plan`

**Frontend checklist:**
- [ ] Admin: Warehouse + Stock management screens
- [ ] Fulfillment screen on an approved quotation: warehouse, quantity, shipment count, Accept/Override buttons

**How to verify before moving on:**
1. Set up 2 warehouses. Give Warehouse A enough stock for a product, Warehouse B none. Submit an order for that product → confirm it's fulfilled entirely from Warehouse A (no unnecessary split).
2. Reduce Warehouse A's stock below the order quantity, give Warehouse B the remainder. Re-run → confirm the system correctly splits across both.
3. Set stock lower than the total order quantity across all warehouses → confirm the shortfall is flagged as backorder, not silently ignored.

---

## 9. Module 8 — Subscription Plans + Billing/Proration

**What it does:** Handles recurring subscription lines mixed with one-time product lines on the same order, including fair pro-rated billing when quantities change mid-cycle.

**Roles:**
- **Admin** — sets up subscription plans
- **Sales Rep, Finance** — view the billing breakdown

**Backend checklist:**
- [ ] `SubscriptionPlan` entity: id, name, billingCycle (MONTHLY/QUARTERLY/YEARLY)
- [ ] `BillingSchedule` entity: id, quotationLineId, billingDate, amount, status
- [ ] Proration function: `daysRemaining / totalCycleDays * planPrice * quantityDelta`

**Frontend checklist:**
- [ ] Admin: Subscription Plan config screen
- [ ] Billing screen on a quotation: one-time lines and recurring lines shown in separate sections, with the upcoming billing schedule

**How to verify before moving on:**
1. Create a quotation with one one-time product line and one recurring subscription line. Confirm the Billing screen correctly separates them.
2. Simulate a mid-cycle quantity increase on the subscription line → confirm the prorated amount is mathematically correct and shown transparently (e.g. "14 of 30 days remaining → 46.7%").

---

## 10. Module 9 — Upsell / Cross-Sell

**What it does:** While building a quote, suggests additional products based on configured pairing rules, showing margin impact.

**Roles:**
- **Admin** — configures pairing rules
- **Sales Rep** — sees and acts on suggestions

**Backend checklist:**
- [ ] `UpsellRule` entity: id, baseProductId, suggestedProductId, coPurchaseScore, isPromoted, minMarginThreshold
- [ ] `GET /api/quotations/{id}/upsell-suggestions` — returns ranked suggestions for products currently in the cart

**Frontend checklist:**
- [ ] Admin: Upsell Rule config screen
- [ ] Upsell panel beside the Quotation Builder: suggested product, margin delta, Add/Dismiss

**How to verify before moving on:**
1. Configure a rule: Product A → suggests Product B, above the margin threshold.
2. Add Product A to a quote → confirm Product B appears as a suggestion.
3. Click Add → confirm it becomes a real line and the total/margin update immediately.

---

## 11. Module 10 — Customer Portal + Negotiation

**What it does:** A genuinely separate, restricted screen where the customer views their quote and can counter-negotiate — no email back-and-forth.

**Roles:**
- **Customer only** — this is a completely separate app/module, not an internal screen with different styling

**Backend checklist:**
- [ ] Magic-link or portal login, issuing a token scoped ONLY to that customer's quotation(s)
- [ ] `GET /api/portal/quotations/{token}`
- [ ] `POST /api/portal/quotations/{token}/negotiate` — counter-discount or comment
- [ ] `POST /api/portal/quotations/{token}/confirm` — if new terms cross the threshold, **re-run Module 5's risk engine and re-enter Module 6's approval flow automatically**; otherwise proceed to fulfillment

**Frontend checklist:**
- [ ] Separate Angular module/route tree, its own layout, its own guard — a customer token must never work on any internal route
- [ ] Quotation view with status, comment/counter-discount field, Confirm button

**How to verify before moving on:**
1. Generate a portal link for a sent quotation, open it as a customer (not logged in as any internal role).
2. Try navigating directly to an internal URL (e.g. `/workspace/quotations`) using the customer token → confirm it's blocked.
3. Submit a counter-discount that pushes the quote over its threshold → confirm it automatically reappears in Module 6's Approval screen with no manual step by the rep.
4. Submit a counter-discount that stays within limits → confirm it goes straight toward fulfillment, skipping approval.

---

## 12. Module 11 — Deal Health Dashboard + Anomaly Detection

**What it does:** A background job scans all active deals and flags ones that are stalled or show an unusually large discount for that rep.

**Roles:**
- **Sales Manager, Finance, Admin** — view the dashboard and act on flags

**Backend checklist:**
- [ ] Scheduled job (`@Scheduled`) running every few minutes
- [ ] Stalled check: no activity for X days on a non-final-status quotation
- [ ] Anomaly check: discount significantly above that rep's own historical average
- [ ] `DealHealthFlag` entity + `GET /api/dashboard/deal-health`

**Frontend checklist:**
- [ ] Dashboard screen with flag cards, click-through to the quotation

**How to verify before moving on:**
1. Temporarily lower the stall threshold to 1–2 minutes for testing. Leave a quotation untouched → confirm a `STALLED` flag appears after one job run.
2. Give one rep several normal-discount deals, then one deal with a much higher discount → confirm an `ANOMALY` flag appears specifically for that outlier deal.
3. Click a flag → confirm it opens the exact correct quotation.

---

## 13. Module 12 — Reporting & Export

**What it does:** Filterable sales reports, exportable as PDF/XLS.

**Roles:** Admin, Sales Manager, Finance.

**Backend checklist:**
- [ ] `GET /api/reports?period=&repId=&status=&category=&format=pdf|xls`

**Frontend checklist:**
- [ ] Filter bar + export buttons

**How to verify before moving on:**
1. Filter by each parameter individually and in combination, confirm the returned data matches what you'd expect from your seed data.
2. Export both PDF and XLS, confirm both files open correctly and contain the filtered data.

---

## 14. Module 13 — Audit Trail & Notifications (Formalize)

By this point, several modules already log actions (approvals, negotiations). This step just makes sure it's consistent and visible.

**Checklist:**
- [ ] Every state-changing action (submit, approve, reject, return, negotiate, confirm) writes one audit log row: who, what, when, before/after, reason
- [ ] A visible audit trail/timeline component on the Quotation and Approval screens
- [ ] A notification bell showing relevant alerts (approval needed, deal flagged, negotiation received) per role

---

## 15. Module 14 — Final End-to-End Verification (Do This Before Any Demo)

Run this full sequence start to finish, as one continuous test, with no restarting halfway:

1. Log in as Admin. Confirm a discount tier, warehouse, and subscription plan exist.
2. Log in as Sales Rep. Create a quotation, add a line with a discount above its allowed limit.
3. Submit — confirm it automatically requests approval, without you manually picking an approver.
4. While building, accept one upsell suggestion — confirm total and margin update immediately.
5. Log in as Manager (then Finance if required) — approve. Confirm the risk breakdown correctly explains why it was flagged.
6. Confirm stock pulls from the correct warehouse, and force a two-warehouse split at least once.
7. Confirm a one-time product and a subscription line on the same order bill correctly and separately.
8. Open the customer portal, request a bigger discount, confirm it automatically re-enters approval.
9. Confirm the order, record payment, confirm invoice status updates.
10. Open the Deal Health Dashboard, confirm a flag is visible and clicking it opens the right quotation.

If all ten steps run without you needing to fix anything live, every module is genuinely wired together correctly — not just individually working in isolation.

---

## 16. Debugging Habits To Avoid Another "Quotation Is Broken" Situation

- **Test the backend alone first, every time.** Before touching Angular, hit the endpoint directly (Postman/browser) and confirm the JSON shape and status code are correct. If it's wrong here, it will be wrong everywhere downstream — fix it at the source.
- **Never return a raw JPA entity from a controller.** Always map to a DTO. This single habit prevents the most common "works sometimes, 500s other times" bug (lazy-loaded relationships failing during JSON serialization).
- **Keep frontend model field names identical to backend DTO field names**, including exact casing. A silent `undefined` in Angular is very often just a name mismatch.
- **Check the Network tab, not just the UI.** A blank screen could be a 403, a 500, or a successful response your component just isn't rendering — these need completely different fixes.
- **Commit working checkpoints.** After a module passes its verification checklist, commit before starting the next one, so you always have a known-good point to return to.
