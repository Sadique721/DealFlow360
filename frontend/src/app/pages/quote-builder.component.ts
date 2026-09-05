import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { QuotationService } from '../services/quotation.service';
import { CatalogService } from '../services/catalog.service';
import { AuthService } from '../services/auth.service';
import {
  Quotation,
  QuotationLine,
  Product,
  Customer,
  PriceList,
  LineItemRequest,
  UpsellSuggestion
} from '../models/dealflow.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-quote-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="builder-container">
      <!-- Top Cyber Alert / Toast Message -->
      <div *ngIf="alertMessage" class="glass-panel alert-toast" [class.alert-success]="alertType === 'success'" [class.alert-danger]="alertType === 'error'" [class.alert-info]="alertType === 'info'">
        <span class="alert-icon">{{ alertType === 'success' ? '✓' : alertType === 'error' ? '⚠️' : 'ℹ️' }}</span>
        <span>{{ alertMessage }}</span>
        <button class="alert-close" (click)="alertMessage = null">✕</button>
      </div>

      <!-- Loading / Error State -->
      <div *ngIf="isLoading" class="glass-panel loading-box">
        <div class="spinner"></div>
        <p>Connecting to DealFlow360 Quotation Engine...</p>
      </div>

      <div *ngIf="errorMessage && !isLoading" class="glass-panel error-box">
        <div class="error-icon">⚠️</div>
        <h3>Quotation Error</h3>
        <p>{{ errorMessage }}</p>
        <a routerLink="/dashboard/pipeline" class="btn btn-primary btn-sm mt-3">Back to Pipeline</a>
      </div>

      <ng-container *ngIf="!isLoading && !errorMessage">
        <!-- Breadcrumb & Top Bar -->
        <div class="top-nav glass-panel">
          <div class="nav-left">
            <a routerLink="/dashboard/pipeline" class="back-link">
              <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"></path></svg>
              Pipeline
            </a>
            <span class="divider">/</span>
            <span class="quote-id mono">{{ isCreateMode ? 'New Quotation' : (quote?.quoteNumber || 'Quotation') }}</span>
            <span
              *ngIf="!isCreateMode && quote"
              class="badge"
              [class.badge-warning]="quote.status === 'PENDING_APPROVAL'"
              [class.badge-success]="quote.status === 'APPROVED' || quote.status === 'CONFIRMED' || quote.status === 'ACCEPTED'"
              [class.badge-neutral]="quote.status === 'DRAFT'"
              [class.badge-info]="quote.status === 'SENT_TO_CUSTOMER' || quote.status === 'UNDER_NEGOTIATION'"
            >
              {{ (quote.status || 'DRAFT').replace('_', ' ') }}
            </span>
          </div>

          <div class="nav-actions">
            <!-- Preset Scenarios for Hackathon Live Demo -->
            <div class="scenario-buttons" *ngIf="isEditable">
              <span class="scenario-label desktop-only">Quick Demo Presets:</span>
              <button class="btn btn-outline btn-sm" (click)="applyPreset('safe')" title="Standard safe discount with >35% margin">
                🟢 Safe Deal (>35%)
              </button>
              <button class="btn btn-outline btn-sm" (click)="applyPreset('aggressive')" title="Discount spike triggering Manager review">
                🟡 Manager Review
              </button>
              <button class="btn btn-outline btn-sm" (click)="applyPreset('critical')" title="Severe discount erosion triggering CFO desk">
                🔴 CFO Emergency
              </button>
            </div>

            <a *ngIf="quote?.id" [routerLink]="['/dashboard/fulfillment', quote?.id]" class="btn btn-outline btn-sm">
              Warehouse Splits
            </a>

            <!-- Save Draft Button -->
            <button
              *ngIf="isEditable && currentRole !== 'CUSTOMER'"
              class="btn btn-outline btn-sm"
              (click)="saveDraft()"
              [disabled]="isSaving || (!isCreateMode && lines.length === 0)"
            >
              {{ isSaving ? 'Saving...' : 'Save Draft 💾' }}
            </button>

            <!-- Submit for Approval Button -->
            <button
              *ngIf="!isCreateMode && quote && (quote.status === 'DRAFT' || quote.status === 'UNDER_NEGOTIATION' || quote.status === 'RETURNED') && currentRole !== 'CUSTOMER'"
              class="btn btn-primary btn-sm"
              (click)="submitForApproval()"
              [disabled]="isSubmitting || lines.length === 0"
            >
              {{ isSubmitting ? 'Submitting...' : 'Submit for Approval 🚀' }}
            </button>

            <!-- Convert to Sales Order Button -->
            <button
              *ngIf="!isCreateMode && quote && quote.status === 'APPROVED' && currentRole !== 'CUSTOMER'"
              class="btn btn-success btn-sm"
              (click)="confirmOrder()"
              [disabled]="isConfirming"
            >
              {{ isConfirming ? 'Processing...' : 'Convert to Sales Order ✓' }}
            </button>
          </div>
        </div>

        <!-- Main Dual-Pane Workspace Grid -->
        <div class="builder-grid">
          <!-- Left: Line Items (Hybrid Capex & Opex Split) -->
          <div class="main-column">
            <!-- Header Configuration / Customer Info Panel -->
            <div class="glass-panel customer-panel">
              <!-- Create Mode Form Fields -->
              <div *ngIf="isCreateMode" class="create-meta-grid">
                <div class="form-group">
                  <label class="form-label">Enterprise Customer *</label>
                  <select class="form-control" [(ngModel)]="selectedCustomerId" (change)="onCustomerSelected()">
                    <option [ngValue]="null">-- Select Customer Account --</option>
                    <option *ngFor="let c of availableCustomers" [ngValue]="c.id">
                      {{ c.name }} ({{ getCustomerTierString(c) }})
                    </option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">Price List Rule *</label>
                  <select class="form-control" [(ngModel)]="selectedPriceListId">
                    <option *ngFor="let pl of availablePriceLists" [ngValue]="pl.id">
                      {{ pl.customerTier }} Tier ({{ pl.currency }} - {{ pl.discountAdjustmentPercent }}% base adj)
                    </option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">Target Delivery Date</label>
                  <input type="date" class="form-control" [(ngModel)]="targetDeliveryDate" />
                </div>
              </div>

              <!-- Detail / Edit Mode View -->
              <div *ngIf="!isCreateMode && quote" class="panel-row">
                <div class="client-meta">
                  <span class="client-label">Enterprise Customer:</span>
                  <h3>{{ quote.customer?.name || 'Customer' }}</h3>
                  <span class="badge badge-purple">{{ getCustomerTierName(quote) }}</span>
                  <span class="destination-tag">📍 {{ quote.customer?.address || 'North America Region' }}</span>
                </div>

                <div class="deal-meta">
                  <div>Sales Rep: <strong>{{ quote.salesRep?.name || currentUserName }}</strong></div>
                  <div>Created: <span class="mono">{{ (quote.lastActivityAt || now) | date:'mediumDate' }}</span></div>
                  <div>Target Delivery: <span class="mono">{{ quote.promisedDeliveryDate || '2026-09-30' }}</span></div>
                </div>
              </div>
            </div>

            <!-- Add Product to Cart Selector -->
            <div class="glass-panel product-picker-panel" *ngIf="isEditable">
              <div class="picker-row">
                <div class="picker-dropdown">
                  <label class="form-label">Add Product to Quotation</label>
                  <select class="form-control" [(ngModel)]="selectedProductId">
                    <option [ngValue]="null">-- Select Hardware, Cloud Subscription, or Engineering Service --</option>
                    <option *ngFor="let p of availableProducts" [ngValue]="p.id">
                      [{{ p.type || (p.isSubscription ? 'SUBSCRIPTION' : 'PRODUCT') }}] {{ p.name }} ({{ formatCurrency(p.basePrice) }}) — Max Disc: {{ p.category?.maxDiscountCeilingPct || p.category?.maxDiscountPercent || 15 }}%
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
                      <th *ngIf="isEditable"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let line of capexLines; let i = index">
                      <td>
                        <div class="prod-info">
                          <strong>{{ line.product?.name }}</strong>
                          <span class="mono sku">{{ line.product?.sku || ('PRD-' + line.product?.id) }} | {{ line.product?.unitOfMeasure || 'Unit' }}</span>
                        </div>
                      </td>
                      <td>
                        <span class="badge badge-neutral">
                          Max {{ line.product?.category?.maxDiscountCeilingPct || line.product?.category?.maxDiscountPercent || 15 }}%
                        </span>
                      </td>
                      <td>
                        <input
                          *ngIf="isEditable"
                          type="number"
                          min="1"
                          class="form-control text-center"
                          [(ngModel)]="line.quantity"
                          (change)="recomputeLine(line)"
                        />
                        <span *ngIf="!isEditable" class="mono font-semibold">{{ line.quantity }}</span>
                      </td>
                      <td class="mono">{{ formatCurrency(getLineListPrice(line)) }}</td>
                      <td>
                        <div class="discount-input-wrapper" *ngIf="isEditable">
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
                        <span *ngIf="!isEditable" class="mono">{{ line.unitDiscountPct || 0 }}%</span>
                      </td>
                      <td class="mono font-semibold">{{ formatCurrency(line.unitFinalPrice || getLineListPrice(line)) }}</td>
                      <td>
                        <span class="badge" [style.background]="getMarginBadgeBg(line.lineMarginPct || 0)" [style.color]="getMarginColor(line.lineMarginPct || 0)">
                          {{ (line.lineMarginPct || 0) | number:'1.1-1' }}%
                        </span>
                      </td>
                      <td class="mono font-bold">{{ formatCurrency(line.lineTotal) }}</td>
                      <td *ngIf="isEditable">
                        <button class="btn-icon-delete" (click)="removeLine(line)" title="Remove item">✕</button>
                      </td>
                    </tr>
                    <tr *ngIf="capexLines.length === 0">
                      <td [attr.colspan]="isEditable ? 9 : 8" class="text-center empty-notice">
                        No one-time hardware lines added. Pick an item above to add.
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
                <span class="mono total-pill">Recurring Total: {{ formatCurrency(opexSubtotal) }}</span>
              </div>

              <div class="table-container">
                <table class="table-custom">
                  <thead>
                    <tr>
                      <th>Subscription Plan</th>
                      <th>Cadence</th>
                      <th style="width: 90px;">Seats / Qty</th>
                      <th>Rate / Period</th>
                      <th style="width: 130px;">Discount %</th>
                      <th>Net Rate</th>
                      <th>Subscription Margin</th>
                      <th>Annualized Total</th>
                      <th *ngIf="isEditable"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let line of opexLines; let i = index">
                      <td>
                        <div class="prod-info">
                          <strong>{{ line.product?.name }}</strong>
                          <span class="mono sku">{{ line.product?.sku || ('SUB-' + line.product?.id) }} | Auto-Prorated</span>
                        </div>
                      </td>
                      <td>
                        <span class="badge badge-purple">{{ line.product?.recurringInterval || line.product?.billingFrequency || 'MONTHLY' }}</span>
                      </td>
                      <td>
                        <input
                          *ngIf="isEditable"
                          type="number"
                          min="1"
                          class="form-control text-center"
                          [(ngModel)]="line.quantity"
                          (change)="recomputeLine(line)"
                        />
                        <span *ngIf="!isEditable" class="mono font-semibold">{{ line.quantity }}</span>
                      </td>
                      <td class="mono">{{ formatCurrency(getLineListPrice(line)) }}</td>
                      <td>
                        <div class="discount-input-wrapper" *ngIf="isEditable">
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
                        <span *ngIf="!isEditable" class="mono">{{ line.unitDiscountPct || 0 }}%</span>
                      </td>
                      <td class="mono font-semibold">{{ formatCurrency(line.unitFinalPrice || getLineListPrice(line)) }}</td>
                      <td>
                        <span class="badge badge-success">
                          {{ (line.lineMarginPct || 0) | number:'1.1-1' }}%
                        </span>
                      </td>
                      <td class="mono font-bold">{{ formatCurrency(line.lineTotal) }}</td>
                      <td *ngIf="isEditable">
                        <button class="btn-icon-delete" (click)="removeLine(line)" title="Remove subscription">✕</button>
                      </td>
                    </tr>
                    <tr *ngIf="opexLines.length === 0">
                      <td [attr.colspan]="isEditable ? 9 : 8" class="text-center empty-notice">
                        No recurring subscriptions attached. Pick a cloud plan above to enable hybrid billing.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- UPSELL & CROSS-SELL INTELLIGENCE PANEL -->
            <div class="glass-panel upsell-panel" *ngIf="upsells.length > 0 && isEditable">
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
                  <h5>{{ u.recommendedProduct?.name || u.suggestedProduct?.name || 'Recommended Add-on' }}</h5>
                  <p class="upsell-desc">{{ u.explanation || u.benefitDescription }}</p>
                  <div class="upsell-actions">
                    <span class="mono upsell-val">+{{ formatCurrency(u.revenueImpact || 1200) }} Value</span>
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
                <span class="badge" [class.badge-success]="currentMargin >= 30" [class.badge-warning]="currentMargin >= 18 && currentMargin < 30" [class.badge-danger]="currentMargin < 18">
                  {{ currentMargin >= 30 ? 'Target Healthy' : currentMargin >= 18 ? 'Margin At Risk' : 'Severe Margin Erosion' }}
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
                    [attr.stroke]="getMarginColor(currentMargin)"
                    stroke-width="14"
                    stroke-linecap="round"
                    stroke-dasharray="251.2"
                    [attr.stroke-dashoffset]="calculateDashOffset(currentMargin)"
                    style="transition: stroke-dashoffset 0.6s ease, stroke 0.4s ease;"
                  />
                </svg>

                <div class="gauge-center">
                  <span class="gauge-val" [style.color]="getMarginColor(currentMargin)">
                    {{ currentMargin | number:'1.1-1' }}%
                  </span>
                  <span class="gauge-lbl">Net Blended Gross Margin</span>
                </div>
              </div>

              <div class="gauge-thresholds">
                <span class="text-danger">0% Critical</span>
                <span class="text-warning">18% Minimum</span>
                <span class="text-emerald">30%+ Target</span>
              </div>
            </div>

            <!-- BLENDED RISK SCORE BREAKDOWN CARD -->
            <div class="glass-panel risk-card">
              <div class="card-head">
                <h4>Blended Discount Risk Engine</h4>
                <span
                  class="badge"
                  [class.badge-success]="currentRiskSeverity === 'LOW'"
                  [class.badge-warning]="currentRiskSeverity === 'MEDIUM'"
                  [class.badge-danger]="currentRiskSeverity === 'HIGH' || currentRiskSeverity === 'CRITICAL'"
                >
                  {{ currentRiskSeverity }} RISK
                </span>
              </div>

              <div class="risk-bar-container">
                <div class="risk-bar-bg">
                  <div
                    class="risk-bar-fill"
                    [style.width.%]="Math.min(100, currentRiskScore)"
                    [style.background]="getRiskColor(currentRiskSeverity)"
                  ></div>
                </div>
                <div class="risk-bar-meta">
                  <span>Calculated Risk Score: <strong>{{ currentRiskScore | number:'1.1-1' }}/100</strong></span>
                  <span>Threshold: 25.0</span>
                </div>
              </div>

              <!-- Approval Hierarchy Matrix Notice -->
              <div class="approval-notice" *ngIf="requiresManagerApproval || requiresFinanceApproval">
                <div class="notice-icon">🛡️</div>
                <div>
                  <strong>Governance Policy Triggered:</strong>
                  <p>
                    {{ requiresFinanceApproval ? 'Single line discount exceeds 15% ceiling or margin < 20%. Requires Sales Manager + CFO sign-off.' : 'Blended discount exceeds 10%. Requires Sales Manager approval.' }}
                  </p>
                </div>
              </div>

              <div class="approval-notice success-notice" *ngIf="!requiresManagerApproval && !requiresFinanceApproval">
                <div class="notice-icon">✓</div>
                <div>
                  <strong>Auto-Approved (Level 0):</strong>
                  <p>All line discounts within category ceilings and margin exceeds target. Ready to convert.</p>
                </div>
              </div>
            </div>

            <!-- QUOTATION FINANCIAL SUMMARY CARD -->
            <div class="glass-panel summary-card">
              <h4>Quotation Financial Summary</h4>
              <div class="summary-lines">
                <div class="summary-line">
                  <span>Gross List Subtotal:</span>
                  <span class="mono">{{ formatCurrency(currentSubtotal) }}</span>
                </div>
                <div class="summary-line text-warning">
                  <span>Total Discount ({{ currentDiscountPct | number:'1.1-1' }}%):</span>
                  <span class="mono">-{{ formatCurrency(currentDiscountAmount) }}</span>
                </div>
                <div class="summary-line">
                  <span>Estimated Tax:</span>
                  <span class="mono">+{{ formatCurrency(currentTaxAmount) }}</span>
                </div>
                <div class="summary-line total-line">
                  <span>Net Total Commitment:</span>
                  <span class="mono total-amount">{{ formatCurrency(currentTotalAmount) }}</span>
                </div>
                <div class="summary-line text-muted font-xs">
                  <span>Total Cost Basis:</span>
                  <span class="mono">{{ formatCurrency(currentTotalCost) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .builder-container {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    /* Alert Toast */
    .alert-toast {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 18px;
      border-radius: var(--radius-sm);
      font-size: 14px;
      font-weight: 600;
    }
    .alert-success {
      background: rgba(0, 223, 162, 0.15);
      border: 1px solid #00dfa2;
      color: #00dfa2;
    }
    .alert-danger {
      background: rgba(255, 0, 122, 0.15);
      border: 1px solid #ff007a;
      color: #ff007a;
    }
    .alert-info {
      background: rgba(0, 242, 254, 0.15);
      border: 1px solid #00f2fe;
      color: #00f2fe;
    }
    .alert-close {
      margin-left: auto;
      background: transparent;
      border: none;
      color: inherit;
      cursor: pointer;
      font-size: 16px;
    }

    /* Loading and Error States */
    .loading-box, .error-box {
      padding: 40px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(0, 242, 254, 0.2);
      border-top-color: #00f2fe;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .error-icon { font-size: 36px; }

    /* Top Navigation */
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
    .create-meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 14px;
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
      margin: 0;
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
    .gauge-header h3 { font-size: 14px; margin: 0; }
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
    .card-head h4 { font-size: 13px; margin: 0; }
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
    .font-xs { font-size: 11px; }
  `]
})
export class QuoteBuilderComponent implements OnInit, OnDestroy {
  isCreateMode = false;
  quoteId: number | null = null;
  quote?: Quotation;
  lines: QuotationLine[] = [];

  availableCustomers: Customer[] = [];
  availablePriceLists: PriceList[] = [];
  availableProducts: Product[] = [];

  selectedCustomerId: number | null = null;
  selectedPriceListId: number | null = null;
  selectedProductId: number | null = null;
  targetDeliveryDate: string = '';

  upsells: UpsellSuggestion[] = [];

  isLoading = true;
  isSaving = false;
  isSubmitting = false;
  isConfirming = false;
  errorMessage: string | null = null;
  alertMessage: string | null = null;
  alertType: 'success' | 'error' | 'info' = 'info';

  currentRole = 'ADMIN';
  currentUserName = 'Administrator';
  now = new Date().toISOString();
  Math = Math;

  private subs = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private quoteService: QuotationService,
    private catalogService: CatalogService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Set default target delivery date to today + 14 days
    const d = new Date();
    d.setDate(d.getDate() + 14);
    this.targetDeliveryDate = d.toISOString().split('T')[0];

    this.subs.add(
      this.authService.currentRole$.subscribe(r => this.currentRole = r)
    );
    this.subs.add(
      this.authService.currentUser$.subscribe(u => this.currentUserName = u.name)
    );

    this.loadCatalogMasterData();

    this.subs.add(
      this.route.paramMap.subscribe(params => {
        const idParam = params.get('id');
        if (!idParam || idParam === 'new') {
          this.isCreateMode = true;
          this.quoteId = null;
          this.quote = undefined;
          this.lines = [];
          this.isLoading = false;
        } else {
          this.isCreateMode = false;
          const parsed = parseInt(idParam, 10);
          if (isNaN(parsed)) {
            this.errorMessage = `Invalid quotation ID: ${idParam}`;
            this.isLoading = false;
          } else {
            this.quoteId = parsed;
            this.loadQuote(parsed);
          }
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  loadCatalogMasterData(): void {
    this.catalogService.getCustomers().subscribe({
      next: (custs) => {
        this.availableCustomers = custs || [];
        if (this.isCreateMode && this.availableCustomers.length > 0 && !this.selectedCustomerId) {
          this.selectedCustomerId = this.availableCustomers[0].id;
          this.onCustomerSelected();
        }
      },
      error: (err) => console.error('Error fetching customers', err)
    });

    this.catalogService.getPriceLists().subscribe({
      next: (pls) => {
        this.availablePriceLists = pls || [];
        if (this.availablePriceLists.length > 0 && !this.selectedPriceListId) {
          this.selectedPriceListId = this.availablePriceLists[0].id;
        }
      },
      error: (err) => console.error('Error fetching price lists', err)
    });

    this.catalogService.getProducts().subscribe({
      next: (prods) => {
        this.availableProducts = prods || [];
      },
      error: (err) => console.error('Error fetching products', err)
    });
  }

  loadQuote(id: number): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.quoteService.getQuotationById(id).subscribe({
      next: (q) => {
        this.isLoading = false;
        if (!q) {
          this.errorMessage = `Quotation #${id} was not found.`;
          return;
        }
        this.quote = q;
        this.lines = (q.lines || []).map(l => ({
          ...l,
          unitListPrice: l.unitListPrice || l.product?.basePrice || 0,
          unitDiscountPct: l.unitDiscountPct ?? l.discountPercent ?? 0,
          unitFinalPrice: l.unitFinalPrice || (l.unitListPrice ? l.unitListPrice * (1 - ((l.unitDiscountPct || 0)/100)) : 0),
          lineTotal: l.lineTotal || 0,
          lineCost: l.lineCost || (l.product?.costPrice ? l.product.costPrice * l.quantity : 0),
          lineMarginPct: l.lineMarginPct ?? (l.lineTotal && l.lineCost ? ((l.lineTotal - l.lineCost) / l.lineTotal * 100) : 0)
        }));
        this.loadUpsells(id);
      },
      error: (err) => {
        this.isLoading = false;
        if (err.status === 403) {
          this.errorMessage = 'Access Denied: You do not have permission to view this quotation.';
        } else if (err.status === 404) {
          this.errorMessage = `Quotation #${id} not found in system database.`;
        } else {
          this.errorMessage = `Failed to load quotation #${id} from backend: ${err.message || 'Server error'}`;
        }
      }
    });
  }

  loadUpsells(quoteId: number): void {
    this.quoteService.getUpsellSuggestions(quoteId).subscribe({
      next: (res) => this.upsells = res || [],
      error: () => this.upsells = []
    });
  }

  onCustomerSelected(): void {
    if (!this.selectedCustomerId) return;
    const cust = this.availableCustomers.find(c => c.id === this.selectedCustomerId);
    if (!cust) return;

    // Match Price List to Customer Tier if available
    const tierName = this.getCustomerTierString(cust);
    const matchedPl = this.availablePriceLists.find(pl => pl.customerTier === tierName);
    if (matchedPl) {
      this.selectedPriceListId = matchedPl.id;
    }
  }

  get isEditable(): boolean {
    if (this.isCreateMode) return true;
    if (!this.quote) return false;
    const editableStatuses = ['DRAFT', 'UNDER_NEGOTIATION', 'RETURNED'];
    return editableStatuses.includes(this.quote.status) && this.currentRole !== 'CUSTOMER';
  }

  get capexLines(): QuotationLine[] {
    return this.lines.filter(l => {
      const isSub = l.product?.isSubscription || l.product?.type === 'SUBSCRIPTION' || l.product?.type === 'SOFTWARE_SUBSCRIPTION';
      return !isSub;
    });
  }

  get opexLines(): QuotationLine[] {
    return this.lines.filter(l => {
      const isSub = l.product?.isSubscription || l.product?.type === 'SUBSCRIPTION' || l.product?.type === 'SOFTWARE_SUBSCRIPTION';
      return isSub;
    });
  }

  get capexSubtotal(): number {
    return this.capexLines.reduce((sum, l) => sum + (l.lineTotal || 0), 0);
  }

  get opexSubtotal(): number {
    return this.opexLines.reduce((sum, l) => sum + (l.lineTotal || 0), 0);
  }

  get currentSubtotal(): number {
    if (this.lines.length === 0) return 0;
    return this.lines.reduce((sum, l) => sum + (this.getLineListPrice(l) * l.quantity), 0);
  }

  get currentDiscountAmount(): number {
    if (this.lines.length === 0) return 0;
    return this.lines.reduce((sum, l) => {
      const list = this.getLineListPrice(l);
      const disc = Math.min(100, Math.max(0, l.unitDiscountPct || 0));
      return sum + (list * (disc / 100) * l.quantity);
    }, 0);
  }

  get currentDiscountPct(): number {
    const sub = this.currentSubtotal;
    return sub > 0 ? (this.currentDiscountAmount / sub) * 100 : 0;
  }

  get currentTaxAmount(): number {
    if (this.lines.length === 0) return 0;
    return this.lines.reduce((sum, l) => {
      const taxRate = (l.product?.taxPercentage || 0) / 100;
      return sum + (l.lineTotal * taxRate);
    }, 0);
  }

  get currentTotalAmount(): number {
    const afterDiscount = this.currentSubtotal - this.currentDiscountAmount;
    return afterDiscount + this.currentTaxAmount;
  }

  get currentTotalCost(): number {
    return this.lines.reduce((sum, l) => {
      const cost = l.product?.costPrice ?? l.product?.unitCost ?? 0;
      return sum + (cost * l.quantity);
    }, 0);
  }

  get currentMargin(): number {
    const revenue = this.currentSubtotal - this.currentDiscountAmount;
    const cost = this.currentTotalCost;
    if (revenue <= 0) return 0;
    return Math.max(0, ((revenue - cost) / revenue) * 100);
  }

  get currentRiskScore(): number {
    if (this.quote?.blendedRiskScore != null) return this.quote.blendedRiskScore;
    if (this.quote?.riskScore != null) return this.quote.riskScore;

    const disc = this.currentDiscountPct;
    const margin = this.currentMargin;
    const hasSpike = this.lines.some(l => this.isOverage(l));

    if (margin < 18 || disc > 20) return 85.0;
    if (hasSpike || disc > 12) return 58.0;
    return Number((disc * 1.5).toFixed(1));
  }

  get currentRiskSeverity(): string {
    const score = this.currentRiskScore;
    if (score >= 60) return 'CRITICAL';
    if (score >= 35) return 'HIGH';
    if (score >= 15) return 'MEDIUM';
    return 'LOW';
  }

  get requiresManagerApproval(): boolean {
    return this.currentRiskScore >= 25 || this.currentDiscountPct > 10 || this.lines.some(l => this.isOverage(l));
  }

  get requiresFinanceApproval(): boolean {
    return this.currentRiskScore >= 60 || this.currentMargin < 20 || this.currentDiscountPct > 18;
  }

  getLineListPrice(line: QuotationLine): number {
    return line.unitListPrice || line.product?.basePrice || 0;
  }

  addLineItem(): void {
    if (!this.selectedProductId) return;
    const prod = this.availableProducts.find(p => p.id === this.selectedProductId);
    if (!prod) return;

    const listPrice = prod.basePrice || 0;
    const costPrice = prod.costPrice ?? prod.unitCost ?? 0;
    const initialMargin = listPrice > 0 ? ((listPrice - costPrice) / listPrice) * 100 : 0;

    const newLine: QuotationLine = {
      product: prod,
      quantity: 1,
      unitListPrice: listPrice,
      unitDiscountPct: 0,
      unitDiscountAmount: 0,
      unitFinalPrice: listPrice,
      lineTotal: listPrice,
      lineCost: costPrice,
      lineMarginPct: Number(initialMargin.toFixed(1))
    };

    this.lines.push(newLine);
    this.selectedProductId = null;
    this.recalculateTotals();
  }

  removeLine(line: QuotationLine): void {
    const idx = this.lines.indexOf(line);
    if (idx >= 0) {
      this.lines.splice(idx, 1);
      this.recalculateTotals();
    }
  }

  recomputeLine(line: QuotationLine): void {
    const list = this.getLineListPrice(line);
    const discPct = Math.min(100, Math.max(0, line.unitDiscountPct || 0));
    line.unitDiscountPct = discPct;
    line.unitDiscountAmount = list * (discPct / 100);
    line.unitFinalPrice = list - line.unitDiscountAmount;
    line.lineTotal = line.unitFinalPrice * line.quantity;
    const cost = line.product?.costPrice ?? line.product?.unitCost ?? 0;
    line.lineCost = cost * line.quantity;
    line.lineMarginPct = line.lineTotal > 0
      ? Number((((line.lineTotal - line.lineCost) / line.lineTotal) * 100).toFixed(1))
      : 0;

    this.recalculateTotals();
  }

  recalculateTotals(): void {
    if (this.quote) {
      this.quote.subtotalAmount = this.currentSubtotal;
      this.quote.totalDiscountAmount = this.currentDiscountAmount;
      this.quote.blendedDiscountPct = this.currentDiscountPct;
      this.quote.totalAmount = this.currentTotalAmount;
      this.quote.totalCost = this.currentTotalCost;
      this.quote.marginPercentage = this.currentMargin;
      this.quote.blendedRiskScore = this.currentRiskScore;
      this.quote.riskSeverity = this.currentRiskSeverity;
    }
  }

  saveDraft(): void {
    if (this.isCreateMode) {
      if (!this.selectedCustomerId) {
        this.showAlert('Please select an enterprise customer to create quotation.', 'error');
        return;
      }
      if (this.lines.length === 0) {
        this.showAlert('Please add at least one line item to save draft quotation.', 'error');
        return;
      }

      this.isSaving = true;
      const payload = {
        customerId: this.selectedCustomerId,
        promisedDeliveryDate: this.targetDeliveryDate,
        lines: this.lines.map(l => ({
          productId: l.product.id,
          quantity: l.quantity,
          discountPercent: l.unitDiscountPct || 0
        }))
      };

      this.quoteService.createQuotation(payload).subscribe({
        next: (created) => {
          this.isSaving = false;
          this.showAlert(`Quotation ${created.quoteNumber} created successfully in database!`, 'success');
          // Navigate to the saved quotation detail/edit route
          this.router.navigate(['/dashboard/quote', created.id]);
        },
        error: (err) => {
          this.isSaving = false;
          this.showAlert(`Failed to create quotation: ${err.error?.message || err.message || 'Server error'}`, 'error');
        }
      });
    } else {
      if (!this.quote) return;
      if (this.lines.length === 0) {
        this.showAlert('Quotation must contain at least one line item.', 'error');
        return;
      }

      this.isSaving = true;
      const lineRequests: LineItemRequest[] = this.lines.map(l => ({
        id: l.id,
        productId: l.product.id,
        quantity: l.quantity,
        discountPercent: l.unitDiscountPct || 0
      }));

      this.quoteService.updateQuotationLines(this.quote.id, lineRequests).subscribe({
        next: (updated) => {
          this.isSaving = false;
          this.quote = updated;
          this.lines = (updated.lines || []).map(l => ({
            ...l,
            unitListPrice: l.unitListPrice || l.product?.basePrice || 0,
            unitDiscountPct: l.unitDiscountPct ?? l.discountPercent ?? 0,
            unitFinalPrice: l.unitFinalPrice || (l.unitListPrice ? l.unitListPrice * (1 - ((l.unitDiscountPct || 0)/100)) : 0),
            lineTotal: l.lineTotal || 0,
            lineCost: l.lineCost || (l.product?.costPrice ? l.product.costPrice * l.quantity : 0),
            lineMarginPct: l.lineMarginPct ?? 0
          }));
          this.showAlert(`Quotation ${updated.quoteNumber} updated with authoritative backend recalculation!`, 'success');
        },
        error: (err) => {
          this.isSaving = false;
          this.showAlert(`Failed to save changes: ${err.error?.message || err.message || 'Server error'}`, 'error');
        }
      });
    }
  }

  submitForApproval(): void {
    if (!this.quote) return;
    this.isSubmitting = true;

    // Save line changes first if any, then submit
    const lineRequests: LineItemRequest[] = this.lines.map(l => ({
      id: l.id,
      productId: l.product.id,
      quantity: l.quantity,
      discountPercent: l.unitDiscountPct || 0
    }));

    this.quoteService.updateQuotationLines(this.quote.id, lineRequests).subscribe({
      next: () => {
        this.quoteService.submitForApproval(this.quote!.id).subscribe({
          next: (res) => {
            this.isSubmitting = false;
            const newStatus = res?.status || 'PENDING_APPROVAL';
            this.showAlert(res?.message || `Quotation successfully submitted! Status is now ${newStatus}.`, 'success');
            if (this.quoteId) {
              this.loadQuote(this.quoteId);
            }
          },
          error: (err) => {
            this.isSubmitting = false;
            this.showAlert(`Failed to submit for approval: ${err.error?.message || err.message || 'Server error'}`, 'error');
          }
        });
      },
      error: (err) => {
        this.isSubmitting = false;
        this.showAlert(`Failed to save lines before submission: ${err.message}`, 'error');
      }
    });
  }

  confirmOrder(): void {
    if (!this.quote) return;
    this.isConfirming = true;

    this.quoteService.confirmQuotation(this.quote.id).subscribe({
      next: (confirmed) => {
        this.isConfirming = false;
        this.quote = confirmed;
        this.showAlert(`Quotation ${confirmed.quoteNumber} confirmed and converted to active Sales Order!`, 'success');
      },
      error: (err) => {
        this.isConfirming = false;
        this.showAlert(`Failed to convert to Sales Order: ${err.error?.message || err.message || 'Server error'}`, 'error');
      }
    });
  }

  applyPreset(type: 'safe' | 'aggressive' | 'critical'): void {
    if (this.lines.length === 0) {
      if (this.availableProducts.length > 0) {
        // Add 2 products if lines empty
        this.selectedProductId = this.availableProducts[0].id;
        this.addLineItem();
        if (this.availableProducts.length > 1) {
          this.selectedProductId = this.availableProducts[1].id;
          this.addLineItem();
        }
      }
    }

    if (type === 'safe') {
      this.lines.forEach((l, idx) => {
        l.unitDiscountPct = idx === 0 ? 5 : 0;
        this.recomputeLine(l);
      });
      this.showAlert('Applied Safe Deal Preset (>35% Gross Margin).', 'info');
    } else if (type === 'aggressive') {
      this.lines.forEach((l, idx) => {
        l.unitDiscountPct = idx === 0 ? 18 : 8;
        this.recomputeLine(l);
      });
      this.showAlert('Applied Manager Escalation Preset (Single line exceeds 15% discount cap).', 'info');
    } else {
      this.lines.forEach((l, idx) => {
        l.unitDiscountPct = idx === 0 ? 28 : 22;
        this.recomputeLine(l);
      });
      this.showAlert('Applied CFO Emergency Desk Preset (Severe discount erosion).', 'error');
    }
  }

  acceptUpsell(u: UpsellSuggestion): void {
    const prod = u.recommendedProduct || u.suggestedProduct;
    if (!prod) return;

    const listPrice = prod.basePrice || 0;
    const costPrice = prod.costPrice ?? prod.unitCost ?? 0;
    const disc = u.discountOverridePct || 5;
    const net = listPrice * (1 - (disc / 100));

    this.lines.push({
      product: prod,
      quantity: 1,
      unitListPrice: listPrice,
      unitDiscountPct: disc,
      unitDiscountAmount: listPrice * (disc / 100),
      unitFinalPrice: net,
      lineTotal: net,
      lineCost: costPrice,
      lineMarginPct: net > 0 ? Number((((net - costPrice) / net) * 100).toFixed(1)) : 50.0
    });

    const idx = this.upsells.indexOf(u);
    if (idx >= 0) this.upsells.splice(idx, 1);
    this.recalculateTotals();
    this.showAlert(`Added ${prod.name} with ${disc}% promotional bundle discount!`, 'success');
  }

  isOverage(line: QuotationLine): boolean {
    const ceiling = line.product?.category?.maxDiscountCeilingPct || line.product?.category?.maxDiscountPercent || 15;
    return (line.unitDiscountPct || 0) > ceiling;
  }

  getCustomerTierString(cust: Customer): string {
    if (!cust) return 'BRONZE';
    if (typeof cust.tier === 'string') return cust.tier;
    if (cust.tier && typeof cust.tier === 'object') return (cust.tier as any).tierName || 'BRONZE';
    return 'BRONZE';
  }

  getCustomerTierName(q: Quotation): string {
    if (q.customer) {
      return this.getCustomerTierString(q.customer);
    }
    return 'Standard';
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
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val || 0);
  }

  showAlert(msg: string, type: 'success' | 'error' | 'info' = 'info'): void {
    this.alertMessage = msg;
    this.alertType = type;
    setTimeout(() => {
      if (this.alertMessage === msg) {
        this.alertMessage = null;
      }
    }, 6000);
  }
}
