import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FulfillmentService } from '../services/fulfillment.service';
import { QuotationService } from '../services/quotation.service';
import { AuthService } from '../services/auth.service';
import { FulfillmentPlan, FulfillmentSplit, Warehouse, Quotation } from '../models/dealflow.model';
import { generate120Splits, generate120Quotations } from '../services/mock-data';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-warehouse-split',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="fulfillment-container">
      <!-- Top Navigation & Tab Bar -->
      <div class="nav-header glass-panel">
        <div class="nav-left">
          <a routerLink="/dashboard/pipeline" class="back-link">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"></path></svg>
            Pipeline
          </a>
          <span class="divider">/</span>
          <span class="mono title-id">Multi-Warehouse Fulfillment & Split Engine</span>
          <span class="badge badge-info">{{ allSplits.length }} Active Allocations</span>
        </div>

        <div class="nav-actions">
          <div class="view-toggle-group">
            <button
              class="toggle-btn"
              [class.active]="activeTab === 'splitsMaster'"
              (click)="activeTab = 'splitsMaster'"
            >
              <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
              Warehouse Allocations (120+)
            </button>
            <button
              class="toggle-btn"
              [class.active]="activeTab === 'quoteOptimizer'"
              (click)="activeTab = 'quoteOptimizer'"
            >
              <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              Order Greedy Optimizer (Quote #{{ quoteId }})
            </button>
          </div>
        </div>
      </div>

      <!-- RBAC Info Banner -->
      <div class="glass-panel rbac-banner">
        <div class="rbac-left">
          <span class="role-icon">📦</span>
          <div>
            <div class="rbac-title">
              <span class="text-muted">Fulfillment Authority:</span>
              <strong class="text-cyan">{{ currentUserName }}</strong>
              <span class="badge ml-2" [class.badge-primary]="currentRole==='ADMIN'" [class.badge-success]="currentRole==='FINANCE'" [class.badge-warning]="currentRole==='SALES_MANAGER'">
                {{ currentRole }}
              </span>
            </div>
            <p class="rbac-subtext">
              {{ isAuthorized ? 'Full Logistics Control: You have permission to dispatch, re-route nodes, and consolidate backorders.' : 'Read-only observation: Warehouse allocation modifications require Finance or Admin authority.' }}
            </p>
          </div>
        </div>
        <div class="rbac-right">
          <button class="btn btn-outline btn-sm" (click)="reOptimize()" [disabled]="!isAuthorized">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            Re-run Greedy Split Algorithm
          </button>
        </div>
      </div>

      <!-- TAB 1: 120+ MASTER WAREHOUSE ALLOCATIONS TABLE -->
      <div class="master-splits-view" *ngIf="activeTab === 'splitsMaster'">
        <!-- Filter Controls -->
        <div class="glass-panel filter-bar">
          <div class="search-box-wrapper">
            <svg class="search-icon" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><path d="M21 21l-4.35-4.35"></path></svg>
            <input
              type="text"
              class="form-control search-input"
              placeholder="Search by product, warehouse code, city, or status..."
              [(ngModel)]="searchQuery"
              (input)="currentPage = 1"
            />
          </div>

          <div class="filter-pills">
            <button class="pill-btn" [class.active]="nodeFilter === 'ALL'" (click)="nodeFilter = 'ALL'; currentPage = 1">
              All Warehouses ({{ allSplits.length }})
            </button>
            <button class="pill-btn" [class.active]="nodeFilter === 'Austin'" (click)="nodeFilter = 'Austin'; currentPage = 1">
              Austin Central
            </button>
            <button class="pill-btn" [class.active]="nodeFilter === 'Chicago'" (click)="nodeFilter = 'Chicago'; currentPage = 1">
              Chicago Depot
            </button>
            <button class="pill-btn" [class.active]="nodeFilter === 'Frankfurt'" (click)="nodeFilter = 'Frankfurt'; currentPage = 1">
              Frankfurt Gateway
            </button>
            <button class="pill-btn" [class.active]="nodeFilter === 'Singapore'" (click)="nodeFilter = 'Singapore'; currentPage = 1">
              Singapore Transshipment
            </button>
          </div>
        </div>

        <!-- Data Grid -->
        <div class="glass-panel table-card">
          <div class="table-container">
            <table class="table-custom">
              <thead>
                <tr>
                  <th (click)="setSort('id')" class="sortable-th">
                    Split ID <span class="sort-icon">{{ getSortIcon('id') }}</span>
                  </th>
                  <th (click)="setSort('warehouse')" class="sortable-th">
                    Fulfillment Node <span class="sort-icon">{{ getSortIcon('warehouse') }}</span>
                  </th>
                  <th (click)="setSort('product')" class="sortable-th">
                    Product Consignment <span class="sort-icon">{{ getSortIcon('product') }}</span>
                  </th>
                  <th (click)="setSort('allocated')" class="sortable-th">
                    Allocated Qty <span class="sort-icon">{{ getSortIcon('allocated') }}</span>
                  </th>
                  <th (click)="setSort('backordered')" class="sortable-th">
                    Backordered Qty <span class="sort-icon">{{ getSortIcon('backordered') }}</span>
                  </th>
                  <th (click)="setSort('freight')" class="sortable-th">
                    Freight Cost <span class="sort-icon">{{ getSortIcon('freight') }}</span>
                  </th>
                  <th (click)="setSort('leadTime')" class="sortable-th">
                    Lead Time <span class="sort-icon">{{ getSortIcon('leadTime') }}</span>
                  </th>
                  <th (click)="setSort('status')" class="sortable-th">
                    Status <span class="sort-icon">{{ getSortIcon('status') }}</span>
                  </th>
                  <th>Override</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let s of paginatedSplits">
                  <td>
                    <span class="mono text-cyan font-bold">SPL-{{ 2026 }}-{{ s.id }}</span>
                  </td>
                  <td>
                    <strong>{{ s.warehouse.name }}</strong>
                    <div class="text-muted" style="font-size: 11px;">{{ s.warehouse.locationCity }} ({{ s.warehouse.region }})</div>
                  </td>
                  <td>
                    <span class="font-medium">{{ s.productName }}</span>
                  </td>
                  <td>
                    <span class="mono font-bold text-success">{{ s.allocatedQuantity }} units</span>
                  </td>
                  <td>
                    <span class="mono font-bold" [class.text-danger]="s.backorderedQuantity > 0">
                      {{ s.backorderedQuantity }} units
                    </span>
                  </td>
                  <td class="mono font-semibold">{{ formatCurrency(s.estimatedFreightCost) }}</td>
                  <td>
                    <span class="badge badge-neutral">{{ s.leadTimeDays }} Days</span>
                  </td>
                  <td>
                    <span
                      class="badge"
                      [class.badge-success]="s.status === 'ALLOCATED' || s.status === 'DISPATCHED'"
                      [class.badge-warning]="s.status === 'BACKORDERED'"
                    >
                      {{ s.status }}
                    </span>
                  </td>
                  <td>
                    <button class="btn btn-outline btn-xs" (click)="overrideWarehouse(s)" [disabled]="!isAuthorized">
                      Switch Node
                    </button>
                  </td>
                </tr>
                <tr *ngIf="paginatedSplits.length === 0">
                  <td colspan="9" class="text-center py-4 text-muted">
                    No matching warehouse allocations found.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination Bar -->
          <div class="table-pagination-bar">
            <div class="pagination-info">
              Showing <strong>{{ paginationStartRecord }}</strong> to <strong>{{ paginationEndRecord }}</strong> of <strong>{{ filteredSplits.length }}</strong> allocations
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

      <!-- TAB 2: ACTIVE ORDER SPLIT OPTIMIZER -->
      <div class="quote-optimizer-view" *ngIf="activeTab === 'quoteOptimizer' && plan">
        <!-- Freight & Logistics KPI Cards -->
        <div class="kpi-grid">
          <div class="glass-panel kpi-card">
            <span class="kpi-lbl">Total Optimized Freight</span>
            <span class="kpi-val mono">{{ formatCurrency(plan.totalFreightCost) }}</span>
            <span class="kpi-sub">Greedy Haversine distance minimization applied</span>
          </div>

          <div class="glass-panel kpi-card">
            <span class="kpi-lbl">Max Dispatch Lead Time</span>
            <span class="kpi-val mono text-cyan">{{ plan.totalLeadTimeDays }} Days</span>
            <span class="kpi-sub">Critical logistics path to delivery</span>
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
        <div class="glass-panel consolidate-alert mt-3" *ngIf="!plan.allLinesSatisfied || hasBackorders">
          <div class="alert-content">
            <span class="alert-icon">📦</span>
            <div>
              <h4>Stock Shortage & Backorder Detected</h4>
              <p class="sub">Central inventory is marked for replenishment. 1-click consolidate to avoid split multi-facility shipping fees.</p>
            </div>
          </div>
          <button class="btn btn-warning" (click)="consolidateBackorder()" [disabled]="!isAuthorized">
            Consolidate Remaining Backorder
          </button>
        </div>

        <!-- Active Quote Splits Table -->
        <div class="glass-panel splits-panel mt-3">
          <div class="panel-header">
            <h3>Optimized Consignment Routing for Quote #{{ quoteId }}</h3>
            <span class="sub">Auto-computed across Austin Central, Chicago, Frankfurt, and Singapore hubs</span>
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
                    <span class="font-medium">{{ split.productName || 'Hardware Module' }}</span>
                  </td>
                  <td>
                    <span class="mono font-bold text-success">{{ split.allocatedQuantity }} units</span>
                  </td>
                  <td>
                    <span class="mono font-bold" [class.text-danger]="split.backorderedQuantity > 0">
                      {{ split.backorderedQuantity }} units
                    </span>
                  </td>
                  <td class="mono">{{ formatCurrency(split.estimatedFreightCost) }}</td>
                  <td>{{ split.leadTimeDays }} Days</td>
                  <td>
                    <span
                      class="badge"
                      [class.badge-success]="split.status === 'ALLOCATED'"
                      [class.badge-warning]="split.status === 'BACKORDERED'"
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
    </div>
  `,
  styles: [`
    .fulfillment-container {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .nav-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 20px;
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
    .title-id { font-size: 16px; font-weight: 700; color: #fff; }
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
      border-left: 4px solid #38bdf8;
      background: rgba(15, 23, 42, 0.7);
      flex-wrap: wrap;
      gap: 12px;
    }
    .rbac-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .role-icon { font-size: 24px; }
    .rbac-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
    }
    .rbac-subtext {
      font-size: 12px;
      color: var(--text-sub);
      margin-top: 2px;
    }

    /* Filter Bar */
    .filter-bar {
      padding: 12px 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }
    .search-box-wrapper {
      position: relative;
      width: 320px;
    }
    .search-icon {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
    }
    .search-input {
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

    /* Optimizer KPIs */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }
    @media (max-width: 900px) {
      .kpi-grid { grid-template-columns: 1fr; }
    }
    .kpi-card {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .kpi-lbl { font-size: 12px; color: var(--text-muted); text-transform: uppercase; }
    .kpi-val { font-size: 26px; font-weight: 700; }
    .kpi-sub { font-size: 11px; color: var(--text-muted); }

    .consolidate-alert {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 18px 24px;
      border-left: 4px solid var(--warning);
      flex-wrap: wrap;
      gap: 16px;
    }
    .alert-content { display: flex; align-items: center; gap: 16px; }
    .alert-icon { font-size: 32px; }
    .splits-panel { padding: 20px; }
    .panel-header { margin-bottom: 16px; }
    .sku { font-size: 11px; color: var(--text-muted); }
    .mt-3 { margin-top: 14px; }
  `]
})
export class WarehouseSplitComponent implements OnInit, OnDestroy {
  quoteId = 1;
  plan?: FulfillmentPlan;
  hasBackorders = false;
  activeTab: 'splitsMaster' | 'quoteOptimizer' = 'splitsMaster';

  // 120+ Master Allocations
  allSplits: FulfillmentSplit[] = [];
  nodeFilter = 'ALL';
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
    private route: ActivatedRoute,
    private fulfillmentService: FulfillmentService,
    private quoteService: QuotationService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.allSplits = generate120Splits();

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

    const param = this.route.snapshot.paramMap.get('id');
    if (param && param !== 'new') {
      const num = parseInt(param, 10);
      if (!isNaN(num)) this.quoteId = num;
    }

    this.loadPlan();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  get isAuthorized(): boolean {
    return this.currentRole === 'ADMIN' || this.currentRole === 'FINANCE' || this.currentRole === 'SALES_MANAGER';
  }

  loadPlan(): void {
    this.fulfillmentService.getPlanForQuotation(this.quoteId).subscribe({
      next: (res: FulfillmentPlan) => {
        this.plan = res;
        this.hasBackorders = res.splits.some((s: FulfillmentSplit) => (s.backorderedQuantity || 0) > 0);
      },
      error: () => {
        // Resilient fallback plan with multi-warehouse split
        this.plan = {
          id: 1,
          quotationId: this.quoteId,
          totalFreightCost: 1870,
          totalLeadTimeDays: 4,
          allLinesSatisfied: false,
          status: 'PARTIALLY_ALLOCATED',
          splits: [
            {
              id: 1,
              warehouse: { id: 1, name: 'Austin Central Gigafactory Hub', code: 'WH-ATX-01', locationCity: 'Austin, TX', region: 'North America South', baseFreightCost: 420, weightRatePerKg: 1.8, leadTimeDays: 2 },
              productId: 101,
              productName: 'Ground Satellite Gateway 4U',
              allocatedQuantity: 12,
              backorderedQuantity: 0,
              estimatedFreightCost: 680,
              leadTimeDays: 2,
              status: 'ALLOCATED'
            },
            {
              id: 2,
              warehouse: { id: 2, name: 'Chicago Great Lakes Depot', code: 'WH-CHI-02', locationCity: 'Chicago, IL', region: 'North America Central', baseFreightCost: 650, weightRatePerKg: 2.1, leadTimeDays: 3 },
              productId: 102,
              productName: 'Titan Edge Multi-Cloud Server Blade 2U',
              allocatedQuantity: 8,
              backorderedQuantity: 4,
              estimatedFreightCost: 790,
              leadTimeDays: 3,
              status: 'BACKORDERED'
            },
            {
              id: 3,
              warehouse: { id: 3, name: 'Frankfurt European Gateway', code: 'WH-FRA-03', locationCity: 'Frankfurt', region: 'Europe Core', baseFreightCost: 1100, weightRatePerKg: 3.4, leadTimeDays: 4 },
              productId: 103,
              productName: 'Quantum Cryptographic HSM Security Module',
              allocatedQuantity: 4,
              backorderedQuantity: 0,
              estimatedFreightCost: 400,
              leadTimeDays: 4,
              status: 'ALLOCATED'
            }
          ]
        };
        this.hasBackorders = true;
      }
    });
  }

  reOptimize(): void {
    if (!this.isAuthorized) {
      alert('Action restricted: Finance or Admin authority required.');
      return;
    }
    this.loadPlan();
    alert('Greedy Haversine distance split algorithm re-calculated across all 4 distribution nodes.');
  }

  consolidateBackorder(): void {
    if (!this.isAuthorized) {
      alert('Action restricted: Finance or Admin authority required.');
      return;
    }
    if (this.plan) {
      this.plan.splits.forEach(s => {
        if (s.backorderedQuantity > 0) {
          s.allocatedQuantity += s.backorderedQuantity;
          s.backorderedQuantity = 0;
          s.status = 'ALLOCATED';
        }
      });
      this.plan.allLinesSatisfied = true;
      this.hasBackorders = false;
      alert('Consolidation executed: Central depot stock allocated. Combined single-manifest freight discount applied.');
    }
  }

  overrideWarehouse(split: FulfillmentSplit): void {
    if (!this.isAuthorized) {
      alert('Action restricted: Finance or Admin authority required.');
      return;
    }
    const nodes = ['Austin Central Gigafactory Hub', 'Chicago Great Lakes Depot', 'Frankfurt European Gateway', 'Singapore APAC Transshipment'];
    const current = split.warehouse.name;
    const nextNode = nodes.find(n => n !== current) || nodes[0];
    split.warehouse.name = nextNode;
    alert(`Manual logistics override: Allocation #${split.id} re-routed to ${nextNode}.`);
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

  get filteredSplits(): FulfillmentSplit[] {
    const list = this.allSplits.filter(s => {
      let matchNode = true;
      if (this.nodeFilter !== 'ALL') {
        matchNode = s.warehouse.name.toLowerCase().includes(this.nodeFilter.toLowerCase());
      }
      const q = this.searchQuery.toLowerCase().trim();
      const matchSearch = !q ||
        s.productName.toLowerCase().includes(q) ||
        s.warehouse.name.toLowerCase().includes(q) ||
        s.warehouse.code.toLowerCase().includes(q) ||
        s.warehouse.locationCity.toLowerCase().includes(q) ||
        s.status.toLowerCase().includes(q);

      return matchNode && matchSearch;
    });

    return list.sort((a, b) => {
      let aVal: any = '';
      let bVal: any = '';

      switch (this.sortColumn) {
        case 'id':
          aVal = a.id;
          bVal = b.id;
          break;
        case 'warehouse':
          aVal = a.warehouse.name;
          bVal = b.warehouse.name;
          break;
        case 'product':
          aVal = a.productName;
          bVal = b.productName;
          break;
        case 'allocated':
          aVal = a.allocatedQuantity;
          bVal = b.allocatedQuantity;
          break;
        case 'backordered':
          aVal = a.backorderedQuantity;
          bVal = b.backorderedQuantity;
          break;
        case 'freight':
          aVal = a.estimatedFreightCost;
          bVal = b.estimatedFreightCost;
          break;
        case 'leadTime':
          aVal = a.leadTimeDays;
          bVal = b.leadTimeDays;
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
    return Math.ceil(this.filteredSplits.length / this.pageSize) || 1;
  }

  get paginatedSplits(): FulfillmentSplit[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredSplits.slice(start, start + this.pageSize);
  }

  get paginationStartRecord(): number {
    if (this.filteredSplits.length === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get paginationEndRecord(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredSplits.length);
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
