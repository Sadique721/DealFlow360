import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { QuotationService } from '../services/quotation.service';
import { DealHealthService } from '../services/dealhealth.service';
import { AuthService } from '../services/auth.service';
import { Quotation, DealHealthFlag } from '../models/dealflow.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-pipeline',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="pipeline-container">
      <!-- Cyber RBAC Scoping Banner -->
      <div class="glass-panel rbac-banner">
        <div class="rbac-left">
          <span class="role-icon">⚡</span>
          <div>
            <div class="rbac-title">
              <span class="text-muted">Active Role Scoping:</span>
              <strong class="user-highlight">{{ currentUserName }}</strong>
              <span
                class="badge ml-2"
                [class.badge-primary]="currentRole==='ADMIN'"
                [class.badge-warning]="currentRole==='SALES_MANAGER'"
                [class.badge-info]="currentRole==='SALES_REP'"
                [class.badge-success]="currentRole==='FINANCE'"
                [class.badge-purple]="currentRole==='CUSTOMER'"
              >
                {{ currentRole }}
              </span>
            </div>
            <p class="rbac-scope-note">{{ rbacScopeDescription }}</p>
          </div>
        </div>
        <div class="rbac-stats">
          <div class="stat-bubble">
            <span class="mono rbac-count">{{ quotations.length }}</span>
            <span class="rbac-sub">Deals Visible</span>
          </div>
          <div class="stat-bubble">
            <span class="mono rbac-count text-muted">{{ allQuotations.length }}</span>
            <span class="rbac-sub">System Total</span>
          </div>
        </div>
      </div>

      <!-- Top Cyber Metrics Ribbon -->
      <div class="metrics-grid">
        <div class="glass-panel metric-card cyber-glow-cyan">
          <div class="metric-header">
            <span class="metric-title">Pipeline Value</span>
            <span class="badge badge-info">Scoped Revenue</span>
          </div>
          <div class="metric-value gradient-cyan">{{ formatCurrency(totalPipelineValue) }}</div>
          <div class="metric-sub">Across {{ quotations.length }} scoped enterprise opportunities</div>
        </div>

        <div class="glass-panel metric-card cyber-glow-purple">
          <div class="metric-header">
            <span class="metric-title">Active Deals</span>
            <span class="badge badge-purple">{{ quotations.length }} Active</span>
          </div>
          <div class="metric-value">{{ quotations.length }}</div>
          <div class="metric-sub">In active negotiation & CPQ governance</div>
        </div>

        <div class="glass-panel metric-card cyber-glow-amber">
          <div class="metric-header">
            <span class="metric-title">Pending Governance</span>
            <span class="badge badge-warning">Action Req</span>
          </div>
          <div class="metric-value text-warning">{{ pendingCount }} Deals</div>
          <div class="metric-sub">Requires Manager / VP / CFO Sign-off</div>
        </div>

        <div class="glass-panel metric-card cyber-glow-rose">
          <div class="metric-header">
            <span class="metric-title">Health Anomalies</span>
            <span class="badge badge-danger">Radar Alert</span>
          </div>
          <div class="metric-value text-danger">{{ anomalies.length }} Alerts</div>
          <div class="metric-sub">Z-Score &ge; 2.0 & Stalled Pipelines</div>
        </div>

        <div class="glass-panel metric-card cyber-glow-emerald">
          <div class="metric-header">
            <span class="metric-title">Avg Gross Margin</span>
            <span class="badge badge-success">Target >30%</span>
          </div>
          <div class="metric-value text-emerald">{{ averageMargin | number:'1.1-1' }}%</div>
          <div class="metric-sub">Protected by Blended Risk Engine</div>
        </div>
      </div>

      <!-- Action Bar & Filter Controls -->
      <div class="glass-panel action-bar">
        <div class="search-filter-group">
          <div class="search-input-wrapper">
            <svg class="search-icon" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><path d="M21 21l-4.35-4.35"></path></svg>
            <input
              type="text"
              class="form-control search-box"
              placeholder="Search by quote #, client, or rep..."
              [(ngModel)]="searchQuery"
              (input)="currentPage = 1"
            />
          </div>

          <div class="filter-pills">
            <button
              class="pill-btn"
              [class.active]="selectedStatus === 'ALL'"
              (click)="filterStatus('ALL')"
            >
              All ({{ quotations.length }})
            </button>
            <button
              class="pill-btn"
              [class.active]="selectedStatus === 'PENDING_APPROVAL'"
              (click)="filterStatus('PENDING_APPROVAL')"
            >
              Pending Approval ({{ getStatusCount('PENDING_APPROVAL') }})
            </button>
            <button
              class="pill-btn"
              [class.active]="selectedStatus === 'APPROVED'"
              (click)="filterStatus('APPROVED')"
            >
              Approved ({{ getStatusCount('APPROVED') }})
            </button>
            <button
              class="pill-btn"
              [class.active]="selectedStatus === 'SENT_TO_CUSTOMER'"
              (click)="filterStatus('SENT_TO_CUSTOMER')"
            >
              In Negotiation ({{ getStatusCount('SENT_TO_CUSTOMER') }})
            </button>
            <button
              class="pill-btn"
              [class.active]="selectedStatus === 'ACCEPTED'"
              (click)="filterStatus('ACCEPTED')"
            >
              Accepted / Won ({{ getStatusCount('ACCEPTED') }})
            </button>
          </div>
        </div>

        <div class="action-buttons">
          <div class="view-toggle-group">
            <button
              class="toggle-btn"
              [class.active]="viewMode === 'kanban'"
              (click)="viewMode = 'kanban'"
              title="Kanban Board View"
            >
              <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="18" rx="1"></rect><rect x="14" y="3" width="7" height="10" rx="1"></rect></svg>
              Kanban
            </button>
            <button
              class="toggle-btn"
              [class.active]="viewMode === 'table'"
              (click)="viewMode = 'table'"
              title="120+ Data Grid View with Sorting & Pagination"
            >
              <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
              Data Grid (120+)
            </button>
          </div>

          <a routerLink="/quote/new" class="btn btn-primary">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"></path></svg>
            CPQ Builder
          </a>
        </div>
      </div>

      <!-- KANBAN BOARD VIEW -->
      <div class="kanban-board" *ngIf="viewMode === 'kanban'">
        <!-- Column 1: Draft -->
        <div class="kanban-column">
          <div class="column-header">
            <div class="col-title">
              <span class="stage-dot stage-draft"></span>
              <span>Drafting</span>
            </div>
            <span class="badge badge-neutral">{{ getQuotesByStage('DRAFT').length }}</span>
          </div>
          <div class="cards-list">
            <div class="glass-panel deal-card" *ngFor="let q of getQuotesByStage('DRAFT').slice(0, 15)">
              <div class="card-top">
                <span class="mono card-id">{{ q.quoteNumber }}</span>
                <span class="badge badge-neutral">{{ getTierName(q.customer.tier) }}</span>
              </div>
              <h4 class="card-client">{{ q.customer.name }}</h4>
              <div class="card-value">{{ formatCurrency(q.totalAmount) }}</div>
              <div class="card-progress">
                <div class="progress-bar-bg">
                  <div class="progress-fill" [style.width.%]="q.marginPct" [style.background]="getMarginColor(q.marginPct)"></div>
                </div>
                <div class="progress-labels">
                  <span>Disc: {{ q.blendedDiscountPct }}%</span>
                  <span [style.color]="getMarginColor(q.marginPct)">Margin: {{ q.marginPct | number:'1.1-1' }}%</span>
                </div>
              </div>
              <div class="card-footer">
                <span class="rep-tag">👤 {{ q.salesRep.name }}</span>
                <a [routerLink]="['/dashboard/quote', q.id]" class="btn btn-outline btn-sm">Edit CPQ</a>
              </div>
            </div>
          </div>
        </div>

        <!-- Column 2: Pending Approval -->
        <div class="kanban-column">
          <div class="column-header">
            <div class="col-title">
              <span class="stage-dot stage-pending"></span>
              <span>Governance Review</span>
            </div>
            <span class="badge badge-warning">{{ getQuotesByStage('PENDING_APPROVAL').length }}</span>
          </div>
          <div class="cards-list">
            <div class="glass-panel deal-card highlight-warning" *ngFor="let q of getQuotesByStage('PENDING_APPROVAL').slice(0, 15)">
              <div class="card-top">
                <span class="mono card-id">{{ q.quoteNumber }}</span>
                <span class="badge badge-warning">Tier 2 Escalation</span>
              </div>
              <h4 class="card-client">{{ q.customer.name }}</h4>
              <div class="card-value text-warning">{{ formatCurrency(q.totalAmount) }}</div>
              <div class="card-progress">
                <div class="progress-bar-bg">
                  <div class="progress-fill" [style.width.%]="q.marginPct" [style.background]="getMarginColor(q.marginPct)"></div>
                </div>
                <div class="progress-labels">
                  <span class="text-danger">Disc: {{ q.blendedDiscountPct }}% (Spike)</span>
                  <span [style.color]="getMarginColor(q.marginPct)">Margin: {{ q.marginPct | number:'1.1-1' }}%</span>
                </div>
              </div>
              <div class="card-footer">
                <span class="rep-tag">👤 {{ q.salesRep.name }}</span>
                <a [routerLink]="['/dashboard/approval', q.id]" class="btn btn-danger btn-sm">Review & Rebalance</a>
              </div>
            </div>
          </div>
        </div>

        <!-- Column 3: Approved -->
        <div class="kanban-column">
          <div class="column-header">
            <div class="col-title">
              <span class="stage-dot stage-approved"></span>
              <span>Approved (Ready)</span>
            </div>
            <span class="badge badge-success">{{ getQuotesByStage('APPROVED').length }}</span>
          </div>
          <div class="cards-list">
            <div class="glass-panel deal-card highlight-success" *ngFor="let q of getQuotesByStage('APPROVED').slice(0, 15)">
              <div class="card-top">
                <span class="mono card-id">{{ q.quoteNumber }}</span>
                <span class="badge badge-success">Policy Verified</span>
              </div>
              <h4 class="card-client">{{ q.customer.name }}</h4>
              <div class="card-value text-emerald">{{ formatCurrency(q.totalAmount) }}</div>
              <div class="card-progress">
                <div class="progress-bar-bg">
                  <div class="progress-fill" [style.width.%]="q.marginPct" [style.background]="getMarginColor(q.marginPct)"></div>
                </div>
                <div class="progress-labels">
                  <span>Disc: {{ q.blendedDiscountPct }}%</span>
                  <span [style.color]="getMarginColor(q.marginPct)">Margin: {{ q.marginPct | number:'1.1-1' }}%</span>
                </div>
              </div>
              <div class="card-footer">
                <span class="rep-tag">👤 {{ q.salesRep.name }}</span>
                <a [routerLink]="['/dashboard/fulfillment', q.id]" class="btn btn-outline btn-sm">Split Logistics</a>
              </div>
            </div>
          </div>
        </div>

        <!-- Column 4: In Customer Negotiation -->
        <div class="kanban-column">
          <div class="column-header">
            <div class="col-title">
              <span class="stage-dot stage-portal"></span>
              <span>Customer Portal</span>
            </div>
            <span class="badge badge-info">{{ getQuotesByStage('SENT_TO_CUSTOMER').length }}</span>
          </div>
          <div class="cards-list">
            <div class="glass-panel deal-card" *ngFor="let q of getQuotesByStage('SENT_TO_CUSTOMER').slice(0, 15)">
              <div class="card-top">
                <span class="mono card-id">{{ q.quoteNumber }}</span>
                <span class="badge badge-info">Magic Link Sent</span>
              </div>
              <h4 class="card-client">{{ q.customer.name }}</h4>
              <div class="card-value">{{ formatCurrency(q.totalAmount) }}</div>
              <div class="card-progress">
                <div class="progress-bar-bg">
                  <div class="progress-fill" [style.width.%]="q.marginPct" [style.background]="getMarginColor(q.marginPct)"></div>
                </div>
                <div class="progress-labels">
                  <span>Disc: {{ q.blendedDiscountPct }}%</span>
                  <span [style.color]="getMarginColor(q.marginPct)">Margin: {{ q.marginPct | number:'1.1-1' }}%</span>
                </div>
              </div>
              <div class="card-footer">
                <span class="rep-tag">👤 {{ q.salesRep.name }}</span>
                <a [routerLink]="['/portal', q.portalToken || q.portalAccessToken || 'magic-token-acme-1042-demo']" target="_blank" class="btn btn-outline btn-sm">Portal View ↗</a>
              </div>
            </div>
          </div>
        </div>

        <!-- Column 5: Accepted / Won -->
        <div class="kanban-column">
          <div class="column-header">
            <div class="col-title">
              <span class="stage-dot stage-won"></span>
              <span>Closed Won</span>
            </div>
            <span class="badge badge-purple">{{ getQuotesByStage('ACCEPTED').length }}</span>
          </div>
          <div class="cards-list">
            <div class="glass-panel deal-card highlight-purple" *ngFor="let q of getQuotesByStage('ACCEPTED').slice(0, 15)">
              <div class="card-top">
                <span class="mono card-id">{{ q.quoteNumber }}</span>
                <span class="badge badge-purple">Signed Deal</span>
              </div>
              <h4 class="card-client">{{ q.customer.name }}</h4>
              <div class="card-value text-purple">{{ formatCurrency(q.totalAmount) }}</div>
              <div class="card-progress">
                <div class="progress-bar-bg">
                  <div class="progress-fill" [style.width.%]="q.marginPct" [style.background]="getMarginColor(q.marginPct)"></div>
                </div>
                <div class="progress-labels">
                  <span>Disc: {{ q.blendedDiscountPct }}%</span>
                  <span [style.color]="getMarginColor(q.marginPct)">Margin: {{ q.marginPct | number:'1.1-1' }}%</span>
                </div>
              </div>
              <div class="card-footer">
                <span class="rep-tag">👤 {{ q.salesRep.name }}</span>
                <a [routerLink]="['/dashboard/fulfillment', q.id]" class="btn btn-success btn-sm">Fulfillment</a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- DETAILED 120+ DATA GRID VIEW WITH SEARCH, SORT, AND PAGINATION -->
      <div class="glass-panel table-card" *ngIf="viewMode === 'table'">
        <div class="table-container">
          <table class="table-custom">
            <thead>
              <tr>
                <th (click)="setSort('quoteNumber')" class="sortable-th">
                  Quote # <span class="sort-icon">{{ getSortIcon('quoteNumber') }}</span>
                </th>
                <th (click)="setSort('customerName')" class="sortable-th">
                  Enterprise Client <span class="sort-icon">{{ getSortIcon('customerName') }}</span>
                </th>
                <th (click)="setSort('salesRep')" class="sortable-th">
                  Sales Rep <span class="sort-icon">{{ getSortIcon('salesRep') }}</span>
                </th>
                <th (click)="setSort('subtotalAmount')" class="sortable-th">
                  Subtotal Value <span class="sort-icon">{{ getSortIcon('subtotalAmount') }}</span>
                </th>
                <th (click)="setSort('blendedDiscountPct')" class="sortable-th">
                  Blended Discount <span class="sort-icon">{{ getSortIcon('blendedDiscountPct') }}</span>
                </th>
                <th (click)="setSort('marginPct')" class="sortable-th">
                  Gross Margin % <span class="sort-icon">{{ getSortIcon('marginPct') }}</span>
                </th>
                <th (click)="setSort('riskSeverity')" class="sortable-th">
                  Risk Classification <span class="sort-icon">{{ getSortIcon('riskSeverity') }}</span>
                </th>
                <th (click)="setSort('status')" class="sortable-th">
                  Stage Status <span class="sort-icon">{{ getSortIcon('status') }}</span>
                </th>
                <th>Fast Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let q of paginatedQuotations">
                <td>
                  <span class="mono quote-num">{{ q.quoteNumber }}</span>
                </td>
                <td>
                  <div class="customer-info">
                    <strong>{{ q.customer.name }}</strong>
                    <span class="badge badge-neutral tier-tag">{{ getTierName(q.customer) }}</span>
                  </div>
                </td>
                <td>{{ q.salesRep.name }}</td>
                <td class="mono font-semibold">{{ formatCurrency(q.subtotalAmount) }}</td>
                <td>
                  <span [class.text-danger]="q.blendedDiscountPct > 15" class="mono font-semibold">
                    {{ q.blendedDiscountPct | number:'1.1-1' }}%
                  </span>
                </td>
                <td>
                  <span
                    class="badge"
                    [class.badge-success]="q.marginPct >= 30"
                    [class.badge-warning]="q.marginPct >= 18 && q.marginPct < 30"
                    [class.badge-danger]="q.marginPct < 18"
                  >
                    {{ q.marginPct | number:'1.1-1' }}%
                  </span>
                </td>
                <td>
                  <span
                    class="badge"
                    [class.badge-success]="q.riskSeverity === 'LOW'"
                    [class.badge-warning]="q.riskSeverity === 'MEDIUM'"
                    [class.badge-danger]="q.riskSeverity === 'HIGH' || q.riskSeverity === 'CRITICAL'"
                  >
                    {{ q.riskSeverity }}
                  </span>
                </td>
                <td>
                  <span
                    class="badge"
                    [class.badge-warning]="q.status === 'PENDING_APPROVAL'"
                    [class.badge-success]="q.status === 'APPROVED'"
                    [class.badge-info]="q.status === 'SENT_TO_CUSTOMER'"
                    [class.badge-purple]="q.status === 'ACCEPTED' || q.status === 'CONFIRMED'"
                    [class.badge-neutral]="q.status === 'DRAFT'"
                  >
                    {{ q.status.replace('_', ' ') }}
                  </span>
                </td>
                <td>
                  <div class="row-actions">
                    <a [routerLink]="['/dashboard/quote', q.id]" class="btn btn-outline btn-sm">Edit</a>
                    <a *ngIf="q.status === 'PENDING_APPROVAL'" [routerLink]="['/dashboard/approval', q.id]" class="btn btn-danger btn-sm">Review</a>
                    <a *ngIf="q.status === 'APPROVED' || q.status === 'ACCEPTED' || q.status === 'CONFIRMED'" [routerLink]="['/dashboard/fulfillment', q.id]" class="btn btn-outline btn-sm">Splits</a>
                  </div>
                </td>
              </tr>
              <tr *ngIf="paginatedQuotations.length === 0">
                <td colspan="9" class="text-center py-4 text-muted">
                  No matching quotations found in current role scope. Try resetting filters.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Table Pagination Toolbar -->
        <div class="table-pagination-bar">
          <div class="pagination-info">
            Showing <strong>{{ paginationStartRecord }}</strong> to <strong>{{ paginationEndRecord }}</strong> of <strong>{{ filteredQuotations.length }}</strong> quotations
          </div>
          <div class="pagination-controls">
            <div class="page-size-selector">
              <span class="text-muted">Per page:</span>
              <select class="form-control form-control-sm select-page-size" [(ngModel)]="pageSize" (change)="currentPage = 1">
                <option [ngValue]="10">10</option>
                <option [ngValue]="25">25</option>
                <option [ngValue]="50">50</option>
                <option [ngValue]="100">100</option>
              </select>
            </div>
            <div class="page-nav-buttons">
              <button class="btn btn-outline btn-xs" (click)="goToPage(1)" [disabled]="currentPage === 1">« First</button>
              <button class="btn btn-outline btn-xs" (click)="goToPage(currentPage - 1)" [disabled]="currentPage === 1">‹ Prev</button>
              <span class="page-number-display">Page {{ currentPage }} of {{ totalPages }}</span>
              <button class="btn btn-outline btn-xs" (click)="goToPage(currentPage + 1)" [disabled]="currentPage >= totalPages">Next ›</button>
              <button class="btn btn-outline btn-xs" (click)="goToPage(totalPages)" [disabled]="currentPage >= totalPages">Last »</button>
            </div>
          </div>
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

    /* RBAC Banner */
    .rbac-banner {
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
      border-left: 4px solid #38bdf8;
      background: rgba(15, 23, 42, 0.7);
    }
    .rbac-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .role-icon { font-size: 24px; }
    .rbac-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 15px;
    }
    .user-highlight {
      color: #38bdf8;
    }
    .rbac-scope-note {
      font-size: 12px;
      color: var(--text-sub);
      margin-top: 2px;
    }
    .rbac-stats {
      display: flex;
      gap: 12px;
    }
    .stat-bubble {
      display: flex;
      flex-direction: column;
      align-items: center;
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid var(--border-subtle);
      border-radius: 8px;
      padding: 6px 14px;
    }
    .rbac-count {
      font-size: 18px;
      font-weight: 800;
      color: #fff;
    }
    .rbac-sub {
      font-size: 10px;
      color: var(--text-muted);
      text-transform: uppercase;
    }

    /* Metrics Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 16px;
    }
    .metric-card {
      padding: 18px;
      position: relative;
      overflow: hidden;
    }
    .cyber-glow-cyan {
      border-color: rgba(0, 242, 254, 0.25);
      box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.4), 0 0 15px rgba(0, 242, 254, 0.08);
    }
    .cyber-glow-purple {
      border-color: rgba(168, 85, 247, 0.25);
      box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.4), 0 0 15px rgba(168, 85, 247, 0.08);
    }
    .cyber-glow-amber {
      border-color: rgba(251, 191, 36, 0.25);
      box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.4), 0 0 15px rgba(251, 191, 36, 0.08);
    }
    .cyber-glow-rose {
      border-color: rgba(255, 0, 122, 0.25);
      box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.4), 0 0 15px rgba(255, 0, 122, 0.08);
    }
    .cyber-glow-emerald {
      border-color: rgba(0, 223, 162, 0.25);
      box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.4), 0 0 15px rgba(0, 223, 162, 0.08);
    }
    .metric-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .metric-title {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .metric-value {
      font-size: 28px;
      font-weight: 800;
      font-family: 'Outfit', sans-serif;
      margin-bottom: 4px;
      letter-spacing: -0.02em;
    }
    .gradient-cyan {
      background: linear-gradient(135deg, #00f2fe 0%, #38bdf8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .text-emerald { color: #00dfa2; }
    .text-warning { color: #fbbf24; }
    .text-danger { color: #ff007a; }
    .text-purple { color: #c084fc; }
    .metric-sub {
      font-size: 11px;
      color: var(--text-muted);
    }

    /* Action Bar */
    .action-bar {
      padding: 14px 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 14px;
    }
    .search-filter-group {
      display: flex;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
      flex: 1;
    }
    .search-input-wrapper {
      position: relative;
      width: 260px;
    }
    .search-icon {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
    }
    .search-box {
      padding-left: 34px;
    }
    .filter-pills {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .pill-btn {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border-subtle);
      color: var(--text-sub);
      padding: 6px 14px;
      border-radius: var(--radius-full);
      font-size: 12px;
      cursor: pointer;
      transition: all var(--transition-fast);
    }
    .pill-btn.active, .pill-btn:hover {
      background: rgba(0, 242, 254, 0.12);
      border-color: rgba(0, 242, 254, 0.5);
      color: #00f2fe;
    }
    .action-buttons {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .view-toggle-group {
      display: flex;
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 2px;
    }
    .toggle-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border: none;
      background: transparent;
      color: var(--text-muted);
      font-size: 12px;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      transition: all var(--transition-fast);
    }
    .toggle-btn.active {
      background: rgba(0, 242, 254, 0.15);
      color: #00f2fe;
    }

    /* Kanban Layout */
    .kanban-board {
      display: grid;
      grid-template-columns: repeat(5, minmax(260px, 1fr));
      gap: 16px;
      overflow-x: auto;
      padding-bottom: 8px;
    }
    .kanban-column {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .column-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: rgba(12, 18, 34, 0.6);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
    }
    .col-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .stage-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .stage-draft { background: var(--text-muted); }
    .stage-pending { background: #fbbf24; box-shadow: 0 0 8px #fbbf24; }
    .stage-approved { background: #00dfa2; box-shadow: 0 0 8px #00dfa2; }
    .stage-portal { background: #00f2fe; box-shadow: 0 0 8px #00f2fe; }
    .stage-won { background: #c084fc; box-shadow: 0 0 8px #c084fc; }

    .cards-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .deal-card {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .deal-card:hover {
      transform: translateY(-2px);
    }
    .highlight-warning { border-left: 3px solid #fbbf24; }
    .highlight-success { border-left: 3px solid #00dfa2; }
    .highlight-purple { border-left: 3px solid #c084fc; }
    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .card-id {
      font-size: 11px;
      font-weight: 700;
      color: var(--brand-primary);
    }
    .card-client {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-main);
    }
    .card-value {
      font-size: 20px;
      font-weight: 800;
      font-family: 'Outfit', sans-serif;
    }
    .card-progress {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .progress-bar-bg {
      height: 6px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 3px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.4s ease;
    }
    .progress-labels {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
    }
    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 4px;
      padding-top: 8px;
      border-top: 1px solid var(--border-subtle);
    }
    .rep-tag {
      font-size: 11px;
      color: var(--text-muted);
    }

    /* Table & Pagination */
    .table-card {
      padding: 0;
      overflow: hidden;
    }
    .table-container {
      overflow-x: auto;
    }
    .sortable-th {
      cursor: pointer;
      user-select: none;
      transition: background 0.2s;
    }
    .sortable-th:hover {
      background: rgba(59, 130, 246, 0.1);
      color: #38bdf8;
    }
    .sort-icon {
      font-size: 10px;
      margin-left: 4px;
      color: #38bdf8;
    }
    .quote-num {
      font-weight: 700;
      color: #38bdf8;
    }
    .customer-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .tier-tag {
      font-size: 9px;
    }
    .row-actions {
      display: flex;
      gap: 6px;
    }

    /* Pagination Bar */
    .table-pagination-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      padding: 12px 18px;
      background: rgba(10, 15, 28, 0.85);
      border-top: 1px solid var(--border-subtle);
      gap: 12px;
    }
    .pagination-info {
      font-size: 13px;
      color: var(--text-sub);
    }
    .pagination-controls {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .page-size-selector {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
    }
    .select-page-size {
      width: 70px;
      padding: 4px 8px;
      font-size: 12px;
    }
    .page-nav-buttons {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .page-number-display {
      font-size: 12px;
      color: var(--text-main);
      padding: 0 8px;
      font-weight: 600;
    }
  `]
})
export class PipelineComponent implements OnInit, OnDestroy {
  allQuotations: Quotation[] = [];
  quotations: Quotation[] = [];
  anomalies: DealHealthFlag[] = [];
  pendingCount = 0;

  // RBAC info
  currentRole = 'ADMIN';
  currentUserName = 'Md Sadique Amin (Admin)';

  // Filters & State
  viewMode: 'kanban' | 'table' = 'table';
  selectedStatus = 'ALL';
  searchQuery = '';

  // Sort & Pagination state
  sortColumn = 'quoteNumber';
  sortDirection: 'asc' | 'desc' = 'desc';
  pageSize = 25;
  currentPage = 1;

  private subs = new Subscription();

  constructor(
    private quoteService: QuotationService,
    private healthService: DealHealthService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.allQuotations = [];

    // Subscribe to active persona changes
    this.subs.add(
      this.authService.currentRole$.subscribe(role => {
        this.currentRole = role;
        this.applyRbacFilter();
      })
    );

    this.subs.add(
      this.authService.currentUser$.subscribe(user => {
        this.currentUserName = user.name;
        this.applyRbacFilter();
      })
    );

    this.loadData();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  loadData(): void {
    this.quoteService.getQuotations().subscribe({
      next: (quotes) => {
        this.allQuotations = quotes || [];
        this.applyRbacFilter();
      },
      error: () => {
        this.applyRbacFilter();
      }
    });

    this.healthService.getActiveFlags().subscribe({
      next: (flags) => {
        this.anomalies = flags || [];
      },
      error: () => {
        this.anomalies = [];
      }
    });
  }

  getTierName(customer?: any): string {
    if (!customer || !customer.tier) return 'Standard';
    if (typeof customer.tier === 'string') return customer.tier;
    return customer.tier.tierName || 'Standard';
  }

  applyRbacFilter(): void {
    this.quotations = this.authService.filterQuotationsByRole(this.allQuotations);
    this.pendingCount = this.quotations.filter(q => q.status === 'PENDING_APPROVAL').length;
    this.currentPage = 1;
  }

  get rbacScopeDescription(): string {
    if (this.currentRole === 'ADMIN') {
      return 'Full Administrator View: Universal access to all 120+ enterprise opportunities across all teams.';
    }
    if (this.currentRole === 'SALES_REP') {
      return `Scoped to ${this.currentUserName}: Can view only assigned opportunities. Other representatives' deals and executive policies are restricted.`;
    }
    if (this.currentRole === 'SALES_MANAGER') {
      return 'Sales Manager View: Overview of all team pipelines and Level 1 governance approval requests.';
    }
    if (this.currentRole === 'FINANCE') {
      return 'Finance & Operations View: Filtered to deals requiring second-level risk review or pending fulfillment.';
    }
    if (this.currentRole === 'CUSTOMER') {
      return 'External Customer View: Scoped to Zenith Systems proposals with ZERO internal cost leakage.';
    }
    return 'Public Session';
  }

  get totalPipelineValue(): number {
    return this.quotations.reduce((sum, q) => sum + (q.totalAmount || 0), 0);
  }

  get averageMargin(): number {
    if (this.quotations.length === 0) return 0;
    const total = this.quotations.reduce((sum, q) => sum + (q.marginPct || 0), 0);
    return total / this.quotations.length;
  }

  getStatusCount(status: string): number {
    return this.quotations.filter(q => q.status === status).length;
  }

  getQuotesByStage(stage: string): Quotation[] {
    return this.quotations.filter(q => q.status === stage);
  }

  getMarginColor(margin: number): string {
    if (margin >= 30) return '#00dfa2';
    if (margin >= 20) return '#fbbf24';
    return '#ff007a';
  }

  filterStatus(status: string): void {
    this.selectedStatus = status;
    this.currentPage = 1;
  }

  setSort(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.currentPage = 1;
  }

  getSortIcon(column: string): string {
    if (this.sortColumn !== column) return '⇅';
    return this.sortDirection === 'asc' ? '▲' : '▼';
  }

  get filteredQuotations(): Quotation[] {
    const qList = this.quotations.filter(q => {
      const matchStatus = this.selectedStatus === 'ALL' || q.status === this.selectedStatus;
      const query = this.searchQuery.toLowerCase().trim();
      const matchSearch = !query ||
        q.quoteNumber.toLowerCase().includes(query) ||
        (q.customer.name && q.customer.name.toLowerCase().includes(query)) ||
        (q.salesRep.name && q.salesRep.name.toLowerCase().includes(query));
      return matchStatus && matchSearch;
    });

    return qList.sort((a, b) => {
      let aVal: any = '';
      let bVal: any = '';

      switch (this.sortColumn) {
        case 'quoteNumber':
          aVal = a.quoteNumber;
          bVal = b.quoteNumber;
          break;
        case 'customerName':
          aVal = a.customer?.name || '';
          bVal = b.customer?.name || '';
          break;
        case 'salesRep':
          aVal = a.salesRep?.name || '';
          bVal = b.salesRep?.name || '';
          break;
        case 'subtotalAmount':
          aVal = a.subtotalAmount || 0;
          bVal = b.subtotalAmount || 0;
          break;
        case 'blendedDiscountPct':
          aVal = a.blendedDiscountPct || 0;
          bVal = b.blendedDiscountPct || 0;
          break;
        case 'marginPct':
          aVal = a.marginPct || 0;
          bVal = b.marginPct || 0;
          break;
        case 'riskSeverity':
          aVal = a.riskSeverity || '';
          bVal = b.riskSeverity || '';
          break;
        case 'status':
          aVal = a.status || '';
          bVal = b.status || '';
          break;
        default:
          aVal = a.id;
          bVal = b.id;
      }

      if (typeof aVal === 'string') {
        const cmp = aVal.localeCompare(bVal);
        return this.sortDirection === 'asc' ? cmp : -cmp;
      } else {
        return this.sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
    });
  }

  get totalPages(): number {
    return Math.ceil(this.filteredQuotations.length / this.pageSize) || 1;
  }

  get paginatedQuotations(): Quotation[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredQuotations.slice(start, start + this.pageSize);
  }

  get paginationStartRecord(): number {
    if (this.filteredQuotations.length === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get paginationEndRecord(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredQuotations.length);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  formatCurrency(val: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val || 0);
  }
}
