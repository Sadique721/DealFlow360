import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { SubscriptionContract, Quotation } from '../models/dealflow.model';
import { generate120Subscriptions, generate120Quotations } from '../services/mock-data';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-subscription-billing',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="sub-container">
      <!-- Header Banner with Tabs -->
      <div class="header-banner glass-panel">
        <div class="banner-title">
          <span class="sub-icon">🔄</span>
          <div>
            <h2>Subscription Proration & Hybrid Billing Engine</h2>
            <p class="sub">Unified Capex/Opex management with day-based mid-cycle proration math, automated credit notes, and 120+ active contracts</p>
          </div>
        </div>

        <div class="header-actions">
          <div class="view-toggle-group">
            <button
              class="toggle-btn"
              [class.active]="activeTab === 'contractsMaster'"
              (click)="activeTab = 'contractsMaster'"
            >
              <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              Contracts Master (120+)
            </button>
            <button
              class="toggle-btn"
              [class.active]="activeTab === 'prorationSim'"
              (click)="activeTab = 'prorationSim'"
            >
              <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>
              Proration Simulator
            </button>
          </div>
        </div>
      </div>

      <!-- RBAC Authority Banner -->
      <div class="glass-panel rbac-banner">
        <div class="rbac-left">
          <span class="role-icon">💰</span>
          <div>
            <div class="rbac-title">
              <span class="text-muted">Subscription Controller:</span>
              <strong class="text-cyan">{{ currentUserName }}</strong>
              <span class="badge ml-2" [class.badge-primary]="currentRole==='ADMIN'" [class.badge-success]="currentRole==='FINANCE'" [class.badge-warning]="currentRole==='SALES_MANAGER'">
                {{ currentRole }}
              </span>
            </div>
            <p class="rbac-subtext">
              {{ isAuthorized ? 'Full Billing Authority: You have permission to issue credit notes, approve proration adjustments, and cancel contracts.' : 'Read-only observation: Contract modification and credit note issuance require Finance or Admin authority.' }}
            </p>
          </div>
        </div>
        <div class="rbac-right">
          <span class="badge badge-purple" style="font-size: 12px; padding: 6px 12px;">
            Total MRR: {{ formatCurrency(totalMrr) }}
          </span>
        </div>
      </div>

      <!-- TAB 1: 120+ CONTRACTS MASTER GRID -->
      <div class="contracts-master-view" *ngIf="activeTab === 'contractsMaster'">
        <!-- Filter Bar -->
        <div class="glass-panel filter-bar">
          <div class="search-box-wrapper">
            <svg class="search-icon" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><path d="M21 21l-4.35-4.35"></path></svg>
            <input
              type="text"
              class="form-control search-input"
              placeholder="Search contracts by customer, contract #, or plan..."
              [(ngModel)]="searchQuery"
              (input)="currentPage = 1"
            />
          </div>

          <div class="filter-pills">
            <button class="pill-btn" [class.active]="statusFilter === 'ALL'" (click)="statusFilter = 'ALL'; currentPage = 1">
              All Contracts ({{ allContracts.length }})
            </button>
            <button class="pill-btn" [class.active]="statusFilter === 'ACTIVE'" (click)="statusFilter = 'ACTIVE'; currentPage = 1">
              Active ({{ getStatusCount('ACTIVE') }})
            </button>
            <button class="pill-btn" [class.active]="statusFilter === 'PENDING_PRORATION'" (click)="statusFilter = 'PENDING_PRORATION'; currentPage = 1">
              Pending Proration ({{ getStatusCount('PENDING_PRORATION') }})
            </button>
            <button class="pill-btn" [class.active]="statusFilter === 'RENEWING'" (click)="statusFilter = 'RENEWING'; currentPage = 1">
              Renewing ({{ getStatusCount('RENEWING') }})
            </button>
          </div>
        </div>

        <!-- Table Card -->
        <div class="glass-panel table-card">
          <div class="table-container">
            <table class="table-custom">
              <thead>
                <tr>
                  <th (click)="setSort('contractNumber')" class="sortable-th">
                    Contract # <span class="sort-icon">{{ getSortIcon('contractNumber') }}</span>
                  </th>
                  <th (click)="setSort('customerName')" class="sortable-th">
                    Enterprise Customer <span class="sort-icon">{{ getSortIcon('customerName') }}</span>
                  </th>
                  <th (click)="setSort('planName')" class="sortable-th">
                    Subscription Plan <span class="sort-icon">{{ getSortIcon('planName') }}</span>
                  </th>
                  <th (click)="setSort('frequency')" class="sortable-th">
                    Cadence <span class="sort-icon">{{ getSortIcon('frequency') }}</span>
                  </th>
                  <th (click)="setSort('seats')" class="sortable-th">
                    Active Seats <span class="sort-icon">{{ getSortIcon('seats') }}</span>
                  </th>
                  <th (click)="setSort('mrr')" class="sortable-th">
                    MRR <span class="sort-icon">{{ getSortIcon('mrr') }}</span>
                  </th>
                  <th (click)="setSort('acv')" class="sortable-th">
                    Annual ACV <span class="sort-icon">{{ getSortIcon('acv') }}</span>
                  </th>
                  <th (click)="setSort('renewal')" class="sortable-th">
                    Next Renewal <span class="sort-icon">{{ getSortIcon('renewal') }}</span>
                  </th>
                  <th (click)="setSort('status')" class="sortable-th">
                    Status <span class="sort-icon">{{ getSortIcon('status') }}</span>
                  </th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let c of paginatedContracts">
                  <td>
                    <span class="mono text-cyan font-bold">{{ c.contractNumber }}</span>
                  </td>
                  <td>
                    <strong>{{ c.customerName }}</strong>
                    <div class="badge badge-neutral tier-tag">{{ c.customerTier }}</div>
                  </td>
                  <td>
                    <span class="font-medium">{{ c.planName }}</span>
                  </td>
                  <td>
                    <span class="badge badge-neutral">{{ c.billingFrequency }}</span>
                  </td>
                  <td class="mono font-bold">{{ c.seatsCount }} users</td>
                  <td class="mono font-bold text-success">{{ formatCurrency(c.monthlyRecurringRevenue) }}</td>
                  <td class="mono font-semibold">{{ formatCurrency(c.annualContractValue) }}</td>
                  <td class="mono" style="font-size: 11px;">{{ c.nextRenewalDate }}</td>
                  <td>
                    <span
                      class="badge"
                      [class.badge-success]="c.status === 'ACTIVE'"
                      [class.badge-warning]="c.status === 'PENDING_PRORATION'"
                      [class.badge-info]="c.status === 'RENEWING'"
                      [class.badge-danger]="c.status === 'IN_GRACE' || c.status === 'CANCELLED'"
                    >
                      {{ c.status.replace('_', ' ') }}
                    </span>
                  </td>
                  <td>
                    <button class="btn btn-outline btn-xs" (click)="simulateForContract(c)">
                      Prorate
                    </button>
                  </td>
                </tr>
                <tr *ngIf="paginatedContracts.length === 0">
                  <td colspan="10" class="text-center py-4 text-muted">
                    No matching subscription contracts found.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination Bar -->
          <div class="table-pagination-bar">
            <div class="pagination-info">
              Showing <strong>{{ paginationStartRecord }}</strong> to <strong>{{ paginationEndRecord }}</strong> of <strong>{{ filteredContracts.length }}</strong> subscription contracts
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

      <!-- TAB 2: PRORATION SIMULATOR -->
      <div class="proration-sim-view" *ngIf="activeTab === 'prorationSim'">
        <div class="sub-grid">
          <!-- Left Column: Active Subscription & Simulator -->
          <div class="main-col">
            <!-- Active Plan Card -->
            <div class="glass-panel plan-card">
              <div class="plan-header">
                <div>
                  <span class="badge badge-purple">Enterprise Cloud Tier</span>
                  <h3 class="mt-2">{{ selectedCustomerName }}</h3>
                  <span class="sub mono">Contract ID: {{ selectedContractNumber }}</span>
                </div>
                <span class="badge badge-success">Active & Invoiced</span>
              </div>

              <div class="plan-metrics mt-4">
                <div class="p-metric">
                  <span class="lbl">Current Seats</span>
                  <span class="val mono">{{ currentSeats }} Users</span>
                </div>
                <div class="p-metric">
                  <span class="lbl">Monthly Base Price</span>
                  <span class="val mono">{{ formatCurrency(seatPrice) }} / seat</span>
                </div>
                <div class="p-metric">
                  <span class="lbl">Current Monthly Total</span>
                  <span class="val mono text-cyan">{{ formatCurrency(currentSeats * seatPrice) }}</span>
                </div>
                <div class="p-metric">
                  <span class="lbl">Billing Frequency</span>
                  <span class="badge badge-neutral">Monthly (1st of month)</span>
                </div>
              </div>
            </div>

            <!-- Mid-Cycle Proration Calculator Simulator -->
            <div class="glass-panel sim-card mt-3">
              <h3>Mid-Cycle Seat / Plan Modification Simulator</h3>
              <p class="sub">Simulate adding seats or downgrading halfway through the 30-day billing cycle</p>

              <div class="sim-controls mt-4">
                <div class="form-group">
                  <label class="form-label">New Target Seat Count</label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    class="form-control"
                    [(ngModel)]="targetSeats"
                    (input)="calculateProration()"
                  />
                </div>

                <div class="form-group">
                  <label class="form-label">Effective Change Day of Cycle (Day 1 - 30)</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    class="form-control"
                    [(ngModel)]="effectiveDay"
                    (input)="calculateProration()"
                  />
                </div>
              </div>

              <!-- Transparent Math Formula Card -->
              <div class="math-breakdown-card mt-3">
                <div class="math-title">
                  <span>🧮 Transparent Day-Based Proration Formula</span>
                  <span class="badge badge-info">{{ daysRemaining }} of 30 Days ({{ prorationPct | number:'1.1-1' }}%)</span>
                </div>
                <div class="formula-box mono">
                  Adjustment = (&Delta;Seats &times; Price) &times; (Days Remaining / 30)
                </div>
                <div class="formula-calc mono mt-2">
                  = ({{ targetSeats - currentSeats }} seats &times; {{ formatCurrency(seatPrice) }}) &times; ({{ daysRemaining }} / 30) =
                  <strong [class.text-success]="prorationAmount >= 0" [class.text-danger]="prorationAmount < 0">
                    {{ formatCurrency(prorationAmount) }}
                  </strong>
                </div>
              </div>

              <!-- Proration Impact Summary -->
              <div class="sim-summary mt-3">
                <div class="summary-row">
                  <span>Net Prorated Adjustment for Current Cycle:</span>
                  <strong class="mono text-cyan" style="font-size: 18px;">
                    {{ formatCurrency(prorationAmount) }}
                  </strong>
                </div>
                <div class="summary-row">
                  <span>Next Regular Monthly Invoice (at {{ targetSeats }} seats):</span>
                  <strong class="mono">{{ formatCurrency(targetSeats * seatPrice) }} / mo</strong>
                </div>
                <div class="summary-row" *ngIf="prorationAmount < 0">
                  <span class="text-warning">Credit Note Generated:</span>
                  <span class="badge badge-warning mono">CREDIT-NOTE-{{ 2026 }}-{{ Math.abs(Math.round(prorationAmount)) }}</span>
                </div>
              </div>

              <div class="sim-actions mt-3">
                <button class="btn btn-primary" (click)="applyProration()" [disabled]="!isAuthorized">
                  Apply Proration & Update Contract
                </button>
                <button class="btn btn-outline" (click)="resetProration()">
                  Reset to Base
                </button>
              </div>
            </div>
          </div>

          <!-- Right Column: Hybrid Order View -->
          <div class="side-col">
            <div class="glass-panel hybrid-card">
              <h4>Unified Hybrid Order Structure</h4>
              <p class="sub">Separates upfront Capex hardware lines from ongoing Opex subscription services</p>

              <div class="hybrid-section mt-3">
                <div class="h-sec-title">
                  <span>Hardware & Capital Equipment (Capex)</span>
                  <span class="badge badge-neutral">One-Time</span>
                </div>
                <div class="h-line">
                  <span>Ground Satellite Gateway 4U</span>
                  <span class="mono">$12,500.00</span>
                </div>
                <div class="h-line">
                  <span>Titan Edge Blade 2U &times; 2</span>
                  <span class="mono">$16,800.00</span>
                </div>
                <div class="h-subtotal">
                  <span>One-Time Invoiced Capex:</span>
                  <strong class="mono text-emerald">$29,300.00</strong>
                </div>
              </div>

              <div class="hybrid-section mt-4">
                <div class="h-sec-title">
                  <span>Cloud & AI Subscriptions (Opex)</span>
                  <span class="badge badge-purple">Recurring</span>
                </div>
                <div class="h-line">
                  <span>Autonomous CPQ AI Governance</span>
                  <span class="mono">{{ formatCurrency(targetSeats * seatPrice) }}/mo</span>
                </div>
                <div class="h-subtotal">
                  <span>Monthly Recurring Total:</span>
                  <strong class="mono text-cyan">{{ formatCurrency(targetSeats * seatPrice) }}/mo</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .sub-container {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .header-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 22px;
      flex-wrap: wrap;
      gap: 14px;
    }
    .banner-title {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .sub-icon { font-size: 32px; }
    .text-cyan { color: #38bdf8; }
    .text-emerald { color: #00dfa2; }

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
      border-left: 4px solid #10b981;
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
    .tier-tag { font-size: 9px; }

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

    /* Simulator Grid */
    .sub-grid {
      display: grid;
      grid-template-columns: 1fr 360px;
      gap: 16px;
    }
    @media (max-width: 1024px) {
      .sub-grid { grid-template-columns: 1fr; }
    }
    .main-col, .side-col { display: flex; flex-direction: column; gap: 16px; }
    .plan-card, .sim-card, .hybrid-card { padding: 20px; }
    .plan-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .plan-metrics {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      padding: 14px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: var(--radius-sm);
    }
    .p-metric { display: flex; flex-direction: column; gap: 4px; }
    .lbl { font-size: 11px; color: var(--text-muted); text-transform: uppercase; }
    .val { font-size: 18px; font-weight: 700; }

    .sim-controls {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 14px;
    }
    .math-breakdown-card {
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 14px;
    }
    .math-title {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .formula-box {
      font-size: 12px;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.08);
      padding: 8px;
      border-radius: 4px;
    }
    .formula-calc { font-size: 13px; }
    .sim-summary {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 14px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: var(--radius-sm);
    }
    .summary-row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
    .sim-actions { display: flex; gap: 12px; }

    .hybrid-section {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 14px;
    }
    .h-sec-title { display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: 700; margin-bottom: 10px; }
    .h-line { display: flex; justify-content: space-between; font-size: 12px; padding: 4px 0; color: var(--text-sub); }
    .h-subtotal { display: flex; justify-content: space-between; font-size: 13px; border-top: 1px solid var(--border-subtle); padding-top: 8px; margin-top: 6px; }
    .mt-2 { margin-top: 8px; }
    .mt-3 { margin-top: 14px; }
    .mt-4 { margin-top: 18px; }
  `]
})
export class SubscriptionBillingComponent implements OnInit, OnDestroy {
  Math = Math;
  activeTab: 'contractsMaster' | 'prorationSim' = 'contractsMaster';

  // 120+ Master Contracts
  allContracts: SubscriptionContract[] = [];
  statusFilter = 'ALL';
  searchQuery = '';

  // Sort & Pagination
  sortColumn = 'mrr';
  sortDirection: 'asc' | 'desc' = 'desc';
  pageSize = 25;
  currentPage = 1;

  // Simulator Model State
  selectedCustomerName = 'Zenith Systems Global';
  selectedContractNumber = 'SUB-8821-ZENITH';
  currentSeats = 45;
  targetSeats = 60;
  seatPrice = 185;
  effectiveDay = 15;
  daysRemaining = 15;
  prorationPct = 50;
  prorationAmount = 1387.5;

  // RBAC
  currentRole = 'ADMIN';
  currentUserName = 'Md Sadique Amin (Admin)';

  private subs = new Subscription();

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    const quotes = generate120Quotations();
    this.allContracts = generate120Subscriptions(quotes);

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

    this.calculateProration();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  get isAuthorized(): boolean {
    return this.currentRole === 'ADMIN' || this.currentRole === 'FINANCE' || this.currentRole === 'SALES_MANAGER';
  }

  get totalMrr(): number {
    return this.allContracts.reduce((sum, c) => sum + (c.monthlyRecurringRevenue || 0), 0);
  }

  getStatusCount(status: string): number {
    return this.allContracts.filter(c => c.status === status).length;
  }

  calculateProration(): void {
    this.daysRemaining = Math.max(0, 30 - this.effectiveDay);
    this.prorationPct = (this.daysRemaining / 30) * 100;
    const seatDelta = this.targetSeats - this.currentSeats;
    this.prorationAmount = (seatDelta * this.seatPrice) * (this.daysRemaining / 30);
  }

  simulateForContract(contract: SubscriptionContract): void {
    this.selectedCustomerName = contract.customerName;
    this.selectedContractNumber = contract.contractNumber;
    this.currentSeats = contract.seatsCount;
    this.targetSeats = contract.seatsCount + 10;
    this.seatPrice = contract.unitSeatPrice;
    this.effectiveDay = 15;
    this.calculateProration();
    this.activeTab = 'prorationSim';
  }

  applyProration(): void {
    if (!this.isAuthorized) {
      alert('Action restricted: Finance authority required to commit proration adjustments.');
      return;
    }
    const matched = this.allContracts.find(c => c.contractNumber === this.selectedContractNumber);
    if (matched) {
      matched.seatsCount = this.targetSeats;
      matched.monthlyRecurringRevenue = this.targetSeats * this.seatPrice;
      matched.annualContractValue = matched.monthlyRecurringRevenue * 12;
      matched.status = 'ACTIVE';
    }
    this.currentSeats = this.targetSeats;
    this.calculateProration();
    alert(`Proration executed: Contract ${this.selectedContractNumber} updated to ${this.targetSeats} seats. Net billing adjustment: ${this.formatCurrency(this.prorationAmount)}.`);
  }

  resetProration(): void {
    this.targetSeats = this.currentSeats;
    this.effectiveDay = 15;
    this.calculateProration();
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

  get filteredContracts(): SubscriptionContract[] {
    const list = this.allContracts.filter(c => {
      let matchStatus = true;
      if (this.statusFilter !== 'ALL') {
        matchStatus = c.status === this.statusFilter;
      }
      const q = this.searchQuery.toLowerCase().trim();
      const matchSearch = !q ||
        c.contractNumber.toLowerCase().includes(q) ||
        c.customerName.toLowerCase().includes(q) ||
        c.planName.toLowerCase().includes(q) ||
        c.billingFrequency.toLowerCase().includes(q);

      return matchStatus && matchSearch;
    });

    return list.sort((a, b) => {
      let aVal: any = '';
      let bVal: any = '';

      switch (this.sortColumn) {
        case 'contractNumber':
          aVal = a.contractNumber;
          bVal = b.contractNumber;
          break;
        case 'customerName':
          aVal = a.customerName;
          bVal = b.customerName;
          break;
        case 'planName':
          aVal = a.planName;
          bVal = b.planName;
          break;
        case 'frequency':
          aVal = a.billingFrequency;
          bVal = b.billingFrequency;
          break;
        case 'seats':
          aVal = a.seatsCount;
          bVal = b.seatsCount;
          break;
        case 'mrr':
          aVal = a.monthlyRecurringRevenue;
          bVal = b.monthlyRecurringRevenue;
          break;
        case 'acv':
          aVal = a.annualContractValue;
          bVal = b.annualContractValue;
          break;
        case 'renewal':
          aVal = a.nextRenewalDate;
          bVal = b.nextRenewalDate;
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
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
    return Math.ceil(this.filteredContracts.length / this.pageSize) || 1;
  }

  get paginatedContracts(): SubscriptionContract[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredContracts.slice(start, start + this.pageSize);
  }

  get paginationStartRecord(): number {
    if (this.filteredContracts.length === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get paginationEndRecord(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredContracts.length);
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
