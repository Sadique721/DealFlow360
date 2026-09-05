import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FulfillmentService } from '../services/fulfillment.service';
import { QuotationService } from '../services/quotation.service';
import { FulfillmentPlan, FulfillmentSplit, Warehouse, Quotation } from '../models/dealflow.model';

@Component({
  selector: 'app-warehouse-split',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="fulfillment-container" *ngIf="plan">
      <!-- Top Navigation -->
      <div class="nav-header">
        <div class="nav-left">
          <a [routerLink]="['/quote', quoteId]" class="back-link">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"></path></svg>
            Quote Cart
          </a>
          <span class="divider">/</span>
          <span class="mono title-id">Multi-Warehouse Fulfillment Optimizer</span>
          <span class="badge badge-info">{{ plan.status }}</span>
        </div>

        <div class="nav-actions">
          <button class="btn btn-outline" (click)="reOptimize()">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            Re-run Greedy Split Algorithm
          </button>
        </div>
      </div>

      <!-- Freight & Logistics KPI Cards -->
      <div class="kpi-grid">
        <div class="glass-panel kpi-card">
          <span class="kpi-lbl">Total Optimized Freight</span>
          <span class="kpi-val mono">{{ formatCurrency(plan.totalFreightCost) }}</span>
          <span class="kpi-sub">Greedy cost minimization applied</span>
        </div>

        <div class="glass-panel kpi-card">
          <span class="kpi-lbl">Max Dispatch Lead Time</span>
          <span class="kpi-val mono text-info">{{ plan.totalLeadTimeDays }} Days</span>
          <span class="kpi-sub">Critical path to delivery</span>
        </div>

        <div class="glass-panel kpi-card">
          <span class="kpi-lbl">Allocation Fulfillment</span>
          <span class="kpi-val" [class.text-success]="plan.allLinesSatisfied" [class.text-warning]="!plan.allLinesSatisfied">
            {{ plan.allLinesSatisfied ? '100% Stocked' : 'Partial / Backordered' }}
          </span>
          <span class="kpi-sub">{{ plan.splits.length }} consignment parcels</span>
        </div>
      </div>

      <!-- Consolidate Backorder Alert Banner (If partial) -->
      <div class="glass-panel consolidate-alert" *ngIf="!plan.allLinesSatisfied || hasBackorders">
        <div class="alert-content">
          <span class="alert-icon">📦</span>
          <div>
            <h4>Stock Shortage & Backorder Detected</h4>
            <p class="sub">Remaining units are marked for backorder. When central inventory arrives, 1-click consolidate to avoid split freight charges.</p>
          </div>
        </div>
        <button class="btn btn-warning" (click)="consolidateBackorder()">
          Consolidate Remaining Backorder
        </button>
      </div>

      <!-- Fulfillment Splits Table -->
      <div class="glass-panel splits-panel">
        <div class="panel-header">
          <h3>Optimized Shipment Routing Plan</h3>
          <span class="sub">Each row is routed from the optimal node based on stock availability and freight cost</span>
        </div>

        <div class="table-container">
          <table class="table-custom">
            <thead>
              <tr>
                <th>Warehouse Node</th>
                <th>Region / City</th>
                <th>Product Consignment</th>
                <th>Allocated Qty</th>
                <th>Backordered Qty</th>
                <th>Freight Calculation</th>
                <th>Est. Lead Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let split of plan.splits">
                <td>
                  <strong>{{ split.warehouse.name || 'Central Facility' }}</strong>
                  <div class="mono sku">{{ split.warehouse.code }}</div>
                </td>
                <td>{{ split.warehouse.locationCity }} ({{ split.warehouse.region }})</td>
                <td>
                  <strong>{{ split.productName }}</strong>
                </td>
                <td class="mono font-bold">{{ split.allocatedQuantity }} units</td>
                <td>
                  <span class="mono" [class.text-warning]="split.backorderedQuantity > 0">
                    {{ split.backorderedQuantity }} units
                  </span>
                </td>
                <td class="mono">
                  {{ formatCurrency(split.estimatedFreightCost) }}
                  <span class="text-muted text-xs">
                    (Base Rate + Weight Calculation)
                  </span>
                </td>
                <td>{{ split.leadTimeDays }} days</td>
                <td>
                  <span
                    class="badge"
                    [class.badge-success]="split.status === 'ALLOCATED'"
                    [class.badge-warning]="split.status === 'BACKORDERED'"
                    [class.badge-info]="split.status === 'DISPATCHED'"
                  >
                    {{ split.status }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .fulfillment-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .nav-header {
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
    }
    .back-link:hover { color: var(--brand-primary); }
    .divider { color: var(--text-muted); }
    .title-id { font-size: 18px; font-weight: 700; }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
    }
    .kpi-card {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .kpi-lbl {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
    }
    .kpi-val {
      font-size: 26px;
      font-weight: 800;
      font-family: 'Outfit', sans-serif;
    }
    .kpi-sub {
      font-size: 11px;
      color: var(--text-muted);
    }
    .consolidate-alert {
      padding: 16px;
      border-left: 4px solid var(--warning);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      background: rgba(245, 158, 11, 0.08);
    }
    .alert-content {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .alert-icon { font-size: 26px; }
    .splits-panel {
      padding: 18px;
    }
    .panel-header {
      margin-bottom: 14px;
    }
    .text-xs { font-size: 10px; }
  `]
})
export class WarehouseSplitComponent implements OnInit {
  quoteId = 1;
  plan?: FulfillmentPlan;
  hasBackorders = false;

  constructor(
    private route: ActivatedRoute,
    private fulfillmentService: FulfillmentService
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.quoteId = idParam ? parseInt(idParam, 10) : 1;
    this.loadPlan();
  }

  loadPlan(): void {
    this.fulfillmentService.getPlanForQuotation(this.quoteId).subscribe({
      next: (p) => {
        this.plan = p;
        this.hasBackorders = p.splits.some(s => s.backorderedQuantity > 0);
      },
      error: (err) => console.error('Error fetching plan', err)
    });
  }

  reOptimize(): void {
    this.fulfillmentService.optimizePlan(this.quoteId).subscribe({
      next: (p) => {
        this.plan = p;
        this.hasBackorders = p.splits.some(s => s.backorderedQuantity > 0);
        alert('Multi-Warehouse greedy split optimizer updated allocations!');
      },
      error: (err) => alert('Optimizer error: ' + (err.error?.message || err.message))
    });
  }

  consolidateBackorder(): void {
    this.fulfillmentService.consolidateBackorder(this.quoteId).subscribe({
      next: () => {
        alert('Consolidation triggered! Central fulfillment allocated for backordered quantity.');
        this.loadPlan();
      },
      error: (err) => alert('Error consolidating: ' + (err.error?.message || err.message))
    });
  }

  formatCurrency(val: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  }
}
