import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DealHealthService } from '../services/dealhealth.service';
import { AuthService } from '../services/auth.service';
import { DealHealthFlag, Quotation } from '../models/dealflow.model';
import { generate120HealthFlags, generate120Quotations } from '../services/mock-data';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-deal-health',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="health-container">
      <!-- Header Banner with Status Pills -->
      <div class="header-banner glass-panel">
        <div class="banner-title">
          <span class="radar-pulse">📡</span>
          <div>
            <h2>Deal Health & Anomaly Radar</h2>
            <p class="sub">Continuous background scanning for statistical discount outliers (Z-score &ge; 2.0), stalled pipelines (>7 days), and delivery promise slippages across 120+ enterprise accounts</p>
          </div>
        </div>
        <div class="header-actions">
          <div class="view-toggle-group">
            <button
              class="toggle-btn"
              [class.active]="viewMode === 'grid'"
              (click)="viewMode = 'grid'"
            >
              <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
              Table View (120+)
            </button>
            <button
              class="toggle-btn"
              [class.active]="viewMode === 'cards'"
              (click)="viewMode = 'cards'"
            >
              <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
              Radar Cards
            </button>
          </div>
        </div>
      </div>

      <!-- RBAC Info Banner -->
      <div class="glass-panel rbac-banner">
        <div class="rbac-left">
          <span class="role-icon">🛡️</span>
          <div>
            <div class="rbac-title">
              <span class="text-muted">Executive Oversight:</span>
              <strong class="text-cyan">{{ currentUserName }}</strong>
              <span class="badge ml-2" [class.badge-primary]="currentRole==='ADMIN'" [class.badge-warning]="currentRole==='SALES_MANAGER'" [class.badge-success]="currentRole==='FINANCE'">
                {{ currentRole }}
              </span>
            </div>
            <p class="rbac-subtext">
              Automated escalation triggers available. Sales Managers and Administrators can directly nudge account executives or escalate stalled opportunities to the VP desk.
            </p>
          </div>
        </div>
        <div class="rbac-right">
          <span class="badge badge-danger">
            {{ getCriticalCount() }} Critical Anomalies Active
          </span>
        </div>
      </div>

      <!-- Filter Controls Bar -->
      <div class="glass-panel filter-bar">
        <div class="search-box-wrapper">
          <svg class="search-icon" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><path d="M21 21l-4.35-4.35"></path></svg>
          <input
            type="text"
            class="form-control search-input"
            placeholder="Search anomalies by quote #, client, rep, or text..."
            [(ngModel)]="searchQuery"
            (input)="currentPage = 1"
          />
        </div>

        <div class="filter-pills">
          <button class="pill-btn" [class.active]="severityFilter === 'ALL'" (click)="severityFilter = 'ALL'; currentPage = 1">
            All Alerts ({{ allFlags.length }})
          </button>
          <button class="pill-btn" [class.active]="severityFilter === 'CRITICAL'" (click)="severityFilter = 'CRITICAL'; currentPage = 1">
            Critical ({{ getSeverityCount('CRITICAL') }})
          </button>
          <button class="pill-btn" [class.active]="severityFilter === 'HIGH'" (click)="severityFilter = 'HIGH'; currentPage = 1">
            High Risk ({{ getSeverityCount('HIGH') }})
          </button>
          <button class="pill-btn" [class.active]="severityFilter === 'MEDIUM'" (click)="severityFilter = 'MEDIUM'; currentPage = 1">
            Medium ({{ getSeverityCount('MEDIUM') }})
          </button>
          <button class="pill-btn" [class.active]="severityFilter === 'LOW'" (click)="severityFilter = 'LOW'; currentPage = 1">
            Low ({{ getSeverityCount('LOW') }})
          </button>
        </div>
      </div>

      <!-- VIEW 1: 120+ HIGH-DENSITY DATA GRID -->
      <div class="table-view" *ngIf="viewMode === 'grid'">
        <div class="glass-panel table-card">
          <div class="table-container">
            <table class="table-custom">
              <thead>
                <tr>
                  <th (click)="setSort('id')" class="sortable-th">
                    Alert ID <span class="sort-icon">{{ getSortIcon('id') }}</span>
                  </th>
                  <th (click)="setSort('quoteNumber')" class="sortable-th">
                    Quote # <span class="sort-icon">{{ getSortIcon('quoteNumber') }}</span>
                  </th>
                  <th (click)="setSort('customerName')" class="sortable-th">
                    Enterprise Client <span class="sort-icon">{{ getSortIcon('customerName') }}</span>
                  </th>
                  <th (click)="setSort('salesRep')" class="sortable-th">
                    Assigned Rep <span class="sort-icon">{{ getSortIcon('salesRep') }}</span>
                  </th>
                  <th (click)="setSort('flagType')" class="sortable-th">
                    Anomaly Detection Type <span class="sort-icon">{{ getSortIcon('flagType') }}</span>
                  </th>
                  <th (click)="setSort('severity')" class="sortable-th">
                    Severity <span class="sort-icon">{{ getSortIcon('severity') }}</span>
                  </th>
                  <th>Diagnostic Observation</th>
                  <th>Fast Remediation</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let f of paginatedFlags">
                  <td>
                    <span class="mono text-cyan font-bold">ALT-{{ 2026 }}-{{ f.id }}</span>
                  </td>
                  <td>
                    <a [routerLink]="['/dashboard/quote', f.quotation.id]" class="mono font-bold text-cyan" style="text-decoration: underline;">
                      {{ f.quotation.quoteNumber }}
                    </a>
                  </td>
                  <td>
                    <strong>{{ f.quotation.customer.name }}</strong>
                    <div class="text-muted" style="font-size: 11px;">Tier: {{ getTierName(f.quotation.customer.tier) }}</div>
                  </td>
                  <td>{{ f.quotation.salesRep.name }}</td>
                  <td>
                    <span class="font-medium">{{ f.flagType.replace('_', ' ') }}</span>
                  </td>
                  <td>
                    <span
                      class="badge"
                      [class.badge-danger]="f.severity === 'CRITICAL'"
                      [class.badge-warning]="f.severity === 'HIGH'"
                      [class.badge-info]="f.severity === 'MEDIUM'"
                      [class.badge-success]="f.severity === 'LOW'"
                    >
                      {{ f.severity }}
                    </span>
                  </td>
                  <td style="max-width: 380px;">
                    <span class="anomaly-snippet">{{ f.description }}</span>
                  </td>
                  <td>
                    <div class="action-btn-group">
                      <button class="btn btn-outline btn-xs" (click)="nudgeRep(f)">
                        Nudge Rep
                      </button>
                      <button class="btn btn-danger btn-xs" (click)="escalate(f)">
                        Escalate
                      </button>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="paginatedFlags.length === 0">
                  <td colspan="8" class="text-center py-4 text-muted">
                    No matching anomaly alerts found.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination Bar -->
          <div class="table-pagination-bar">
            <div class="pagination-info">
              Showing <strong>{{ paginationStartRecord }}</strong> to <strong>{{ paginationEndRecord }}</strong> of <strong>{{ filteredFlags.length }}</strong> anomalies
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

      <!-- VIEW 2: RADAR CARDS VIEW -->
      <div class="cards-view" *ngIf="viewMode === 'cards'">
        <div class="flags-grid">
          <div
            class="glass-panel flag-card"
            *ngFor="let f of paginatedFlags"
            [class.card-critical]="f.severity === 'CRITICAL'"
            [class.card-high]="f.severity === 'HIGH'"
          >
            <div class="flag-top">
              <div class="flag-type-badge">
                <span
                  class="badge"
                  [class.badge-danger]="f.severity === 'CRITICAL'"
                  [class.badge-warning]="f.severity === 'HIGH'"
                  [class.badge-info]="f.severity === 'MEDIUM'"
                  [class.badge-success]="f.severity === 'LOW'"
                >
                  {{ f.flagType.replace('_', ' ') }}
                </span>
                <span class="badge badge-neutral mono">{{ f.quotation.quoteNumber }}</span>
              </div>
              <span class="detected-at mono">{{ f.detectedAt | date:'short' }}</span>
            </div>

            <div class="flag-body mt-2">
              <h4>{{ f.quotation.customer.name }}</h4>
              <p class="flag-desc">{{ f.description }}</p>
              <div class="flag-meta">
                <span>Sales Rep: <strong>{{ f.quotation.salesRep.name }}</strong></span>
                <span>Value: <strong>{{ formatCurrency(f.quotation.totalAmount) }}</strong></span>
                <span>Margin: <strong>{{ f.quotation.marginPct | number:'1.1-1' }}%</strong></span>
              </div>
            </div>

            <div class="flag-actions mt-3">
              <button class="btn btn-outline btn-sm" (click)="nudgeRep(f)">
                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                Nudge Rep
              </button>
              <button class="btn btn-danger btn-sm" (click)="escalate(f)">
                Escalate to VP
              </button>
              <a [routerLink]="['/quote', f.quotation.id]" class="btn btn-primary btn-sm">
                Review Deal
              </a>
            </div>
          </div>
        </div>

        <!-- Pagination Bar for Cards -->
        <div class="glass-panel table-pagination-bar mt-3">
          <div class="pagination-info">
            Showing <strong>{{ paginationStartRecord }}</strong> to <strong>{{ paginationEndRecord }}</strong> of <strong>{{ filteredFlags.length }}</strong> anomalies
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
    .health-container {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .header-banner {
      padding: 18px 22px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
      border-left: 4px solid var(--danger);
    }
    .banner-title {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .radar-pulse { font-size: 32px; }
    .text-cyan { color: #38bdf8; }

    .view-toggle-group {
      display: flex;
      background: rgba(0, 0, 0, 0.4);
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
      transition: all 0.2s;
    }
    .toggle-btn.active {
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
    }

    /* RBAC Banner */
    .rbac-banner {
      padding: 14px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-left: 4px solid #ef4444;
      background: rgba(15, 23, 42, 0.7);
      flex-wrap: wrap;
      gap: 12px;
    }
    .rbac-left { display: flex; align-items: center; gap: 12px; }
    .role-icon { font-size: 24px; }
    .rbac-title { display: flex; align-items: center; gap: 8px; font-size: 14px; }
    .rbac-subtext { font-size: 12px; color: var(--text-sub); margin-top: 2px; }

    /* Filter Bar */
    .filter-bar {
      padding: 12px 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }
    .search-box-wrapper { position: relative; width: 320px; }
    .search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); }
    .search-input { padding-left: 34px; }
    .filter-pills { display: flex; gap: 6px; flex-wrap: wrap; }
    .pill-btn {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border-subtle);
      color: var(--text-sub);
      padding: 6px 14px;
      border-radius: var(--radius-full);
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .pill-btn.active, .pill-btn:hover {
      background: rgba(56, 189, 248, 0.15);
      border-color: rgba(56, 189, 248, 0.5);
      color: #38bdf8;
    }

    /* Table & Pagination */
    .table-card { padding: 0; overflow: hidden; }
    .table-container { overflow-x: auto; }
    .sortable-th { cursor: pointer; user-select: none; transition: background 0.2s; }
    .sortable-th:hover { background: rgba(56, 189, 248, 0.1); color: #38bdf8; }
    .sort-icon { font-size: 10px; margin-left: 4px; color: #38bdf8; }
    .anomaly-snippet { font-size: 12px; color: var(--text-sub); }
    .action-btn-group { display: flex; gap: 6px; }

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
    .pagination-info { font-size: 13px; color: var(--text-sub); }
    .pagination-controls { display: flex; align-items: center; gap: 16px; }
    .page-size-selector { display: flex; align-items: center; gap: 8px; font-size: 12px; }
    .select-page-size { width: 70px; padding: 4px 8px; font-size: 12px; }
    .page-nav-buttons { display: flex; align-items: center; gap: 6px; }
    .page-number-display { font-size: 12px; color: #fff; padding: 0 8px; font-weight: 600; }

    /* Cards Layout */
    .flags-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 16px;
    }
    .flag-card {
      padding: 18px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 12px;
    }
    .card-critical { border-left: 4px solid var(--danger); }
    .card-high { border-left: 4px solid var(--warning); }
    .flag-top { display: flex; justify-content: space-between; align-items: center; }
    .flag-type-badge { display: flex; align-items: center; gap: 8px; }
    .detected-at { font-size: 11px; color: var(--text-muted); }
    .flag-desc { font-size: 13px; color: var(--text-sub); margin-top: 6px; line-height: 1.4; }
    .flag-meta { display: flex; flex-wrap: wrap; gap: 12px; font-size: 12px; color: var(--text-muted); margin-top: 10px; border-top: 1px solid var(--border-subtle); padding-top: 8px; }
    .flag-actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .mt-2 { margin-top: 8px; }
    .mt-3 { margin-top: 14px; }
  `]
})
export class DealHealthComponent implements OnInit, OnDestroy {
  allFlags: DealHealthFlag[] = [];
  viewMode: 'grid' | 'cards' = 'grid';
  severityFilter = 'ALL';
  searchQuery = '';

  // Sort & Pagination
  sortColumn = 'id';
  sortDirection: 'asc' | 'desc' = 'asc';
  pageSize = 25;
  currentPage = 1;

  // RBAC
  currentRole = 'ADMIN';
  currentUserName = 'Md Sadique Amin (Admin)';

  private subs = new Subscription();

  constructor(
    private healthService: DealHealthService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const quotes = generate120Quotations();
    this.allFlags = generate120HealthFlags(quotes);

    this.subs.add(
      this.authService.currentRole$.subscribe(role => {
        this.currentRole = role;
      })
    );

    this.subs.add(
      this.authService.currentUser$.subscribe(user => {
        this.currentUserName = user.name;
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  getCriticalCount(): number {
    return this.allFlags.filter(f => f.severity === 'CRITICAL').length;
  }

  getSeverityCount(sev: string): number {
    return this.allFlags.filter(f => f.severity === sev).length;
  }

  nudgeRep(flag: DealHealthFlag): void {
    alert(`⚡ Automated Slack Nudge dispatched to ${flag.quotation.salesRep.name} regarding Deal ${flag.quotation.quoteNumber} (${flag.flagType}).`);
  }

  escalate(flag: DealHealthFlag): void {
    alert(`🚨 Escalation Triggered: Deal ${flag.quotation.quoteNumber} marked for emergency VP Review. Anomaly severity: ${flag.severity}.`);
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

  get filteredFlags(): DealHealthFlag[] {
    const list = this.allFlags.filter(f => {
      let matchSev = true;
      if (this.severityFilter !== 'ALL') {
        matchSev = f.severity === this.severityFilter;
      }
      const q = this.searchQuery.toLowerCase().trim();
      const matchSearch = !q ||
        f.quotation.quoteNumber.toLowerCase().includes(q) ||
        f.quotation.customer.name.toLowerCase().includes(q) ||
        f.quotation.salesRep.name.toLowerCase().includes(q) ||
        f.flagType.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q);

      return matchSev && matchSearch;
    });

    return list.sort((a, b) => {
      let aVal: any = '';
      let bVal: any = '';

      switch (this.sortColumn) {
        case 'id':
          aVal = a.id;
          bVal = b.id;
          break;
        case 'quoteNumber':
          aVal = a.quotation.quoteNumber;
          bVal = b.quotation.quoteNumber;
          break;
        case 'customerName':
          aVal = a.quotation.customer.name;
          bVal = b.quotation.customer.name;
          break;
        case 'salesRep':
          aVal = a.quotation.salesRep.name;
          bVal = b.quotation.salesRep.name;
          break;
        case 'flagType':
          aVal = a.flagType;
          bVal = b.flagType;
          break;
        case 'severity':
          aVal = a.severity;
          bVal = b.severity;
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
    return Math.ceil(this.filteredFlags.length / this.pageSize) || 1;
  }

  get paginatedFlags(): DealHealthFlag[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredFlags.slice(start, start + this.pageSize);
  }

  get paginationStartRecord(): number {
    if (this.filteredFlags.length === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get paginationEndRecord(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredFlags.length);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  formatCurrency(val: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val || 0);
  }

  getTierName(tier: any): string {
    if (!tier) return 'STANDARD';
    if (typeof tier === 'string') return tier;
    return tier.tierName || 'STANDARD';
  }
}
