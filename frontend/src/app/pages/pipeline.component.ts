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
            <span class="rbac-sub">Scoped Total</span>
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
          <div class="metric-sub">Across {{ quotations.length }} active enterprise opportunities</div>
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
              [class.active]="selectedStatus === 'DRAFT'"
              (click)="filterStatus('DRAFT')"
            >
              Draft ({{ getStatusCount('DRAFT') }})
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
              [class.active]="selectedStatus === 'NEGOTIATION'"
              (click)="filterStatus('NEGOTIATION')"
            >
              Negotiation ({{ getStatusCount('NEGOTIATION') }})
            </button>
            <button
              class="pill-btn"
              [class.active]="selectedStatus === 'CONFIRMED'"
              (click)="filterStatus('CONFIRMED')"
            >
              Confirmed / Won ({{ getStatusCount('CONFIRMED') }})
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
              title="Data Grid View with Sorting & Pagination"
            >
              <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
              Data Grid
            </button>
          </div>

          <a *ngIf="currentRole !== 'CUSTOMER'" routerLink="/dashboard/quote/new" class="btn btn-primary">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"></path></svg>
            + New Quotation
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
            <div class="glass-panel deal-card" *ngFor="let q of getQuotesByStage('DRAFT')">
              <div class="card-top">
                <span class="mono card-id">{{ q.quoteNumber }}</span>
                <span class="badge badge-neutral">{{ getCustomerTierName(q) }}</span>
              </div>
              <h4 class="card-client">{{ q.customer?.name || 'Customer' }}</h4>
              <div class="card-value">{{ formatCurrency(q.totalAmount) }}</div>
              <div class="card-progress">
                <div class="progress-bar-bg">
                  <div class="progress-fill" [style.width.%]="getMargin(q)" [style.background]="getMarginColor(getMargin(q))"></div>
                </div>
                <div class="progress-labels">
                  <span>Disc: {{ getDiscountPct(q) | number:'1.1-1' }}%</span>
                  <span [style.color]="getMarginColor(getMargin(q))">Margin: {{ getMargin(q) | number:'1.1-1' }}%</span>
                </div>
              </div>
              <div class="card-footer">
                <span class="rep-tag">👤 {{ q.salesRep?.name || 'Sales Rep' }}</span>
                <a [routerLink]="['/dashboard/quote', q.id]" class="btn btn-outline btn-sm">Edit Quote</a>
              </div>
            </div>
            <div *ngIf="getQuotesByStage('DRAFT').length === 0" class="empty-column-notice">
              No draft quotations
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
            <div class="glass-panel deal-card highlight-warning" *ngFor="let q of getQuotesByStage('PENDING_APPROVAL')">
              <div class="card-top">
                <span class="mono card-id">{{ q.quoteNumber }}</span>
                <span class="badge badge-warning">Risk: {{ getRiskScore(q) | number:'1.0-0' }}</span>
              </div>
              <h4 class="card-client">{{ q.customer?.name || 'Customer' }}</h4>
              <div class="card-value text-warning">{{ formatCurrency(q.totalAmount) }}</div>
              <div class="card-progress">
                <div class="progress-bar-bg">
                  <div class="progress-fill" [style.width.%]="getMargin(q)" [style.background]="getMarginColor(getMargin(q))"></div>
                </div>
                <div class="progress-labels">
                  <span class="text-danger">Disc: {{ getDiscountPct(q) | number:'1.1-1' }}%</span>
                  <span [style.color]="getMarginColor(getMargin(q))">Margin: {{ getMargin(q) | number:'1.1-1' }}%</span>
                </div>
              </div>
              <div class="card-footer">
                <span class="rep-tag">👤 {{ q.salesRep?.name || 'Sales Rep' }}</span>
                <a [routerLink]="['/dashboard/quote', q.id]" class="btn btn-danger btn-sm">Review Quote</a>
              </div>
            </div>
            <div *ngIf="getQuotesByStage('PENDING_APPROVAL').length === 0" class="empty-column-notice">
              No quotations pending approval
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
            <div class="glass-panel deal-card highlight-success" *ngFor="let q of getQuotesByStage('APPROVED')">
              <div class="card-top">
                <span class="mono card-id">{{ q.quoteNumber }}</span>
                <span class="badge badge-success">Policy Verified</span>
              </div>
              <h4 class="card-client">{{ q.customer?.name || 'Customer' }}</h4>
              <div class="card-value text-emerald">{{ formatCurrency(q.totalAmount) }}</div>
              <div class="card-progress">
                <div class="progress-bar-bg">
                  <div class="progress-fill" [style.width.%]="getMargin(q)" [style.background]="getMarginColor(getMargin(q))"></div>
                </div>
                <div class="progress-labels">
                  <span>Disc: {{ getDiscountPct(q) | number:'1.1-1' }}%</span>
                  <span [style.color]="getMarginColor(getMargin(q))">Margin: {{ getMargin(q) | number:'1.1-1' }}%</span>
                </div>
              </div>
              <div class="card-footer">
                <span class="rep-tag">👤 {{ q.salesRep?.name || 'Sales Rep' }}</span>
                <a [routerLink]="['/dashboard/quote', q.id]" class="btn btn-outline btn-sm">View & Confirm</a>
              </div>
            </div>
            <div *ngIf="getQuotesByStage('APPROVED').length === 0" class="empty-column-notice">
              No approved quotations
            </div>
          </div>
        </div>

        <!-- Column 4: In Customer Negotiation -->
        <div class="kanban-column">
          <div class="column-header">
            <div class="col-title">
              <span class="stage-dot stage-portal"></span>
              <span>Customer Negotiation</span>
            </div>
            <span class="badge badge-info">{{ getQuotesByStage('NEGOTIATION').length }}</span>
          </div>
          <div class="cards-list">
            <div class="glass-panel deal-card" *ngFor="let q of getQuotesByStage('NEGOTIATION')">
              <div class="card-top">
                <span class="mono card-id">{{ q.quoteNumber }}</span>
                <span class="badge badge-info">In Negotiation</span>
              </div>
              <h4 class="card-client">{{ q.customer?.name || 'Customer' }}</h4>
              <div class="card-value">{{ formatCurrency(q.totalAmount) }}</div>
              <div class="card-progress">
                <div class="progress-bar-bg">
                  <div class="progress-fill" [style.width.%]="getMargin(q)" [style.background]="getMarginColor(getMargin(q))"></div>
                </div>
                <div class="progress-labels">
                  <span>Disc: {{ getDiscountPct(q) | number:'1.1-1' }}%</span>
                  <span [style.color]="getMarginColor(getMargin(q))">Margin: {{ getMargin(q) | number:'1.1-1' }}%</span>
                </div>
              </div>
              <div class="card-footer">
                <span class="rep-tag">👤 {{ q.salesRep?.name || 'Sales Rep' }}</span>
                <a [routerLink]="['/dashboard/quote', q.id]" class="btn btn-outline btn-sm">View Deal</a>
              </div>
            </div>
            <div *ngIf="getQuotesByStage('NEGOTIATION').length === 0" class="empty-column-notice">
              No negotiations in progress
            </div>
          </div>
        </div>

        <!-- Column 5: Accepted / Won -->
        <div class="kanban-column">
          <div class="column-header">
            <div class="col-title">
              <span class="stage-dot stage-won"></span>
              <span>Closed Won / Confirmed</span>
            </div>
            <span class="badge badge-purple">{{ getQuotesByStage('CONFIRMED').length }}</span>
          </div>
          <div class="cards-list">
            <div class="glass-panel deal-card highlight-purple" *ngFor="let q of getQuotesByStage('CONFIRMED')">
              <div class="card-top">
                <span class="mono card-id">{{ q.quoteNumber }}</span>
                <span class="badge badge-purple">Order Confirmed</span>
              </div>
              <h4 class="card-client">{{ q.customer?.name || 'Customer' }}</h4>
              <div class="card-value text-purple">{{ formatCurrency(q.totalAmount) }}</div>
              <div class="card-progress">
                <div class="progress-bar-bg">
                  <div class="progress-fill" [style.width.%]="getMargin(q)" [style.background]="getMarginColor(getMargin(q))"></div>
                </div>
                <div class="progress-labels">
                  <span>Disc: {{ getDiscountPct(q) | number:'1.1-1' }}%</span>
                  <span [style.color]="getMarginColor(getMargin(q))">Margin: {{ getMargin(q) | number:'1.1-1' }}%</span>
                </div>
              </div>
              <div class="card-footer">
                <span class="rep-tag">👤 {{ q.salesRep?.name || 'Sales Rep' }}</span>
                <a [routerLink]="['/dashboard/quote', q.id]" class="btn btn-success btn-sm">View Order</a>
              </div>
            </div>
            <div *ngIf="getQuotesByStage('CONFIRMED').length === 0" class="empty-column-notice">
              No confirmed orders
            </div>
          </div>
        </div>
      </div>

      <!-- DETAILED DATA GRID VIEW WITH SEARCH, SORT, AND PAGINATION -->
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
                  Discount % <span class="sort-icon">{{ getSortIcon('blendedDiscountPct') }}</span>
                </th>
                <th (click)="setSort('marginPct')" class="sortable-th">
                  Gross Margin % <span class="sort-icon">{{ getSortIcon('marginPct') }}</span>
                </th>
                <th (click)="setSort('riskSeverity')" class="sortable-th">
                  Risk Level <span class="sort-icon">{{ getSortIcon('riskSeverity') }}</span>
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
                  <a [routerLink]="['/dashboard/quote', q.id]" class="mono quote-num">{{ q.quoteNumber }}</a>
                </td>
                <td>
                  <div class="customer-info">
                    <strong>{{ q.customer?.name || 'Customer' }}</strong>
                    <span class="badge badge-neutral tier-tag">{{ getCustomerTierName(q) }}</span>
                  </div>
                </td>
                <td>{{ q.salesRep?.name || 'Sales Rep' }}</td>
                <td class="mono font-semibold">{{ formatCurrency(q.subtotalAmount || q.totalAmount) }}</td>
                <td>
                  <span [class.text-danger]="getDiscountPct(q) > 15" class="mono font-semibold">
                    {{ getDiscountPct(q) | number:'1.1-1' }}%
                  </span>
                </td>
                <td>
                  <span
                    class="badge"
                    [class.badge-success]="getMargin(q) >= 30"
                    [class.badge-warning]="getMargin(q) >= 18 && getMargin(q) < 30"
                    [class.badge-danger]="getMargin(q) < 18"
                  >
                    {{ getMargin(q) | number:'1.1-1' }}%
                  </span>
                </td>
                <td>
                  <span
                    class="badge"
                    [class.badge-success]="getRiskSeverity(q) === 'LOW'"
                    [class.badge-warning]="getRiskSeverity(q) === 'MEDIUM'"
                    [class.badge-danger]="getRiskSeverity(q) === 'HIGH' || getRiskSeverity(q) === 'CRITICAL'"
                  >
                    {{ getRiskSeverity(q) }}
                  </span>
                </td>
                <td>
                  <span
                    class="badge"
                    [class.badge-warning]="q.status === 'PENDING_APPROVAL'"
                    [class.badge-success]="q.status === 'APPROVED'"
                    [class.badge-info]="q.status === 'SENT_TO_CUSTOMER' || q.status === 'UNDER_NEGOTIATION'"
                    [class.badge-purple]="q.status === 'ACCEPTED' || q.status === 'CONFIRMED'"
                    [class.badge-neutral]="q.status === 'DRAFT'"
                  >
                    {{ (q.status || 'DRAFT').replace('_', ' ') }}
                  </span>
                </td>
                <td>
                  <div class="row-actions">
                    <a [routerLink]="['/dashboard/quote', q.id]" class="btn btn-outline btn-sm">Open</a>
                    <a *ngIf="q.status === 'PENDING_APPROVAL'" [routerLink]="['/dashboard/quote', q.id]" class="btn btn-danger btn-sm">Review</a>
                    <a *ngIf="q.status === 'APPROVED' || q.status === 'ACCEPTED' || q.status === 'CONFIRMED'" [routerLink]="['/dashboard/fulfillment', q.id]" class="btn btn-outline btn-sm">Splits</a>
                  </div>
                </td>
              </tr>
              <tr *ngIf="paginatedQuotations.length === 0">
                <td colspan="9" class="text-center py-5 text-muted">
                  <div class="empty-state-box">
                    <p class="mb-2">No matching quotations found in current scope.</p>
                    <a *ngIf="currentRole !== 'CUSTOMER'" routerLink="/dashboard/quote/new" class="btn btn-primary btn-sm">
                      + Create Quotation
                    </a>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Table Pagination Toolbar -->
        <div class="table-pagination-bar" *ngIf="filteredQuotations.length > 0">
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
      border-left: 4px solid #2563eb;
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      border-left-width: 4px;
      border-left-color: #2563eb;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
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
      font-weight: 600;
      color: #0f172a;
    }
    .user-highlight {
      color: #2563eb;
    }
    .rbac-scope-note {
      font-size: 12.5px;
      color: #64748b;
      margin-top: 2px;
    }
    .rbac-stats {
      display: flex;
      gap: 12px;
    }
    .stat-bubble {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      padding: 6px 14px;
      background: #f8fafc;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    .rbac-count {
      font-size: 18px;
      font-weight: 800;
      color: #2563eb;
    }
    .rbac-sub {
      font-size: 11px;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.03em;
    }

    /* Metrics Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }
    .metric-card {
      padding: 16px 18px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      position: relative;
      overflow: hidden;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    .metric-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .metric-title {
      font-size: 11.5px;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .metric-value {
      font-size: 24px;
      font-weight: 800;
      font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #0f172a;
    }
    .metric-sub {
      font-size: 11.5px;
      color: #94a3b8;
    }

    /* Glow / Accent classes */
    .cyber-glow-cyan { border-top: 3px solid #0284c7; }
    .cyber-glow-purple { border-top: 3px solid #7c3aed; }
    .cyber-glow-amber { border-top: 3px solid #d97706; }
    .cyber-glow-rose { border-top: 3px solid #dc2626; }
    .cyber-glow-emerald { border-top: 3px solid #16a34a; }

    .gradient-cyan {
      color: #0284c7;
    }
    .text-emerald { color: #16a34a; }

    /* Action Bar */
    .action-bar {
      padding: 14px 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 14px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
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
      min-width: 260px;
    }
    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: #94a3b8;
    }
    .search-box {
      padding-left: 36px !important;
      height: 38px;
      font-size: 13.5px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      color: #0f172a;
    }
    .filter-pills {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .pill-btn {
      padding: 6px 14px;
      border-radius: 20px;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      color: #475569;
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .pill-btn:hover {
      background: #e2e8f0;
      color: #0f172a;
    }
    .pill-btn.active {
      background: #2563eb;
      color: #ffffff;
      border-color: #2563eb;
      box-shadow: 0 1px 3px rgba(37, 99, 235, 0.3);
    }
    .action-buttons {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .view-toggle-group {
      display: flex;
      background: #f1f5f9;
      border-radius: 8px;
      padding: 3px;
      border: 1px solid #e2e8f0;
    }
    .toggle-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 6px;
      border: none;
      background: transparent;
      color: #64748b;
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }
    .toggle-btn.active {
      background: #ffffff;
      color: #2563eb;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    }

    /* Kanban Board */
    .kanban-board {
      display: grid;
      grid-template-columns: repeat(5, minmax(220px, 1fr));
      gap: 16px;
      align-items: flex-start;
      overflow-x: auto;
      padding-bottom: 12px;
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
      padding: 10px 14px;
      background: #f8fafc;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    .col-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
    }
    .stage-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .stage-draft { background: #94a3b8; }
    .stage-pending { background: #d97706; }
    .stage-approved { background: #16a34a; }
    .stage-portal { background: #0284c7; }
    .stage-won { background: #7c3aed; }

    .cards-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .deal-card {
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      transition: transform 0.18s, box-shadow 0.18s;
    }
    .deal-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 14px rgba(0, 0, 0, 0.08);
      border-color: #cbd5e1;
    }
    .highlight-warning { border-left: 3px solid #d97706; }
    .highlight-success { border-left: 3px solid #16a34a; }
    .highlight-purple { border-left: 3px solid #7c3aed; }

    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .card-id {
      font-size: 12px;
      color: #2563eb;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
    }
    .card-client {
      font-size: 14px;
      font-weight: 600;
      color: #0f172a;
      margin: 0;
    }
    .card-value {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
      font-family: 'JetBrains Mono', monospace;
    }
    .card-progress {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .progress-bar-bg {
      height: 5px;
      background: #e2e8f0;
      border-radius: 3px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      border-radius: 3px;
    }
    .progress-labels {
      display: flex;
      justify-content: space-between;
      font-size: 10.5px;
      color: #64748b;
    }
    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 4px;
      padding-top: 8px;
      border-top: 1px solid #f1f5f9;
    }
    .rep-tag {
      font-size: 11.5px;
      color: #64748b;
    }
    .empty-column-notice {
      padding: 20px 10px;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
      background: #f8fafc;
      border-radius: 8px;
      border: 1px dashed #e2e8f0;
    }

    /* Table Card */
    .table-card {
      padding: 0;
      overflow: hidden;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    .table-container {
      overflow-x: auto;
    }
    .table-custom {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 13.5px;
    }
    .table-custom th {
      padding: 12px 16px;
      font-size: 11.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      border-bottom: 1px solid #e2e8f0;
      background: #f8fafc;
      white-space: nowrap;
    }
    .sortable-th {
      cursor: pointer;
      user-select: none;
    }
    .sortable-th:hover {
      color: #0f172a;
      background: #f1f5f9;
    }
    .sort-icon {
      font-size: 10px;
      margin-left: 4px;
      color: #2563eb;
    }
    .table-custom td {
      padding: 12px 16px;
      border-bottom: 1px solid #f1f5f9;
      color: #0f172a;
    }
    .table-custom tbody tr:hover td {
      background: #f8fafc;
    }
    .quote-num {
      color: #2563eb;
      font-weight: 700;
      text-decoration: none;
      font-family: 'JetBrains Mono', monospace;
    }
    .quote-num:hover {
      text-decoration: underline;
    }
    .customer-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .tier-tag {
      font-size: 10px;
      padding: 2px 6px;
    }
    .row-actions {
      display: flex;
      gap: 6px;
    }
    .empty-state-box {
      padding: 30px;
      text-align: center;
      color: #64748b;
    }

    /* Table Pagination Bar */
    .table-pagination-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 18px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      flex-wrap: wrap;
      gap: 12px;
      font-size: 12.5px;
      color: #64748b;
    }
    .pagination-controls {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .page-size-selector {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .select-page-size {
      width: 60px;
      padding: 2px 6px;
      height: 28px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      background: #ffffff;
      color: #0f172a;
    }
    .page-nav-buttons {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .page-number-display {
      padding: 0 6px;
      font-weight: 600;
      color: #0f172a;
    }
    .btn-xs {
      padding: 3px 8px;
      font-size: 11px;
    }
  `]
})
export class PipelineComponent implements OnInit, OnDestroy {
  allQuotations: Quotation[] = [];
  quotations: Quotation[] = [];
  anomalies: DealHealthFlag[] = [];
  pendingCount = 0;

  currentRole = 'ADMIN';
  currentUserName = 'Administrator';
  viewMode: 'kanban' | 'table' = 'kanban';
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
      error: (err) => {
        console.error('Failed to load quotations from API', err);
        this.allQuotations = [];
        this.applyRbacFilter();
      }
    });

    this.healthService.getActiveFlags().subscribe({
      next: (flags) => {
        this.anomalies = flags || [];
      },
      error: (err) => {
        console.error('Failed to load deal health flags', err);
        this.anomalies = [];
      }
    });
  }

  applyRbacFilter(): void {
    // Backend already scopes by role, but frontend double-checks role filtering safely
    this.quotations = this.authService.filterQuotationsByRole(this.allQuotations);
    this.pendingCount = this.quotations.filter(q => q.status === 'PENDING_APPROVAL').length;
    this.currentPage = 1;
  }

  get rbacScopeDescription(): string {
    if (this.currentRole === 'ADMIN') {
      return 'Full Administrator View: Universal access to all enterprise opportunities across all teams.';
    }
    if (this.currentRole === 'SALES_REP') {
      return `Scoped to ${this.currentUserName}: Can view only assigned opportunities. Other representatives' deals are restricted.`;
    }
    if (this.currentRole === 'SALES_MANAGER') {
      return 'Sales Manager View: Overview of team pipelines and Level 1 governance approval requests.';
    }
    if (this.currentRole === 'FINANCE') {
      return 'Finance & Operations View: Filtered to deals requiring second-level risk review or pending fulfillment.';
    }
    if (this.currentRole === 'CUSTOMER') {
      return 'External Customer View: Scoped to your organization proposals with zero internal cost leakage.';
    }
    return 'Active Session';
  }

  get totalPipelineValue(): number {
    return this.quotations.reduce((sum, q) => sum + (q.totalAmount || 0), 0);
  }

  get averageMargin(): number {
    if (this.quotations.length === 0) return 0;
    const total = this.quotations.reduce((sum, q) => sum + this.getMargin(q), 0);
    return total / this.quotations.length;
  }

  getMargin(q: Quotation): number {
    return q.marginPct ?? q.marginPercentage ?? 0;
  }

  getDiscountPct(q: Quotation): number {
    if (q.blendedDiscountPct != null) return q.blendedDiscountPct;
    if (q.subtotalAmount && q.totalDiscountAmount) {
      return (q.totalDiscountAmount / q.subtotalAmount) * 100;
    }
    return 0;
  }

  getRiskScore(q: Quotation): number {
    return q.riskScore ?? q.blendedRiskScore ?? 0;
  }

  getRiskSeverity(q: Quotation): string {
    if (q.riskSeverity) return q.riskSeverity;
    const score = this.getRiskScore(q);
    if (score >= 60) return 'CRITICAL';
    if (score >= 35) return 'HIGH';
    if (score >= 15) return 'MEDIUM';
    return 'LOW';
  }

  getCustomerTierName(q: Quotation): string {
    if (q.customer?.tier && typeof q.customer.tier === 'object') {
      return (q.customer.tier as any).tierName || 'Standard';
    }
    if (typeof q.customer?.tier === 'string') {
      return q.customer.tier;
    }
    return 'Standard';
  }

  getStatusCount(status: string): number {
    if (status === 'NEGOTIATION') {
      return this.quotations.filter(q => q.status === 'UNDER_NEGOTIATION' || q.status === 'SENT_TO_CUSTOMER').length;
    }
    if (status === 'CONFIRMED') {
      return this.quotations.filter(q => q.status === 'CONFIRMED' || q.status === 'ACCEPTED').length;
    }
    return this.quotations.filter(q => q.status === status).length;
  }

  getQuotesByStage(stage: string): Quotation[] {
    if (stage === 'NEGOTIATION') {
      return this.quotations.filter(q => q.status === 'UNDER_NEGOTIATION' || q.status === 'SENT_TO_CUSTOMER');
    }
    if (stage === 'CONFIRMED') {
      return this.quotations.filter(q => q.status === 'CONFIRMED' || q.status === 'ACCEPTED');
    }
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
      let matchStatus = true;
      if (this.selectedStatus === 'ALL') {
        matchStatus = true;
      } else if (this.selectedStatus === 'NEGOTIATION') {
        matchStatus = q.status === 'UNDER_NEGOTIATION' || q.status === 'SENT_TO_CUSTOMER';
      } else if (this.selectedStatus === 'CONFIRMED') {
        matchStatus = q.status === 'CONFIRMED' || q.status === 'ACCEPTED';
      } else {
        matchStatus = q.status === this.selectedStatus;
      }

      const query = this.searchQuery.toLowerCase().trim();
      const matchSearch = !query ||
        (q.quoteNumber && q.quoteNumber.toLowerCase().includes(query)) ||
        (q.customer?.name && q.customer.name.toLowerCase().includes(query)) ||
        (q.salesRep?.name && q.salesRep.name.toLowerCase().includes(query));
      return matchStatus && matchSearch;
    });

    return qList.sort((a, b) => {
      let aVal: any = '';
      let bVal: any = '';

      switch (this.sortColumn) {
        case 'quoteNumber':
          aVal = a.quoteNumber || '';
          bVal = b.quoteNumber || '';
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
          aVal = a.subtotalAmount || a.totalAmount || 0;
          bVal = b.subtotalAmount || b.totalAmount || 0;
          break;
        case 'blendedDiscountPct':
          aVal = this.getDiscountPct(a);
          bVal = this.getDiscountPct(b);
          break;
        case 'marginPct':
          aVal = this.getMargin(a);
          bVal = this.getMargin(b);
          break;
        case 'riskSeverity':
          aVal = this.getRiskSeverity(a);
          bVal = this.getRiskSeverity(b);
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
