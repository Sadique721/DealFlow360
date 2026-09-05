import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { QuotationService } from '../services/quotation.service';
import { CatalogService } from '../services/catalog.service';
import { Quotation, QuotationLine, Product, Customer, RiskCalculationResult, UpsellSuggestion } from '../models/dealflow.model';
import { generate120Products, MOCK_PRODUCTS } from '../services/mock-data';

@Component({
  selector: 'app-quote-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="builder-container" *ngIf="quote">
      <!-- Breadcrumb & Top Bar -->
      <div class="top-nav glass-panel">
        <div class="nav-left">
          <a routerLink="/dashboard/pipeline" class="back-link">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"></path></svg>
            Pipeline
          </a>
          <span class="divider">/</span>
          <span class="quote-id mono">{{ quote.quoteNumber }}</span>
          <span
            class="badge"
            [class.badge-warning]="quote.status === 'PENDING_APPROVAL'"
            [class.badge-success]="quote.status === 'APPROVED' || quote.status === 'CONFIRMED' || quote.status === 'ACCEPTED'"
            [class.badge-neutral]="quote.status === 'DRAFT'"
            [class.badge-info]="quote.status === 'SENT_TO_CUSTOMER'"
          >
            {{ quote.status.replace('_', ' ') }}
          </span>
        </div>

        <div class="nav-actions">
          <!-- Preset Scenarios for Hackathon Live Demo -->
          <div class="scenario-buttons">
            <span class="scenario-label desktop-only">Quick Demo Presets:</span>
            <button class="btn btn-outline btn-sm" (click)="applyPreset('safe')" title="Standard safe discount with >35% margin">
              🟢 Safe Deal (>35%)
            </button>
            <button class="btn btn-outline btn-sm" (click)="applyPreset('aggressive')" title="Capex spike triggering Manager & VP review">
              🟡 Manager Escalation
            </button>
            <button class="btn btn-outline btn-sm" (click)="applyPreset('critical')" title="Severe discount erosion triggering CFO desk">
              🔴 CFO Emergency Desk
            </button>
          </div>

          <a *ngIf="quote.id" [routerLink]="['/fulfillment', quote.id]" class="btn btn-outline btn-sm">
            Warehouse Splits
          </a>

          <button
            *ngIf="quote.status === 'DRAFT' || quote.status === 'UNDER_NEGOTIATION'"
            class="btn btn-primary btn-sm"
            (click)="submitForApproval()"
          >
            Submit for Approval 🚀
          </button>

          <button
            *ngIf="quote.status === 'APPROVED'"
            class="btn btn-success btn-sm"
            (click)="confirmOrder()"
          >
            Convert to Sales Order ✓
          </button>
        </div>
      </div>

      <!-- Main Dual-Pane Workspace Grid -->
      <div class="builder-grid">
        <!-- Left: Line Items (Hybrid Capex & Opex Split) -->
        <div class="main-column">
          <!-- Customer & Header Info -->
          <div class="glass-panel customer-panel">
            <div class="panel-row">
              <div class="client-meta">
                <span class="client-label">Enterprise Customer:</span>
                <h3>{{ quote.customer.name }}</h3>
                <span class="badge badge-purple">{{ quote.customer.tier.tierName }}</span>
                <span class="destination-tag">📍 {{ quote.customer.destinationRegion || 'North America West' }}</span>
              </div>

              <div class="deal-meta">
                <div>Sales Rep: <strong>{{ quote.salesRep.name }}</strong></div>
                <div>Created: <span class="mono">{{ (quote.createdAt || now) | date:'mediumDate' }}</span></div>
                <div>Target Delivery: <span class="mono">{{ quote.promisedDeliveryDate || '2026-09-28' }}</span></div>
              </div>
            </div>
          </div>

          <!-- Add Product to Cart Selector -->
          <div class="glass-panel product-picker-panel">
            <div class="picker-row">
              <div class="picker-dropdown">
                <label class="form-label">Catalog Selector (120+ Enterprise Products)</label>
                <select class="form-control" [(ngModel)]="selectedProductId">
                  <option [ngValue]="null">-- Select hardware, cloud subscription, or services --</option>
                  <option *ngFor="let p of availableProducts" [ngValue]="p.id">
                    [{{ p.type }}] {{ p.name }} ({{ formatCurrency(p.basePrice) }}) — Max Disc: {{ p.category.maxDiscountCeilingPct || 15 }}%
                  </option>
                </select>
              </div>

              <button class="btn btn-primary" [disabled]="!selectedProductId" (click)="addLineItem()">
                + Add Line Item
              </button>
            </div>
          </div>

          <!-- SECTION 1: ONE-TIME HARDWARE & PROFESSIONAL SERVICES (CAPEX) -->
          <div class="glass-panel items-panel">
            <div class="panel-header">
              <div class="section-title">
                <span class="badge badge-info">CAPEX</span>
                <h4>One-Time Hardware & Engineering Services ({{ capexLines.length }} lines)</h4>
              </div>
              <span class="mono total-pill">Subtotal: {{ formatCurrency(capexSubtotal) }}</span>
            </div>

            <div class="table-container">
              <table class="table-custom">
                <thead>
                  <tr>
                    <th>Product & SKU</th>
                    <th>Category Cap</th>
                    <th style="width: 90px;">Quantity</th>
                    <th>List Price</th>
                    <th style="width: 130px;">Discount %</th>
                    <th>Net Price</th>
                    <th>Gross Margin</th>
                    <th>Line Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let line of capexLines; let i = index">
                    <td>
                      <div class="prod-info">
                        <strong>{{ line.product.name }}</strong>
                        <span class="mono sku">{{ line.product.sku }} | {{ line.product.type }}</span>
                      </div>
                    </td>
                    <td>
                      <span class="badge badge-neutral">
                        Max {{ line.product.category.maxDiscountCeilingPct || 15 }}%
                      </span>
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        class="form-control text-center"
                        [(ngModel)]="line.quantity"
                        (change)="recomputeLine(line)"
                      />
                    </td>
                    <td class="mono">{{ formatCurrency(line.unitListPrice) }}</td>
                    <td>
                      <div class="discount-input-wrapper">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          class="form-control text-center"
                          [(ngModel)]="line.unitDiscountPct"
                          (input)="recomputeLine(line)"
                          [class.input-overage]="isOverage(line)"
                        />
                        <span *ngIf="isOverage(line)" class="overage-flag" title="Exceeds category ceiling! Needs approval.">⚠️</span>
                      </div>
                    </td>
                    <td class="mono font-semibold">{{ formatCurrency(line.unitFinalPrice) }}</td>
                    <td>
                      <span class="badge" [style.background]="getMarginBadgeBg(line.lineMarginPct)" [style.color]="getMarginColor(line.lineMarginPct)">
                        {{ line.lineMarginPct | number:'1.1-1' }}%
                      </span>
                    </td>
                    <td class="mono font-bold">{{ formatCurrency(line.lineTotal) }}</td>
                    <td>
                      <button class="btn-icon-delete" (click)="removeLine(line)" title="Remove item">✕</button>
                    </td>
                  </tr>
                  <tr *ngIf="capexLines.length === 0">
                    <td colspan="9" class="text-center empty-notice">
                      No one-time hardware lines added. Pick an item above or apply a demo preset.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- SECTION 2: RECURRING CLOUD & AI SUBSCRIPTIONS (OPEX) -->
          <div class="glass-panel items-panel">
            <div class="panel-header">
              <div class="section-title">
                <span class="badge badge-purple">OPEX</span>
                <h4>Recurring SaaS & Cloud Subscriptions ({{ opexLines.length }} lines)</h4>
              </div>
              <span class="mono total-pill">Recurring ARR/MRR: {{ formatCurrency(opexSubtotal) }}</span>
            </div>

            <div class="table-container">
              <table class="table-custom">
                <thead>
                  <tr>
                    <th>Subscription Plan</th>
                    <th>Cadence</th>
                    <th style="width: 90px;">Seats / Qty</th>
                    <th>Rate / Month</th>
                    <th style="width: 130px;">Discount %</th>
                    <th>Net Rate</th>
                    <th>Subscription Margin</th>
                    <th>Annualized Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let line of opexLines; let i = index">
                    <td>
                      <div class="prod-info">
                        <strong>{{ line.product.name }}</strong>
                        <span class="mono sku">{{ line.product.sku }} | Auto-Prorated</span>
                      </div>
                    </td>
                    <td>
                      <span class="badge badge-purple">{{ line.product.billingFrequency || 'ANNUAL' }}</span>
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        class="form-control text-center"
                        [(ngModel)]="line.quantity"
                        (change)="recomputeLine(line)"
                      />
                    </td>
                    <td class="mono">{{ formatCurrency(line.unitListPrice) }}</td>
                    <td>
                      <div class="discount-input-wrapper">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          class="form-control text-center"
                          [(ngModel)]="line.unitDiscountPct"
                          (input)="recomputeLine(line)"
                          [class.input-overage]="isOverage(line)"
                        />
                        <span *ngIf="isOverage(line)" class="overage-flag">⚠️</span>
                      </div>
                    </td>
                    <td class="mono font-semibold">{{ formatCurrency(line.unitFinalPrice) }}</td>
                    <td>
                      <span class="badge badge-success">
                        {{ line.lineMarginPct | number:'1.1-1' }}%
                      </span>
                    </td>
                    <td class="mono font-bold">{{ formatCurrency(line.lineTotal) }}</td>
                    <td>
                      <button class="btn-icon-delete" (click)="removeLine(line)" title="Remove subscription">✕</button>
                    </td>
                  </tr>
                  <tr *ngIf="opexLines.length === 0">
                    <td colspan="9" class="text-center empty-notice">
                      No recurring subscriptions attached. Pick a cloud plan to enable hybrid billing.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- UPSELL & CROSS-SELL INTELLIGENCE PANEL (B5 in PDF) -->
          <div class="glass-panel upsell-panel" *ngIf="upsells.length > 0">
            <div class="upsell-header">
              <span class="upsell-sparkle">✨</span>
              <div>
                <h4>Live AI Upsell & Margin Booster Suggestions</h4>
                <p class="sub">Ranked recommendations based on historical co-purchase patterns with positive margin delta</p>
              </div>
            </div>

            <div class="upsell-cards">
              <div class="glass-panel upsell-card" *ngFor="let u of upsells">
                <div class="upsell-card-top">
                  <span class="badge badge-info">{{ u.ruleName || 'Recommended Bundle' }}</span>
                  <span class="badge badge-success">+{{ u.marginImpactPct || 4.5 }}% Margin Delta</span>
                </div>
                <h5>{{ u.recommendedProduct?.name || u.suggestedProduct?.name || 'Mission Critical Support' }}</h5>
                <p class="upsell-desc">{{ u.explanation || u.benefitDescription }}</p>
                <div class="upsell-actions">
                  <span class="mono upsell-val">+{{ formatCurrency(u.revenueImpact || 16200) }} ACV</span>
                  <button class="btn btn-success btn-sm" (click)="acceptUpsell(u)">
                    + Add to Quotation
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Real-time Live Margin Gauge & Risk Radar -->
        <div class="sidebar-column">
          <!-- LIVE MARGIN GAUGE CARD -->
          <div class="glass-panel gauge-card">
            <div class="gauge-header">
              <h3>Live Margin Health Gauge</h3>
              <span class="badge" [class.badge-success]="quote.marginPct >= 30" [class.badge-warning]="quote.marginPct >= 18 && quote.marginPct < 30" [class.badge-danger]="quote.marginPct < 18">
                {{ quote.marginPct >= 30 ? 'Target Healthy' : quote.marginPct >= 18 ? 'Margin At Risk' : 'Severe Margin Erosion' }}
              </span>
            </div>

            <div class="gauge-wrapper">
              <svg class="gauge-svg" viewBox="0 0 200 120">
                <!-- Background track arc -->
                <path
                  d="M 20 100 A 80 80 0 0 1 180 100"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.08)"
                  stroke-width="14"
                  stroke-linecap="round"
                />
                <!-- Active dynamic progress arc -->
                <path
                  d="M 20 100 A 80 80 0 0 1 180 100"
                  fill="none"
                  [attr.stroke]="getMarginColor(quote.marginPct)"
                  stroke-width="14"
                  stroke-linecap="round"
                  stroke-dasharray="251.2"
                  [attr.stroke-dashoffset]="calculateDashOffset(quote.marginPct)"
                  style="transition: stroke-dashoffset 0.6s ease, stroke 0.4s ease;"
                />
              </svg>

              <div class="gauge-center">
                <span class="gauge-val" [style.color]="getMarginColor(quote.marginPct)">
                  {{ quote.marginPct | number:'1.1-1' }}%
                </span>
                <span class="gauge-lbl">Net Blended Gross Margin</span>
              </div>
            </div>

            <div class="gauge-thresholds">
              <span class="text-danger">0% Critical</span>
              <span class="text-warning">20% Tier 1</span>
              <span class="text-emerald">35%+ Target</span>
            </div>
          </div>

          <!-- BLENDED RISK SCORE BREAKDOWN CARD -->
          <div class="glass-panel risk-card">
            <div class="card-head">
              <h4>Blended Discount Risk Engine</h4>
              <span
                class="badge"
                [class.badge-success]="quote.riskSeverity === 'LOW'"
                [class.badge-warning]="quote.riskSeverity === 'MEDIUM'"
                [class.badge-danger]="quote.riskSeverity === 'HIGH' || quote.riskSeverity === 'CRITICAL'"
              >
                {{ quote.riskSeverity }} RISK
              </span>
            </div>

            <div class="risk-bar-container">
              <div class="risk-bar-bg">
                <div
                  class="risk-bar-fill"
                  [style.width.%]="Math.min(100, quote.riskScore)"
                  [style.background]="getRiskColor(quote.riskSeverity)"
                ></div>
              </div>
              <div class="risk-bar-meta">
                <span>Calculated Risk Score: <strong>{{ quote.riskScore | number:'1.1-1' }}/100</strong></span>
                <span>Threshold: 25.0</span>
              </div>
            </div>

            <!-- Approval Hierarchy Matrix Notice -->
            <div class="approval-notice" *ngIf="quote.requiresManagerApproval || quote.requiresFinanceApproval">
              <div class="notice-icon">🛡️</div>
              <div>
                <strong>Governance Policy Triggered:</strong>
                <p>
                  {{ quote.requiresFinanceApproval ? 'Single line discount exceeds 15% ceiling or margin < 20%. Requires Sales Manager + VP & CFO sign-off.' : 'Blended discount exceeds 10%. Requires Sales Manager approval.' }}
                </p>
              </div>
            </div>

            <div class="approval-notice success-notice" *ngIf="!quote.requiresManagerApproval && !quote.requiresFinanceApproval">
              <div class="notice-icon">✓</div>
              <div>
                <strong>Auto-Approved (Level 0):</strong>
                <p>All line discounts within category ceilings and margin exceeds target. Ready to convert or fulfill.</p>
              </div>
            </div>
          </div>

          <!-- QUOTATION FINANCIAL SUMMARY CARD -->
          <div class="glass-panel summary-card">
            <h4>Quotation Financial Summary</h4>
            <div class="summary-lines">
              <div class="summary-line">
                <span>Gross List Subtotal:</span>
                <span class="mono">{{ formatCurrency(quote.subtotalAmount) }}</span>
              </div>
              <div class="summary-line text-warning">
                <span>Total Discount ({{ quote.blendedDiscountPct | number:'1.1-1' }}%):</span>
                <span class="mono">-{{ formatCurrency(quote.totalDiscountAmount) }}</span>
              </div>
              <div class="summary-line">
                <span>Estimated Freight & Logistics:</span>
                <span class="mono">+{{ formatCurrency(quote.shippingAmount || 1850) }}</span>
              </div>
              <div class="summary-line">
                <span>Sales Tax (Est. 7.5%):</span>
                <span class="mono">+{{ formatCurrency(quote.taxAmount || 0) }}</span>
              </div>
              <div class="summary-line total-line">
                <span>Net Total Commitment:</span>
                <span class="mono total-amount">{{ formatCurrency(quote.totalAmount) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .builder-container {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .top-nav {
      padding: 12px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }
    .nav-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .back-link {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--text-sub);
      text-decoration: none;
      font-weight: 600;
    }
    .back-link:hover { color: var(--brand-primary); }
    .divider { color: var(--text-muted); }
    .quote-id { font-size: 17px; font-weight: 800; color: #00f2fe; }
    .nav-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .scenario-buttons {
      display: flex;
      align-items: center;
      gap: 6px;
      padding-right: 8px;
      border-right: 1px solid var(--border-subtle);
    }
    .scenario-label {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
    }
    .builder-grid {
      display: grid;
      grid-template-columns: 1fr 360px;
      gap: 18px;
    }
    @media (max-width: 1080px) {
      .builder-grid { grid-template-columns: 1fr; }
    }
    .main-column {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .customer-panel {
      padding: 18px;
    }
    .panel-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 14px;
    }
    .client-meta {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .client-label {
      font-size: 11px;
      color: var(--text-muted);
      text-transform: uppercase;
      font-weight: 700;
    }
    .client-meta h3 {
      font-size: 18px;
      color: #fff;
    }
    .destination-tag {
      font-size: 12px;
      color: var(--text-sub);
    }
    .deal-meta {
      display: flex;
      gap: 16px;
      font-size: 12px;
      color: var(--text-sub);
    }
    .product-picker-panel {
      padding: 14px 18px;
    }
    .picker-row {
      display: flex;
      align-items: flex-end;
      gap: 12px;
    }
    .picker-dropdown {
      flex: 1;
    }
    .items-panel {
      padding: 0;
      overflow: hidden;
    }
    .panel-header {
      padding: 14px 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(12, 18, 34, 0.6);
      border-bottom: 1px solid var(--border-subtle);
    }
    .section-title {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .section-title h4 {
      font-size: 15px;
      margin: 0;
    }
    .total-pill {
      font-size: 12px;
      font-weight: 700;
      color: #00f2fe;
    }
    .prod-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .sku {
      font-size: 10px;
      color: var(--text-muted);
    }
    .discount-input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }
    .input-overage {
      border-color: #ff007a !important;
      color: #ff007a !important;
      font-weight: 700;
    }
    .overage-flag {
      position: absolute;
      right: 6px;
      font-size: 12px;
    }
    .btn-icon-delete {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 14px;
      padding: 4px;
    }
    .btn-icon-delete:hover { color: #ff007a; }
    .empty-notice {
      padding: 30px;
      color: var(--text-muted);
      font-style: italic;
    }
    /* Upsell Panel */
    .upsell-panel {
      padding: 18px;
      border: 1px solid rgba(0, 223, 162, 0.3);
      background: linear-gradient(135deg, rgba(13, 21, 38, 0.9), rgba(0, 223, 162, 0.05));
    }
    .upsell-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 14px;
    }
    .upsell-sparkle { font-size: 24px; }
    .upsell-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 14px;
    }
    .upsell-card {
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .upsell-card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .upsell-desc {
      font-size: 12px;
      color: var(--text-sub);
    }
    .upsell-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 4px;
    }
    .upsell-val {
      font-size: 13px;
      font-weight: 700;
      color: #00dfa2;
    }
    /* Sidebar Cards */
    .sidebar-column {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .gauge-card {
      padding: 18px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .gauge-header {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .gauge-header h3 { font-size: 14px; }
    .gauge-wrapper {
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .gauge-svg {
      width: 220px;
      height: 125px;
    }
    .gauge-center {
      position: absolute;
      bottom: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .gauge-val {
      font-size: 32px;
      font-weight: 800;
      font-family: 'Outfit', sans-serif;
    }
    .gauge-lbl {
      font-size: 11px;
      color: var(--text-muted);
    }
    .gauge-thresholds {
      width: 100%;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      font-family: 'JetBrains Mono', monospace;
      margin-top: 6px;
    }
    .risk-card {
      padding: 16px;
    }
    .card-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .card-head h4 { font-size: 13px; }
    .risk-bar-container {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 12px;
    }
    .risk-bar-bg {
      height: 8px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 4px;
      overflow: hidden;
    }
    .risk-bar-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.5s ease;
    }
    .risk-bar-meta {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: var(--text-muted);
    }
    .approval-notice {
      display: flex;
      gap: 10px;
      padding: 12px;
      border-radius: var(--radius-sm);
      background: rgba(255, 0, 122, 0.1);
      border: 1px solid rgba(255, 0, 122, 0.3);
      font-size: 11px;
      color: var(--text-sub);
    }
    .approval-notice strong { color: #fff; }
    .approval-notice p { margin-top: 2px; }
    .notice-icon { font-size: 20px; }
    .success-notice {
      background: rgba(0, 223, 162, 0.1);
      border-color: rgba(0, 223, 162, 0.3);
    }
    .summary-card {
      padding: 16px;
    }
    .summary-card h4 {
      font-size: 13px;
      margin-bottom: 12px;
    }
    .summary-lines {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .summary-line {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      color: var(--text-sub);
    }
    .total-line {
      margin-top: 6px;
      padding-top: 10px;
      border-top: 1px solid var(--border-subtle);
      font-size: 15px;
      font-weight: 700;
      color: #fff;
    }
    .total-amount {
      font-size: 18px;
      color: #00f2fe;
    }
  `]
})
export class QuoteBuilderComponent implements OnInit {
  quote?: Quotation;
  availableProducts: Product[] = [];
  selectedProductId: number | null = null;
  upsells: UpsellSuggestion[] = [];
  now = new Date().toISOString();
  Math = Math;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private quoteService: QuotationService,
    private catalogService: CatalogService
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam || idParam === 'new') {
      this.quote = this.createNewOrFallbackQuote(1);
    } else {
      const quoteId = parseInt(idParam, 10);
      this.loadQuote(isNaN(quoteId) ? 1 : quoteId);
    }
    this.loadProducts();
  }

  loadQuote(id: number): void {
    this.quoteService.getQuotationById(id).subscribe({
      next: (q) => {
        if (q && q.lines && q.lines.length > 0) {
          this.quote = q;
        } else {
          this.quote = this.createNewOrFallbackQuote(id);
        }
        if (this.quote) {
          this.loadUpsells(this.quote.id);
        }
      },
      error: () => {
        this.quote = this.createNewOrFallbackQuote(id);
      }
    });
  }

  loadProducts(): void {
    this.catalogService.getProducts().subscribe({
      next: (prods) => {
        if (prods && prods.length > 0) {
          this.availableProducts = prods;
        } else {
          this.availableProducts = generate120Products();
        }
      },
      error: () => {
        this.availableProducts = generate120Products();
      }
    });
  }

  loadUpsells(quoteId: number): void {
    this.quoteService.getUpsellSuggestions(quoteId).subscribe({
      next: (res) => this.upsells = res,
      error: () => {
        this.upsells = [
          {
            ruleId: 1,
            ruleName: 'Enterprise SLA Gold Bundle',
            recommendedProduct: MOCK_PRODUCTS[6],
            discountOverridePct: 10,
            revenueImpact: 16200,
            marginImpactPct: 4.8,
            explanation: 'Bundling Mission Critical Support with Ground Gateways increases contract value while elevating blended gross margin to 42%+.'
          },
          {
            ruleId: 2,
            ruleName: 'Autonomous AI Governor Upgrade',
            recommendedProduct: MOCK_PRODUCTS[5],
            discountOverridePct: 5,
            revenueImpact: 28800,
            marginImpactPct: 6.2,
            explanation: 'Attaching AI CPQ Governance to core server blades provides autonomous quote reconciliation with 75% gross profit margin.'
          }
        ];
      }
    });
  }

  get capexLines(): QuotationLine[] {
    if (!this.quote) return [];
    return this.quote.lines.filter(l => l.product.type !== 'SUBSCRIPTION' && l.product.type !== 'SOFTWARE_SUBSCRIPTION');
  }

  get opexLines(): QuotationLine[] {
    if (!this.quote) return [];
    return this.quote.lines.filter(l => l.product.type === 'SUBSCRIPTION' || l.product.type === 'SOFTWARE_SUBSCRIPTION');
  }

  get capexSubtotal(): number {
    return this.capexLines.reduce((sum, l) => sum + l.lineTotal, 0);
  }

  get opexSubtotal(): number {
    return this.opexLines.reduce((sum, l) => sum + l.lineTotal, 0);
  }

  addLineItem(): void {
    if (!this.selectedProductId || !this.quote) return;
    const prod = this.availableProducts.find(p => p.id === this.selectedProductId);
    if (!prod) return;

    const newLine: QuotationLine = {
      product: prod,
      quantity: 1,
      unitListPrice: prod.basePrice,
      unitDiscountPct: 0,
      unitDiscountAmount: 0,
      unitFinalPrice: prod.basePrice,
      lineTotal: prod.basePrice,
      lineCost: prod.unitCost,
      lineMarginPct: Number((((prod.basePrice - prod.unitCost) / prod.basePrice) * 100).toFixed(1))
    };

    this.quote.lines.push(newLine);
    this.selectedProductId = null;
    this.recalculateTotals();
  }

  removeLine(line: QuotationLine): void {
    if (!this.quote) return;
    const idx = this.quote.lines.indexOf(line);
    if (idx >= 0) {
      this.quote.lines.splice(idx, 1);
      this.recalculateTotals();
    }
  }

  recomputeLine(line: QuotationLine): void {
    const list = line.unitListPrice;
    const discPct = Math.min(100, Math.max(0, line.unitDiscountPct));
    line.unitDiscountPct = discPct;
    line.unitDiscountAmount = list * (discPct / 100);
    line.unitFinalPrice = list - line.unitDiscountAmount;
    line.lineTotal = line.unitFinalPrice * line.quantity;
    line.lineCost = line.product.unitCost * line.quantity;
    line.lineMarginPct = line.lineTotal > 0
      ? Number((((line.lineTotal - line.lineCost) / line.lineTotal) * 100).toFixed(1))
      : 0;

    this.recalculateTotals();
  }

  recalculateTotals(): void {
    if (!this.quote) return;
    let subtotal = 0;
    let totalDiscount = 0;
    let totalCost = 0;

    for (const l of this.quote.lines) {
      subtotal += l.unitListPrice * l.quantity;
      totalDiscount += l.unitDiscountAmount * l.quantity;
      totalCost += l.lineCost;
    }

    this.quote.subtotalAmount = subtotal;
    this.quote.totalDiscountAmount = totalDiscount;
    this.quote.blendedDiscountPct = subtotal > 0 ? Number(((totalDiscount / subtotal) * 100).toFixed(1)) : 0;
    this.quote.totalCostAmount = totalCost;

    const finalAfterDisc = subtotal - totalDiscount;
    this.quote.totalAmount = finalAfterDisc + (this.quote.shippingAmount || 1850) + (this.quote.taxAmount || 0);
    this.quote.marginPct = finalAfterDisc > 0
      ? Number((((finalAfterDisc - totalCost) / finalAfterDisc) * 100).toFixed(1))
      : 0;

    // Evaluate Risk Score locally & reactively
    const hasSingleLineSpike = this.quote.lines.some(l => l.unitDiscountPct > (l.product.category?.maxDiscountCeilingPct || 15));
    const blendedSpike = this.quote.blendedDiscountPct > 12;

    if (this.quote.marginPct < 18 || this.quote.blendedDiscountPct > 20) {
      this.quote.riskScore = 85.0;
      this.quote.riskSeverity = 'CRITICAL';
      this.quote.requiresManagerApproval = true;
      this.quote.requiresFinanceApproval = true;
    } else if (hasSingleLineSpike || blendedSpike) {
      this.quote.riskScore = 58.0;
      this.quote.riskSeverity = 'HIGH';
      this.quote.requiresManagerApproval = true;
      this.quote.requiresFinanceApproval = false;
    } else {
      this.quote.riskScore = Number((this.quote.blendedDiscountPct * 1.5).toFixed(1));
      this.quote.riskSeverity = this.quote.riskScore > 25 ? 'MEDIUM' : 'LOW';
      this.quote.requiresManagerApproval = false;
      this.quote.requiresFinanceApproval = false;
    }
  }

  applyPreset(type: 'safe' | 'aggressive' | 'critical'): void {
    if (!this.quote) return;
    if (type === 'safe') {
      this.quote.lines.forEach((l, idx) => {
        l.unitDiscountPct = idx === 0 ? 5 : 0;
        this.recomputeLine(l);
      });
    } else if (type === 'aggressive') {
      this.quote.lines.forEach((l, idx) => {
        l.unitDiscountPct = idx === 0 ? 18 : 8;
        this.recomputeLine(l);
      });
    } else {
      this.quote.lines.forEach((l, idx) => {
        l.unitDiscountPct = idx === 0 ? 28 : 22;
        this.recomputeLine(l);
      });
    }
  }

  acceptUpsell(u: UpsellSuggestion): void {
    if (!this.quote) return;
    const prod = u.recommendedProduct || u.suggestedProduct;
    if (!prod) return;

    this.quote.lines.push({
      product: prod,
      quantity: 1,
      unitListPrice: prod.basePrice,
      unitDiscountPct: u.discountOverridePct || 5,
      unitDiscountAmount: prod.basePrice * ((u.discountOverridePct || 5) / 100),
      unitFinalPrice: prod.basePrice * (1 - ((u.discountOverridePct || 5) / 100)),
      lineTotal: prod.basePrice * (1 - ((u.discountOverridePct || 5) / 100)),
      lineCost: prod.unitCost,
      lineMarginPct: 55.0
    });

    const idx = this.upsells.indexOf(u);
    if (idx >= 0) this.upsells.splice(idx, 1);
    this.recalculateTotals();
  }

  isOverage(line: QuotationLine): boolean {
    const ceiling = line.product.category?.maxDiscountCeilingPct || 15;
    return line.unitDiscountPct > ceiling;
  }

  submitForApproval(): void {
    if (!this.quote) return;
    this.quote.status = 'PENDING_APPROVAL';
    alert('Quotation submitted for approval! Auto-routed to Sales Manager & Finance approval hierarchy.');
    this.router.navigate(['/approval', this.quote.id]);
  }

  confirmOrder(): void {
    if (!this.quote) return;
    this.quote.status = 'CONFIRMED';
    alert('Order confirmed and converted to active Sales Order!');
    this.router.navigate(['/fulfillment', this.quote.id]);
  }

  calculateDashOffset(marginPct: number): number {
    const totalLength = 251.2;
    const clamped = Math.min(100, Math.max(0, marginPct));
    return totalLength - (totalLength * (clamped / 100));
  }

  getMarginColor(marginPct: number): string {
    if (marginPct >= 30) return '#00dfa2';
    if (marginPct >= 18) return '#fbbf24';
    return '#ff007a';
  }

  getMarginBadgeBg(marginPct: number): string {
    if (marginPct >= 30) return 'rgba(0, 223, 162, 0.15)';
    if (marginPct >= 18) return 'rgba(251, 191, 36, 0.15)';
    return 'rgba(255, 0, 122, 0.15)';
  }

  getRiskColor(sev: string): string {
    if (sev === 'CRITICAL') return '#ff007a';
    if (sev === 'HIGH') return '#fbbf24';
    if (sev === 'MEDIUM') return '#38bdf8';
    return '#00dfa2';
  }

  formatCurrency(val: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  }

  createNewOrFallbackQuote(id?: number): Quotation {
    return {
      id: id || 2,
      quoteNumber: 'Q-2026-1043',
      customer: {
        id: 2,
        name: 'SpaceX Starlink Operations',
        code: 'SPX-09',
        email: 'logistics@spacex.com',
        contactEmail: 'logistics@spacex.com',
        destinationRegion: 'North America West',
        tier: { id: 1, tierName: 'Enterprise Diamond', code: 'DIAMOND', defaultDiscountPct: 5, maxAllowedDiscountPct: 20 }
      },
      salesRep: { id: 2, name: 'Jay Rao', email: 'j.rao@dealflow360.com', role: 'SALES_REP' },
      status: 'PENDING_APPROVAL',
      subtotalAmount: 480000,
      totalDiscountAmount: 86400,
      totalAmount: 393600,
      totalCostAmount: 320800,
      blendedDiscountPct: 18.0,
      marginPct: 18.5,
      riskScore: 78.5,
      riskSeverity: 'HIGH',
      requiresManagerApproval: true,
      requiresFinanceApproval: true,
      shippingAmount: 2500,
      taxAmount: 0,
      lines: [
        {
          product: MOCK_PRODUCTS[0],
          quantity: 20,
          unitListPrice: 12500,
          unitDiscountPct: 18,
          unitDiscountAmount: 2250,
          unitFinalPrice: 10250,
          lineTotal: 205000,
          lineCost: 162000,
          lineMarginPct: 21.0
        },
        {
          product: MOCK_PRODUCTS[6],
          quantity: 20,
          unitListPrice: 1800,
          unitDiscountPct: 5,
          unitDiscountAmount: 90,
          unitFinalPrice: 1710,
          lineTotal: 34200,
          lineCost: 11000,
          lineMarginPct: 67.8
        },
        {
          product: MOCK_PRODUCTS[10],
          quantity: 60,
          unitListPrice: 320,
          unitDiscountPct: 0,
          unitDiscountAmount: 0,
          unitFinalPrice: 320,
          lineTotal: 19200,
          lineCost: 9600,
          lineMarginPct: 50.0
        }
      ]
    };
  }
}
