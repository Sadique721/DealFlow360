import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { QuotationService } from '../services/quotation.service';
import { DealHealthService } from '../services/dealhealth.service';
import { Quotation, DashboardMetrics, DealHealthFlag } from '../models/dealflow.model';

@Component({
  selector: 'app-pipeline',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="pipeline-container">
      <!-- Top Metrics Ribbon -->
      <div class="metrics-grid">
        <div class="glass-panel metric-card">
          <div class="metric-header">
            <span class="metric-title">Pipeline Value</span>
            <span class="metric-badge badge-info">Live</span>
          </div>
          <div class="metric-value">{{ formatCurrency(metrics?.totalPipelineValue || 128450) }}</div>
          <div class="metric-sub">Across active quotations</div>
        </div>

        <div class="glass-panel metric-card">
          <div class="metric-header">
            <span class="metric-title">Active Quotes</span>
            <span class="metric-badge badge-purple">{{ quotations.length }} Total</span>
          </div>
          <div class="metric-value">{{ quotations.length }}</div>
          <div class="metric-sub">In negotiation & review</div>
        </div>

        <div class="glass-panel metric-card">
          <div class="metric-header">
            <span class="metric-title">Pending Approvals</span>
            <span class="metric-badge badge-warning">Action Req</span>
          </div>
          <div class="metric-value text-warning">{{ pendingCount }}</div>
          <div class="metric-sub">High margin overage</div>
        </div>

        <div class="glass-panel metric-card">
          <div class="metric-header">
            <span class="metric-title">Health Anomalies</span>
            <span class="metric-badge badge-danger">Radar Alert</span>
          </div>
          <div class="metric-value text-danger">{{ anomalies.length }}</div>
          <div class="metric-sub">Z-Score & Stalled Deals</div>
        </div>
      </div>

      <!-- Action Bar & Filter Controls -->
      <div class="glass-panel action-bar">
        <div class="search-filter-group">
          <input
            type="text"
            class="form-control search-box"
            placeholder="Search by quote # or customer name..."
            [(ngModel)]="searchQuery"
          />
          <div class="filter-pills">
            <button
              class="pill-btn"
              [class.active]="selectedStatus === 'ALL'"
              (click)="filterStatus('ALL')"
            >
              All Quotes ({{ quotations.length }})
            </button>
            <button
              class="pill-btn"
              [class.active]="selectedStatus === 'PENDING_APPROVAL'"
              (click)="filterStatus('PENDING_APPROVAL')"
            >
              Pending Approval
            </button>
            <button
              class="pill-btn"
              [class.active]="selectedStatus === 'APPROVED'"
              (click)="filterStatus('APPROVED')"
            >
              Approved
            </button>
            <button
              class="pill-btn"
              [class.active]="selectedStatus === 'CONFIRMED'"
              (click)="filterStatus('CONFIRMED')"
            >
              Confirmed
            </button>
          </div>
        </div>

        <div class="action-buttons">
          <a routerLink="/quote/new" class="btn btn-primary">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"></path></svg>
            New Quotation
          </a>
        </div>
      </div>

      <!-- Quotations Table -->
      <div class="glass-panel table-card">
        <div class="table-container">
          <table class="table-custom">
            <thead>
              <tr>
                <th>Quote #</th>
                <th>Customer</th>
                <th>Rep</th>
                <th>Subtotal</th>
                <th>Discount</th>
                <th>Margin %</th>
                <th>Risk Score</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let q of filteredQuotations">
                <td>
                  <span class="mono quote-num">{{ q.quoteNumber }}</span>
                </td>
                <td>
                  <div class="customer-info">
                    <strong>{{ q.customer.name }}</strong>
                    <span class="badge badge-neutral tier-tag">{{ q.customer.tier.tierName }}</span>
                  </div>
                </td>
                <td>{{ q.salesRep.name }}</td>
                <td>{{ formatCurrency(q.subtotalAmount) }}</td>
                <td>
                  <span [class.text-danger]="q.blendedDiscountPct > 20" class="mono font-semibold">
                    {{ q.blendedDiscountPct | number:'1.1-2' }}%
                  </span>
                </td>
                <td>
                  <span
                    class="badge"
                    [class.badge-success]="q.marginPct >= 30"
                    [class.badge-warning]="q.marginPct >= 18 && q.marginPct < 30"
                    [class.badge-danger]="q.marginPct < 18"
                  >
                    {{ q.marginPct | number:'1.1-2' }}%
                  </span>
                </td>
                <td>
                  <div class="risk-pill" [attr.data-severity]="q.riskSeverity">
                    <span class="risk-dot"></span>
                    <span>{{ q.riskScore | number:'1.1-1' }} ({{ q.riskSeverity }})</span>
                  </div>
                </td>
                <td>
                  <span
                    class="badge"
                    [class.badge-warning]="q.status === 'PENDING_APPROVAL'"
                    [class.badge-success]="q.status === 'APPROVED' || q.status === 'CONFIRMED'"
                    [class.badge-info]="q.status === 'UNDER_NEGOTIATION' || q.status === 'SENT_TO_CUSTOMER'"
                    [class.badge-neutral]="q.status === 'DRAFT'"
                    [class.badge-danger]="q.status === 'REJECTED'"
                  >
                    {{ q.status.replace('_', ' ') }}
                  </span>
                </td>
                <td>
                  <div class="row-actions">
                    <a [routerLink]="['/quote', q.id]" class="btn btn-outline btn-sm">View Cart</a>
                    <a
                      *ngIf="q.status === 'PENDING_APPROVAL'"
                      [routerLink]="['/approval', q.id]"
                      class="btn btn-primary btn-sm"
                    >
                      Review
                    </a>
                  </div>
                </td>
              </tr>
              <tr *ngIf="filteredQuotations.length === 0">
                <td colspan="9" class="text-center empty-state">
                  No quotations found matching the current search & filters.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pipeline-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
    }
    .metric-card {
      padding: 18px;
    }
    .metric-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .metric-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .metric-value {
      font-size: 28px;
      font-weight: 700;
      font-family: 'Outfit', sans-serif;
      margin-bottom: 4px;
    }
    .metric-sub {
      font-size: 11px;
      color: var(--text-muted);
    }
    .text-warning { color: var(--warning); }
    .text-danger { color: var(--danger); }
    .action-bar {
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 14px;
    }
    .search-filter-group {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .search-box {
      width: 280px;
    }
    .filter-pills {
      display: flex;
      gap: 6px;
    }
    .pill-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-subtle);
      color: var(--text-sub);
      padding: 6px 12px;
      border-radius: var(--radius-full);
      font-size: 12px;
      cursor: pointer;
      transition: all var(--transition-fast);
    }
    .pill-btn.active, .pill-btn:hover {
      background: var(--brand-primary);
      color: #fff;
      border-color: var(--brand-primary);
    }
    .table-card {
      padding: 4px;
    }
    .quote-num {
      color: var(--brand-primary);
      font-weight: 600;
    }
    .customer-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .tier-tag {
      font-size: 9px;
      padding: 2px 6px;
    }
    .risk-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: var(--radius-full);
    }
    .risk-pill[data-severity="LOW"] { background: rgba(16, 185, 129, 0.12); color: #34d399; }
    .risk-pill[data-severity="MEDIUM"] { background: rgba(245, 158, 11, 0.12); color: #fbbf24; }
    .risk-pill[data-severity="HIGH"] { background: rgba(239, 68, 68, 0.12); color: #f87171; }
    .risk-pill[data-severity="CRITICAL"] { background: rgba(239, 68, 68, 0.25); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.4); }
    .risk-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }
    .row-actions {
      display: flex;
      gap: 8px;
    }
    .empty-state {
      padding: 40px;
      color: var(--text-muted);
    }
  `]
})
export class PipelineComponent implements OnInit {
  quotations: Quotation[] = [];
  anomalies: DealHealthFlag[] = [];
  metrics?: DashboardMetrics;
  searchQuery = '';
  selectedStatus = 'ALL';
  pendingCount = 0;

  constructor(
    private quoteService: QuotationService,
    private healthService: DealHealthService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.quoteService.getQuotations().subscribe({
      next: (quotes) => {
        this.quotations = quotes;
        this.pendingCount = quotes.filter(q => q.status === 'PENDING_APPROVAL').length;
      },
      error: (err) => console.error('Error fetching quotes', err)
    });

    this.healthService.getActiveFlags().subscribe({
      next: (flags) => this.anomalies = flags,
      error: (err) => console.error('Error fetching anomalies', err)
    });

    this.healthService.getDashboardMetrics().subscribe({
      next: (m) => this.metrics = m,
      error: (err) => console.error('Error fetching metrics', err)
    });
  }

  filterStatus(status: string): void {
    this.selectedStatus = status;
  }

  get filteredQuotations(): Quotation[] {
    return this.quotations.filter(q => {
      const matchStatus = this.selectedStatus === 'ALL' || q.status === this.selectedStatus;
      const matchSearch = !this.searchQuery ||
        q.quoteNumber.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        q.customer.name.toLowerCase().includes(this.searchQuery.toLowerCase());
      return matchStatus && matchSearch;
    });
  }

  formatCurrency(val: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  }
}
