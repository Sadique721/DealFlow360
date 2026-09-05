import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { QuotationService } from '../services/quotation.service';
import { CatalogService } from '../services/catalog.service';
import { Quotation, QuotationLine, Product, Customer, RiskCalculationResult, UpsellSuggestion } from '../models/dealflow.model';

@Component({
  selector: 'app-quote-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="builder-container" *ngIf="quote">
      <!-- Breadcrumb & Top Bar -->
      <div class="top-nav">
        <div class="nav-left">
          <a routerLink="/pipeline" class="back-link">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"></path></svg>
            Pipeline
          </a>
          <span class="divider">/</span>
          <span class="quote-id mono">{{ quote.quoteNumber }}</span>
          <span class="badge" [class.badge-warning]="quote.status === 'PENDING_APPROVAL'" [class.badge-success]="quote.status === 'APPROVED' || quote.status === 'CONFIRMED'">
            {{ quote.status.replace('_', ' ') }}
          </span>
        </div>

        <div class="nav-actions">
          <button class="btn btn-outline" (click)="recalculateRisk()">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            Recalculate Risk
          </button>
          <a *ngIf="quote.id" [routerLink]="['/fulfillment', quote.id]" class="btn btn-outline">
            Warehouse Splits
          </a>
          <button
            *ngIf="quote.status === 'DRAFT' || quote.status === 'UNDER_NEGOTIATION'"
            class="btn btn-primary"
            (click)="submitForApproval()"
          >
            Submit for Approval
          </button>
          <button
            *ngIf="quote.status === 'APPROVED'"
            class="btn btn-success"
            (click)="confirmOrder()"
          >
            Confirm Order
          </button>
        </div>
      </div>

      <!-- Main Layout Grid -->
      <div class="builder-grid">
        <!-- Left: Line Items & Customer Detail -->
        <div class="main-column">
          <!-- Customer & Header Info -->
          <div class="glass-panel customer-panel">
            <div class="panel-row">
              <div class="info-group">
                <span class="label">Customer</span>
                <span class="val font-bold">{{ quote.customer.name }}</span>
                <span class="sub">{{ quote.customer.email }} | {{ quote.customer.destinationRegion }}</span>
              </div>
              <div class="info-group">
                <span class="label">Customer Tier</span>
                <span class="badge badge-purple">{{ quote.customer.tier.tierName }}</span>
                <span class="sub">Max Discount Floor: {{ quote.customer.tier.maxDiscountFloorPct }}%</span>
              </div>
              <div class="info-group">
                <span class="label">Sales Representative</span>
                <span class="val font-semibold">{{ quote.salesRep.name }}</span>
                <span class="sub">{{ quote.salesRep.team }}</span>
              </div>
            </div>
          </div>

          <!-- Line Items Table -->
          <div class="glass-panel items-panel">
            <div class="panel-header">
              <h3>Order Line Items ({{ quote.lines.length }})</h3>
              <div class="add-item-bar">
                <select class="form-control select-product" [(ngModel)]="selectedProductId">
                  <option [ngValue]="null">-- Select Product to Add --</option>
                  <option *ngFor="let p of availableProducts" [ngValue]="p.id">
                    {{ p.name }} ({{ formatCurrency(p.basePrice) }}) [{{ p.type }}]
                  </option>
                </select>
                <button class="btn btn-primary btn-sm" (click)="addLineItem()" [disabled]="!selectedProductId">
                  + Add Line
                </button>
              </div>
            </div>

            <div class="table-container">
              <table class="table-custom">
                <thead>
                  <tr>
                    <th>Product / SKU</th>
                    <th>Category Ceiling</th>
                    <th style="width: 80px;">Qty</th>
                    <th>List Price</th>
                    <th style="width: 110px;">Discount %</th>
                    <th>Unit Final</th>
                    <th>Line Total</th>
                    <th>Line Margin</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let line of quote.lines; let idx = index">
                    <td>
                      <div class="product-cell">
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
                        class="form-control form-control-sm text-center"
                        [(ngModel)]="line.quantity"
                        (change)="recomputeLine(line)"
                      />
                    </td>
                    <td>{{ formatCurrency(line.unitListPrice) }}</td>
                    <td>
                      <div class="discount-input-wrap">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          class="form-control form-control-sm text-center"
                          [(ngModel)]="line.unitDiscountPct"
                          (change)="recomputeLine(line)"
                        />
                        <span class="pct">%</span>
                      </div>
                    </td>
                    <td class="mono font-semibold">{{ formatCurrency(line.unitFinalPrice) }}</td>
                    <td class="mono font-bold">{{ formatCurrency(line.lineTotal) }}</td>
                    <td>
                      <span
                        class="badge"
                        [class.badge-success]="line.lineMarginPct >= 30"
                        [class.badge-warning]="line.lineMarginPct >= 18 && line.lineMarginPct < 30"
                        [class.badge-danger]="line.lineMarginPct < 18"
                      >
                        {{ line.lineMarginPct | number:'1.1-1' }}%
                      </span>
                    </td>
                    <td>
                      <button class="del-btn" (click)="removeLine(idx)" title="Remove item">
                        &times;
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Upsell & Cross-Sell Suggestions Banner -->
          <div class="glass-panel upsell-panel" *ngIf="upsells.length > 0">
            <div class="upsell-header">
              <span class="sparkle-icon">✦</span>
              <div>
                <h4>Smart Upsell & Margin Optimization Recommendations</h4>
                <p class="sub">AI detected high-margin add-ons suited for this customer's basket</p>
              </div>
            </div>
            <div class="upsell-cards">
              <div class="upsell-card" *ngFor="let up of upsells">
                <div class="up-info">
                  <strong>{{ up.suggestedProduct.name }}</strong>
                  <p>{{ up.benefitDescription }}</p>
                  <span class="badge badge-success">+{{ formatCurrency(up.projectedRevenueIncrease) }} Rev (+{{ up.marginImpactPct }}% Margin)</span>
                </div>
                <button class="btn btn-outline btn-sm" (click)="applyUpsell(up.ruleId)">
                  + Add with {{ up.discountPct }}% Bundle Deal
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Financial Summary, Live Margin Meter & Blended Risk Card -->
        <div class="side-column">
          <!-- Live Margin Gauge & Risk Score -->
          <div class="glass-panel meter-card">
            <h4 class="card-title">Commercial Deal Governance</h4>
            
            <div class="gauge-container">
              <!-- SVG Semi-Circular Margin Meter -->
              <svg viewBox="0 0 200 120" class="gauge-svg">
                <!-- Background Arc -->
                <path
                  d="M 20 100 A 80 80 0 0 1 180 100"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.1)"
                  stroke-width="16"
                  stroke-linecap="round"
                />
                <!-- Active Margin Arc -->
                <path
                  d="M 20 100 A 80 80 0 0 1 180 100"
                  fill="none"
                  [attr.stroke]="getMarginColor(quote.marginPct)"
                  stroke-width="16"
                  stroke-linecap="round"
                  [attr.stroke-dasharray]="251.2"
                  [attr.stroke-dashoffset]="calculateDashOffset(quote.marginPct)"
                  style="transition: stroke-dashoffset 0.8s ease, stroke 0.5s ease;"
                />
              </svg>
              <div class="gauge-center">
                <span class="gauge-val" [style.color]="getMarginColor(quote.marginPct)">
                  {{ quote.marginPct | number:'1.1-1' }}%
                </span>
                <span class="gauge-lbl">Overall Margin</span>
              </div>
            </div>

            <!-- Risk Score Indicator -->
            <div class="risk-score-box" [attr.data-severity]="quote.riskSeverity">
              <div class="risk-score-header">
                <span>Blended Risk Score</span>
                <span class="badge badge-danger">{{ quote.riskSeverity }}</span>
              </div>
              <div class="risk-score-bar-bg">
                <div
                  class="risk-score-bar-fill"
                  [style.width.%]="Math.min(100, quote.riskScore * 10)"
                  [attr.data-severity]="quote.riskSeverity"
                ></div>
              </div>
              <div class="risk-score-meta">
                <span>Score: {{ quote.riskScore | number:'1.1-2' }} / 10.0</span>
                <span>Threshold: &le; 3.0</span>
              </div>
            </div>

            <!-- Approval Requirement Notice -->
            <div class="approval-req-box" *ngIf="quote.requiresManagerApproval || quote.requiresFinanceApproval">
              <span class="alert-icon">⚠️</span>
              <div class="req-text">
                <strong>Multi-Level Approval Required</strong>
                <p *ngIf="quote.requiresManagerApproval">Level 1: Sales Manager Approval</p>
                <p *ngIf="quote.requiresFinanceApproval">Level 2: Commercial Finance Approval</p>
              </div>
            </div>
          </div>

          <!-- Financial Breakdown Summary -->
          <div class="glass-panel summary-card">
            <h4 class="card-title">Commercial Summary</h4>
            <div class="summary-list">
              <div class="summary-item">
                <span>Gross List Amount</span>
                <span class="mono">{{ formatCurrency(quote.subtotalAmount) }}</span>
              </div>
              <div class="summary-item text-danger">
                <span>Total Discount Applied</span>
                <span class="mono">-{{ formatCurrency(quote.totalDiscountAmount) }} ({{ quote.blendedDiscountPct | number:'1.1-2' }}%)</span>
              </div>
              <div class="summary-item">
                <span>Estimated Freight (Optimizer)</span>
                <span class="mono">{{ formatCurrency(quote.shippingAmount) }}</span>
              </div>
              <div class="summary-item">
                <span>Estimated Tax</span>
                <span class="mono">{{ formatCurrency(quote.taxAmount) }}</span>
              </div>
              <div class="divider-line"></div>
              <div class="summary-item total-item">
                <span>Total Quote Price</span>
                <span class="mono total-val">{{ formatCurrency(quote.totalAmount) }}</span>
              </div>
              <div class="summary-item cogs-item">
                <span>Total Cost of Goods (COGS)</span>
                <span class="mono">{{ formatCurrency(quote.totalCostAmount) }}</span>
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
      gap: 16px;
    }
    .top-nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }
    .nav-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .back-link {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--text-sub);
      text-decoration: none;
      font-size: 13px;
    }
    .back-link:hover { color: var(--brand-primary); }
    .divider { color: var(--text-muted); }
    .quote-id { font-size: 18px; font-weight: 700; color: var(--brand-primary); }
    .nav-actions {
      display: flex;
      gap: 10px;
    }
    .builder-grid {
      display: grid;
      grid-template-columns: 1fr 340px;
      gap: 16px;
    }
    @media (max-width: 1024px) {
      .builder-grid { grid-template-columns: 1fr; }
    }
    .main-column {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .customer-panel {
      padding: 16px;
    }
    .panel-row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }
    .info-group {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .label {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .val { font-size: 14px; color: var(--text-main); }
    .sub { font-size: 11px; color: var(--text-muted); }
    .items-panel {
      padding: 16px;
    }
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
      flex-wrap: wrap;
      gap: 10px;
    }
    .add-item-bar {
      display: flex;
      gap: 8px;
    }
    .select-product {
      width: 280px;
    }
    .product-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .sku { font-size: 10px; color: var(--text-muted); }
    .discount-input-wrap {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .pct { font-size: 12px; color: var(--text-muted); }
    .del-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 18px;
      cursor: pointer;
      padding: 2px 6px;
    }
    .del-btn:hover { color: var(--danger); }
    .upsell-panel {
      padding: 16px;
      border-left: 3px solid var(--purple);
    }
    .upsell-header {
      display: flex;
      gap: 12px;
      align-items: center;
      margin-bottom: 12px;
    }
    .sparkle-icon {
      font-size: 20px;
      color: #c084fc;
    }
    .upsell-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 12px;
    }
    .upsell-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
    }
    .side-column {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .meter-card, .summary-card {
      padding: 18px;
    }
    .card-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 16px;
    }
    .gauge-container {
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;
      margin-bottom: 16px;
    }
    .gauge-svg {
      width: 180px;
      height: 110px;
    }
    .gauge-center {
      position: absolute;
      bottom: 14px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .gauge-val {
      font-size: 28px;
      font-weight: 800;
      font-family: 'Outfit', sans-serif;
    }
    .gauge-lbl {
      font-size: 11px;
      color: var(--text-muted);
    }
    .risk-score-box {
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 12px;
      margin-bottom: 14px;
    }
    .risk-score-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      margin-bottom: 8px;
    }
    .risk-score-bar-bg {
      height: 6px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
      overflow: hidden;
      margin-bottom: 6px;
    }
    .risk-score-bar-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.6s ease;
    }
    .risk-score-bar-fill[data-severity="LOW"] { background: #34d399; }
    .risk-score-bar-fill[data-severity="MEDIUM"] { background: #fbbf24; }
    .risk-score-bar-fill[data-severity="HIGH"] { background: #f87171; }
    .risk-score-bar-fill[data-severity="CRITICAL"] { background: #ef4444; }
    .risk-score-meta {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: var(--text-muted);
      font-family: 'JetBrains Mono', monospace;
    }
    .approval-req-box {
      display: flex;
      gap: 10px;
      padding: 12px;
      border-radius: var(--radius-sm);
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      font-size: 12px;
    }
    .alert-icon { font-size: 16px; }
    .summary-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .summary-item {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      color: var(--text-sub);
    }
    .divider-line {
      height: 1px;
      background: var(--border-subtle);
      margin: 6px 0;
    }
    .total-item {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-main);
    }
    .total-val {
      font-size: 18px;
      color: #38bdf8;
    }
    .cogs-item {
      font-size: 11px;
      color: var(--text-muted);
    }
  `]
})
export class QuoteBuilderComponent implements OnInit {
  quote?: Quotation;
  availableProducts: Product[] = [];
  selectedProductId: number | null = null;
  upsells: UpsellSuggestion[] = [];
  Math = Math;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private quoteService: QuotationService,
    private catalogService: CatalogService
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const quoteId = idParam ? parseInt(idParam, 10) : 1;
    this.loadQuote(quoteId);
    this.loadProducts();
  }

  loadQuote(id: number): void {
    this.quoteService.getQuotationById(id).subscribe({
      next: (q) => {
        this.quote = q;
        this.loadUpsells(q.id);
      },
      error: (err) => console.error('Error fetching quotation', err)
    });
  }

  loadProducts(): void {
    this.catalogService.getProducts().subscribe({
      next: (prods) => this.availableProducts = prods,
      error: (err) => console.error('Error loading products', err)
    });
  }

  loadUpsells(quoteId: number): void {
    this.quoteService.getUpsellSuggestions(quoteId).subscribe({
      next: (res) => this.upsells = res,
      error: (err) => console.error('Error loading upsells', err)
    });
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
      lineMarginPct: ((prod.basePrice - prod.unitCost) / prod.basePrice) * 100
    };

    this.quote.lines.push(newLine);
    this.selectedProductId = null;
    this.recalculateTotals();
  }

  removeLine(idx: number): void {
    if (!this.quote) return;
    this.quote.lines.splice(idx, 1);
    this.recalculateTotals();
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
      ? ((line.lineTotal - line.lineCost) / line.lineTotal) * 100
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
    this.quote.blendedDiscountPct = subtotal > 0 ? (totalDiscount / subtotal) * 100 : 0;
    this.quote.totalCostAmount = totalCost;

    const finalAfterDisc = subtotal - totalDiscount;
    this.quote.totalAmount = finalAfterDisc + this.quote.shippingAmount + this.quote.taxAmount;
    this.quote.marginPct = finalAfterDisc > 0
      ? ((finalAfterDisc - totalCost) / finalAfterDisc) * 100
      : 0;

    // Trigger backend risk scoring
    this.recalculateRisk();
  }

  recalculateRisk(): void {
    if (!this.quote) return;
    this.quoteService.calculateRisk(this.quote.id).subscribe({
      next: (res) => {
        if (this.quote) {
          this.quote.riskScore = res.riskScore;
          this.quote.riskSeverity = res.riskSeverity;
          this.quote.requiresManagerApproval = res.requiresManagerApproval;
          this.quote.requiresFinanceApproval = res.requiresFinanceApproval;
        }
      },
      error: (err) => console.error('Error calculating risk', err)
    });
  }

  submitForApproval(): void {
    if (!this.quote) return;
    this.quoteService.submitForApproval(this.quote.id).subscribe({
      next: () => {
        alert('Quotation submitted for approval successfully!');
        this.loadQuote(this.quote!.id);
      },
      error: (err) => alert('Error submitting: ' + (err.error?.message || err.message))
    });
  }

  confirmOrder(): void {
    if (!this.quote) return;
    this.quoteService.confirmQuotation(this.quote.id).subscribe({
      next: () => {
        alert('Order Confirmed and converted to Sales Order!');
        this.loadQuote(this.quote!.id);
      },
      error: (err) => alert('Error confirming: ' + (err.error?.message || err.message))
    });
  }

  applyUpsell(ruleId: number): void {
    if (!this.quote) return;
    this.quoteService.applyUpsell(this.quote.id, ruleId).subscribe({
      next: () => {
        alert('Upsell recommendation applied!');
        this.loadQuote(this.quote!.id);
      },
      error: (err) => alert('Error applying upsell: ' + (err.error?.message || err.message))
    });
  }

  calculateDashOffset(marginPct: number): number {
    const totalLength = 251.2;
    const clamped = Math.min(100, Math.max(0, marginPct));
    return totalLength - (totalLength * (clamped / 100));
  }

  getMarginColor(marginPct: number): string {
    if (marginPct >= 30) return '#10b981'; // Emerald
    if (marginPct >= 18) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  }

  formatCurrency(val: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  }
}
