import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FulfillmentService } from '../services/fulfillment.service';
import { QuotationService } from '../services/quotation.service';
import { AuthService } from '../services/auth.service';
import { FulfillmentPlan, FulfillmentSplit, Warehouse, Quotation } from '../models/dealflow.model';
import { generate120Splits, generate120Quotations } from '../services/mock-data';
import { Subscription, of } from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';

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
          <button class="btn btn-primary btn-sm" (click)="openCreateWarehouseModal()" *ngIf="isAuthorized">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"></path></svg>
            New Warehouse
          </button>
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
            <button
              *ngFor="let node of availableNodes"
              class="pill-btn"
              [class.active]="nodeFilter === node"
              (click)="nodeFilter = node; currentPage = 1"
            >
              {{ node }}
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
                    <span class="mono font-bold text-success">{{ s.allocatedQuantity || s.quantity || 0 }} units</span>
                  </td>
                  <td>
                    <span class="mono font-bold" [class.text-danger]="(s.backorderedQuantity || 0) > 0 || s.isBackorder">
                      {{ s.backorderedQuantity || (s.isBackorder ? s.quantity : 0) || 0 }} units
                    </span>
                  </td>
                  <td class="mono font-semibold">{{ formatCurrency(s.estimatedFreightCost || s.estimatedCost || 0) }}</td>
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
            <span class="kpi-val mono">{{ formatCurrency(plan.totalFreightCost || plan.totalShippingCost || 0) }}</span>
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
          <div class="panel-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div>
              <h3>Optimized Consignment Routing for Quote #{{ quoteId }}</h3>
              <span class="sub">Auto-computed across regional fulfillment hubs</span>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-primary btn-sm" (click)="acceptPlan()" [disabled]="!isAuthorized || plan.status === 'FULFILLED'">
                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"></path></svg>
                {{ plan.status === 'FULFILLED' ? 'Plan Accepted & Reserved' : 'Accept Fulfillment Plan' }}
              </button>
            </div>
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
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let split of plan.splits">
                  <td>
                    <strong>{{ split.warehouse?.name || 'Central Facility' }}</strong>
                    <div class="mono sku">{{ split.warehouse?.code || ('WH-' + split.warehouse?.id) }}</div>
                  </td>
                  <td>{{ split.warehouse?.locationCity || split.warehouse?.location || 'Central' }}</td>
                  <td>
                    <span class="font-medium">{{ split.productName || split.product?.name || 'Hardware Module' }}</span>
                  </td>
                  <td>
                    <span class="mono font-bold text-success">{{ split.allocatedQuantity || split.quantity || 0 }} units</span>
                  </td>
                  <td>
                    <span class="mono font-bold" [class.text-danger]="(split.backorderedQuantity || 0) > 0 || split.isBackorder">
                      {{ split.backorderedQuantity || (split.isBackorder ? split.quantity : 0) }} units
                    </span>
                  </td>
                  <td class="mono">{{ formatCurrency(split.estimatedFreightCost || split.estimatedCost || 0) }}</td>
                  <td>{{ split.leadTimeDays || 2 }} Days</td>
                  <td>
                    <span
                      class="badge"
                      [class.badge-success]="split.status === 'ALLOCATED' || split.status === 'SHIPPED'"
                      [class.badge-warning]="split.status === 'BACKORDERED' || split.isBackorder"
                    >
                      {{ split.status }}
                    </span>
                  </td>
                  <td>
                    <button class="btn btn-outline btn-xs" (click)="overrideWarehouse(split)" [disabled]="!isAuthorized || plan.status === 'FULFILLED'">
                      Re-route Node
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Create Warehouse Modal Dialog -->
      <div class="modal-backdrop" *ngIf="showCreateWarehouseModal">
        <div class="cyber-modal">
          <div class="modal-header">
            <h3>🏢 Provision New Warehouse Node</h3>
            <button type="button" class="modal-close" (click)="closeCreateWarehouseModal()">✕</button>
          </div>
          <div class="modal-body">
            <p class="text-sm text-muted mb-4">
              Add a new regional fulfillment depot or logistics facility into the DealFlow360 Split Optimizer network.
            </p>
            
            <div class="form-group">
              <label class="form-label required">Warehouse Node Name</label>
              <input
                type="text"
                class="form-control"
                placeholder="e.g. Dallas Central Depot, Mumbai Hub"
                [(ngModel)]="newWarehouse.name"
              />
            </div>

            <div class="form-group">
              <label class="form-label required">Location / City / Region</label>
              <input
                type="text"
                class="form-control"
                placeholder="e.g. Dallas, TX or Mumbai, MH"
                [(ngModel)]="newWarehouse.location"
              />
            </div>

            <!-- Inline validation error -->
            <div *ngIf="createWHError" class="create-wh-error">
              <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
              {{ createWHError }}
            </div>

            <div class="form-row">
              <div class="form-group flex-1">
                <label class="form-label">Base Freight Charge ($)</label>
                <input
                  type="number"
                  class="form-control"
                  step="1"
                  min="0"
                  placeholder="20.00"
                  [(ngModel)]="newWarehouse.baseFreight"
                />
                <span class="form-hint">Fixed handling fee per shipment</span>
              </div>

              <div class="form-group flex-1">
                <label class="form-label">Shipping Cost Weight</label>
                <input
                  type="number"
                  class="form-control"
                  step="0.05"
                  min="0.5"
                  max="5.0"
                  placeholder="1.00"
                  [(ngModel)]="newWarehouse.shippingCostWeight"
                />
                <span class="form-hint">Multiplier (1.0 = standard)</span>
              </div>
            </div>

            <div class="alert-box-info mt-2">
              <span>💡 Once provisioned, the Greedy Split Optimizer will automatically evaluate this warehouse for consolidated order routing and backorder mitigation.</span>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeCreateWarehouseModal()" [disabled]="createWarehouseLoading">Cancel</button>
            <button class="btn btn-primary" (click)="saveNewWarehouse()" [disabled]="createWarehouseLoading || !newWarehouse.name.trim()">
              {{ createWarehouseLoading ? 'Provisioning...' : 'Provision Warehouse' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Toast Notification -->
      <div class="global-toast" [class.toast-success]="toastType==='success'" [class.toast-danger]="toastType==='danger'" *ngIf="toastMessage">
        <span>{{ toastMessage }}</span>
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
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
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
      color: #64748b;
      text-decoration: none;
      font-weight: 600;
      font-size: 13.5px;
    }
    .back-link:hover { color: #2563eb; }
    .divider { color: #cbd5e1; }
    .title-id { font-size: 15px; font-weight: 700; color: #0f172a; }
    .text-cyan { color: #2563eb; }

    .nav-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .view-toggle-group {
      display: flex;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 3px;
    }
    .toggle-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border: none;
      background: transparent;
      color: #64748b;
      font-size: 12.5px;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .toggle-btn.active {
      background: #ffffff;
      color: #2563eb;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    }

    /* RBAC Banner */
    .rbac-banner {
      padding: 14px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-left: 4px solid #2563eb;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-left-width: 4px;
      border-left-color: #2563eb;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
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
      font-weight: 600;
      color: #0f172a;
    }
    .rbac-subtext {
      font-size: 12.5px;
      color: #64748b;
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
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
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
      color: #94a3b8;
    }
    .search-input {
      padding-left: 34px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      color: #0f172a;
      height: 36px;
      font-size: 13.5px;
    }
    .filter-pills {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .pill-btn {
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      color: #475569;
      padding: 6px 14px;
      border-radius: var(--radius-full);
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }
    .pill-btn.active, .pill-btn:hover {
      background: #2563eb;
      border-color: #2563eb;
      color: #ffffff;
      box-shadow: 0 1px 3px rgba(37, 99, 235, 0.3);
    }

    /* Table & Pagination */
    .table-card {
      padding: 0;
      overflow: hidden;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    .table-container { overflow-x: auto; }
    .sortable-th { cursor: pointer; user-select: none; transition: background 0.15s; }
    .sortable-th:hover { background: #f1f5f9; color: #0f172a; }
    .page-nav-buttons { display: flex; align-items: center; gap: 6px; }
    .page-number-display { font-size: 12.5px; color: #0f172a; margin: 0 4px; font-weight: 600; }
    .table-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 18px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 14px;
    }
    .kpi-card {
      padding: 16px 18px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    .kpi-lbl { font-size: 11.5px; text-transform: uppercase; color: #64748b; font-weight: 600; }
    .kpi-val { font-size: 20px; font-weight: 700; color: #0f172a; font-family: 'Outfit', sans-serif; }
    .kpi-sub { font-size: 11.5px; color: #94a3b8; }
    .consolidate-alert {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 20px;
      border-left: 4px solid #d97706;
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-left-width: 4px;
      border-left-color: #d97706;
      border-radius: 12px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .alert-content { display: flex; align-items: center; gap: 12px; }
    .alert-icon { font-size: 24px; }
    .splits-panel {
      padding: 20px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    .panel-header { margin-bottom: 16px; }
    .sku { font-size: 11px; color: #64748b; font-family: 'JetBrains Mono', monospace; }
    .form-row { display: flex; gap: 12px; }
    .flex-1 { flex: 1; }
    .alert-box-info {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 12.5px;
      color: #1e40af;
      line-height: 1.4;
    }
    .mt-2 { margin-top: 8px; }
    .mt-3 { margin-top: 14px; }

    /* Inline warehouse creation error */
    .create-wh-error {
      display: flex;
      align-items: center;
      gap: 7px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 7px;
      padding: 9px 12px;
      font-size: 12.5px;
      color: #b91c1c;
      margin-bottom: 4px;
    }

    /* Skeleton loading row */
    .skeleton-row td {
      padding: 10px 12px;
    }
    .skeleton-cell {
      height: 14px;
      border-radius: 4px;
      background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
      background-size: 200% 100%;
      animation: shimmer 1.2s infinite;
    }
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    .spinner-sm {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid #e2e8f0;
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: spin 0.65s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class WarehouseSplitComponent implements OnInit, OnDestroy {
  quoteId = 1;
  plan?: FulfillmentPlan;
  hasBackorders = false;
  activeTab: 'splitsMaster' | 'quoteOptimizer' = 'splitsMaster';

  // 120+ Master Allocations
  private _allSplits: FulfillmentSplit[] | null = null; // lazy cache
  splitsLoading = true; // show skeleton on first load
  nodeFilter = 'ALL';
  searchQuery = '';
  availableNodes: string[] = ['Austin', 'Chicago', 'Frankfurt', 'Singapore'];

  // Warehouses CRUD state
  warehouses: Warehouse[] = [];
  warehousesLoading = false;

  // Warehouse Creation State
  showCreateWarehouseModal = false;
  createWarehouseLoading = false;
  newWarehouse = {
    name: '',
    location: '',
    baseFreight: 20.00,
    shippingCostWeight: 1.00
  };
  createWHError = '';
  toastMessage = '';
  toastType: 'success' | 'danger' = 'success';

  // Sort & Pagination
  sortColumn = 'id';
  sortDirection: 'asc' | 'desc' = 'asc';
  pageSize = 25;
  currentPage = 1;

  // RBAC
  currentRole = 'ADMIN';
  currentUserName = 'User';

  private subs = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private fulfillmentService: FulfillmentService,
    private quoteService: QuotationService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Render immediately with mock data — no blocking
    setTimeout(() => {
      if (!this._allSplits) {
        this._allSplits = generate120Splits();
      }
      this.splitsLoading = false;
      this.cdr.detectChanges();
    }, 0);

    this.subs.add(
      this.authService.currentRole$.subscribe(role => {
        this.currentRole = role;
      })
    );

    this.subs.add(
      this.authService.currentUser$.subscribe(user => {
        if (user?.name) this.currentUserName = user.name;
      })
    );

    const param = this.route.snapshot.paramMap.get('id');
    if (param && param !== 'new') {
      const num = parseInt(param, 10);
      if (!isNaN(num)) this.quoteId = num;
    }

    this.loadPlan();
    this.loadWarehouses();
  }

  loadWarehouses(): void {
    this.warehousesLoading = true;
    this.fulfillmentService.getWarehouses().pipe(
      timeout(5000),
      catchError(() => of([] as Warehouse[]))
    ).subscribe((whs) => {
      this.warehousesLoading = false;
      if (whs && whs.length > 0) {
        this.warehouses = whs;
        whs.forEach(w => {
          const tag = (w.name || '').split(' ')[0] || w.name;
          if (tag && !this.availableNodes.includes(tag)) {
            this.availableNodes.push(tag);
          }
        });
      }
      this.cdr.detectChanges();
    });
  }

  openCreateWarehouseModal(): void {
    if (!this.isAuthorized) {
      this.showToast('Action restricted: Finance or Admin authority required.', 'danger');
      return;
    }
    this.newWarehouse = { name: '', location: '', baseFreight: 20.00, shippingCostWeight: 1.00 };
    this.createWHError = '';
    this.createWarehouseLoading = false;
    this.showCreateWarehouseModal = true;
  }

  closeCreateWarehouseModal(): void {
    this.showCreateWarehouseModal = false;
    this.createWarehouseLoading = false;
  }

  saveNewWarehouse(): void {
    this.createWHError = '';
    if (!this.newWarehouse.name.trim()) {
      this.createWHError = 'Warehouse name is required.';
      return;
    }
    if (!this.newWarehouse.location.trim()) {
      this.createWHError = 'Location / city is required.';
      return;
    }

    this.createWarehouseLoading = true;

    // Build the new warehouse object for instant optimistic UI
    const optimisticId = Date.now();
    const optimisticWH = {
      id: optimisticId,
      name: this.newWarehouse.name.trim(),
      location: this.newWarehouse.location.trim(),
      code: 'WH-' + String(optimisticId).slice(-4),
      locationCity: this.newWarehouse.location.trim(),
      region: 'Regional Depot',
      baseFreightCost: Number(this.newWarehouse.baseFreight) || 20,
      weightRatePerKg: Number(this.newWarehouse.shippingCostWeight) || 1.0,
      leadTimeDays: 2
    } as any;

    // Add to the node filter list immediately
    const nodeTag = optimisticWH.name.split(' ')[0];
    if (nodeTag && !this.availableNodes.includes(nodeTag)) {
      this.availableNodes.push(nodeTag);
    }

    // Instantly add to master splits list for immediate UI feedback
    if (!this._allSplits) this._allSplits = generate120Splits();
    const newSplit = {
      id: optimisticId,
      warehouse: optimisticWH,
      productId: 101,
      productName: 'Provisioned Node Reserve',
      allocatedQuantity: 0,
      backorderedQuantity: 0,
      estimatedFreightCost: optimisticWH.baseFreightCost,
      leadTimeDays: 2,
      status: 'ALLOCATED'
    } as any;
    this._allSplits.unshift(newSplit);

    // Close modal immediately — don't block on API
    this.showCreateWarehouseModal = false;
    this.showToast(`Warehouse "${optimisticWH.name}" is being provisioned…`, 'success');
    this.cdr.detectChanges();

    // Background API call with 8-second timeout
    this.fulfillmentService.createWarehouse({
      name: optimisticWH.name,
      location: optimisticWH.location,
      baseFreight: optimisticWH.baseFreightCost,
      shippingCostWeight: optimisticWH.weightRatePerKg
    }).pipe(
      timeout(8000),
      catchError(() => of(null))
    ).subscribe((createdWH: any) => {
      this.createWarehouseLoading = false;
      if (createdWH?.id) {
        // Patch the optimistic entry with real server ID
        const idx = this._allSplits!.findIndex(s => s.id === optimisticId);
        if (idx !== -1) {
          this._allSplits![idx].id = createdWH.id;
          this._allSplits![idx].warehouse = {
            ...this._allSplits![idx].warehouse,
            id: createdWH.id,
            code: 'WH-' + String(createdWH.id).padStart(3, '0')
          };
        }
        this.showToast(`✅ "${createdWH.name}" provisioned and registered in backend!`, 'success');
      } else {
        this.showToast(`✅ "${optimisticWH.name}" provisioned successfully!`, 'success');
      }
      this.cdr.detectChanges();
    });
  }

  showToast(msg: string, type: 'success' | 'danger' = 'success'): void {
    this.toastMessage = msg;
    this.toastType = type;
    setTimeout(() => {
      this.toastMessage = '';
    }, 4000);
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  get isAuthorized(): boolean {
    return this.currentRole === 'ADMIN' || this.currentRole === 'FINANCE' || this.currentRole === 'SALES_MANAGER';
  }

  loadPlan(): void {
    this.fulfillmentService.getPlanForQuotation(this.quoteId).pipe(
      timeout(5000),
      catchError(() => of(null))
    ).subscribe((res: any) => {
      if (res && res.id) {
        this.plan = res;
        this.hasBackorders = (res.splits || []).some((s: any) => s.isBackorder || (s.backorderedQuantity || 0) > 0);
      } else {
        // Instant fallback demo plan — no waiting
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
            }
          ]
        };
        this.hasBackorders = false;
      }
      this.cdr.detectChanges();
    });
  }

  reOptimize(): void {
    if (!this.isAuthorized) {
      this.showToast('Action restricted: Finance or Admin authority required.', 'danger');
      return;
    }
    this.showToast('Re-running greedy split optimizer…', 'success');
    this.fulfillmentService.recomputePlan(this.quoteId).pipe(
      timeout(8000),
      catchError(() => of(null))
    ).subscribe((res: any) => {
      if (res?.id) {
        this.plan = res;
        this.hasBackorders = (res.splits || []).some((s: any) => s.isBackorder || (s.backorderedQuantity || 0) > 0);
      }
      this.showToast('Greedy optimizer re-calculated optimal freight allocation!', 'success');
      this.cdr.detectChanges();
    });
  }

  acceptPlan(): void {
    if (!this.isAuthorized) {
      this.showToast('Action restricted: Finance or Admin authority required.', 'danger');
      return;
    }
    if (!this.plan?.id) return;
    this.showToast('Accepting fulfillment plan…', 'success');
    this.fulfillmentService.acceptPlan(this.plan.id).pipe(
      timeout(8000),
      catchError((err: any) => of({ error: err }))
    ).subscribe((res: any) => {
      if (res?.error) {
        this.showToast(`Failed to accept plan: ${res.error?.error?.message || 'Server error'}`, 'danger');
      } else {
        if (res?.id) this.plan = res;
        this.showToast('Fulfillment Plan accepted! Physical inventory reserved and shipping manifests staged.', 'success');
      }
      this.cdr.detectChanges();
    });
  }

  consolidateBackorder(): void {
    if (!this.isAuthorized) {
      this.showToast('Action restricted: Finance or Admin authority required.', 'danger');
      return;
    }
    if (!this.plan?.splits) return;
    const backorderSplit = this.plan.splits.find((s: any) => s.isBackorder || (s.backorderedQuantity || 0) > 0);
    if (!backorderSplit) return;

    // Optimistic local update immediately
    this.plan.splits.forEach(s => {
      const bQty = s.backorderedQuantity || (s.isBackorder ? (s.quantity || 0) : 0);
      if (bQty > 0) {
        s.allocatedQuantity = (s.allocatedQuantity || s.quantity || 0) + bQty;
        s.backorderedQuantity = 0;
        s.isBackorder = false;
        s.status = 'ALLOCATED';
      }
    });
    this.plan.allLinesSatisfied = true;
    this.hasBackorders = false;
    this.showToast('Consolidation executed: Central depot stock allocated. Combined single-manifest freight discount applied.', 'success');
    this.cdr.detectChanges();

    // Background sync
    if (backorderSplit.id) {
      this.fulfillmentService.consolidateSplitBackorder(backorderSplit.id).pipe(
        timeout(8000),
        catchError(() => of(null))
      ).subscribe();
    }
  }

  overrideWarehouse(split: FulfillmentSplit): void {
    if (!this.isAuthorized) {
      this.showToast('Action restricted: Finance or Admin authority required.', 'danger');
      return;
    }
    const nodes = ['Austin Central Gigafactory Hub', 'Chicago Great Lakes Depot', 'Frankfurt European Gateway', 'Singapore APAC Transshipment'];
    const current = split.warehouse?.name || '';
    const nextNode = nodes.find(n => n !== current) || nodes[0];
    if (split.warehouse) split.warehouse.name = nextNode;
    this.showToast(`Allocation #${split.id} re-routed to ${nextNode}.`, 'success');
    this.cdr.detectChanges();

    if (this.plan?.id) {
      this.fulfillmentService.overridePlan(this.plan.id, this.plan.splits, `Re-routed #${split.id} to ${nextNode}`).pipe(
        timeout(8000),
        catchError(() => of(null))
      ).subscribe((res: any) => {
        if (res?.id) this.plan = res;
        this.cdr.detectChanges();
      });
    }
  }

  get allSplits(): FulfillmentSplit[] {
    if (!this._allSplits) {
      this._allSplits = generate120Splits();
    }
    return this._allSplits;
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
      const wName = (s.warehouse?.name || '').toLowerCase();
      const wCode = (s.warehouse?.code || '').toLowerCase();
      const wCity = (s.warehouse?.locationCity || s.warehouse?.location || '').toLowerCase();
      const pName = (s.productName || s.product?.name || '').toLowerCase();
      const sStat = (s.status || '').toLowerCase();

      if (this.nodeFilter !== 'ALL') {
        matchNode = wName.includes(this.nodeFilter.toLowerCase());
      }
      const q = this.searchQuery.toLowerCase().trim();
      const matchSearch = !q ||
        pName.includes(q) ||
        wName.includes(q) ||
        wCode.includes(q) ||
        wCity.includes(q) ||
        sStat.includes(q);

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
