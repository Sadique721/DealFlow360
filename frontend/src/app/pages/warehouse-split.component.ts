import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FulfillmentService } from '../services/fulfillment.service';
import { QuotationService } from '../services/quotation.service';
import { AuthService } from '../services/auth.service';
import { FulfillmentPlan, FulfillmentSplit, Warehouse, WarehouseStock, Quotation } from '../models/dealflow.model';
import { Subscription, of } from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';

interface ManualSplitRow {
  warehouseId: number;
  productId: number;
  productName: string;
  quantity: number;
  isBackorder: boolean;
  maxAvailable: number;
}

@Component({
  selector: 'app-warehouse-split',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="fulfillment-page">

      <!-- TOP HEADER / NAV BAR -->
      <div class="nav-header glass-panel">
        <div class="nav-left">
          <a routerLink="/dashboard/pipeline" class="back-link">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"></path></svg>
            Pipeline
          </a>
          <span class="divider">/</span>
          <span class="title-main">Fulfillment & Warehouse Split Engine</span>
          <span class="badge badge-info" *ngIf="activeView === 'list'">{{ plans.length }} Orders</span>
          <span class="badge badge-primary" *ngIf="activeView === 'detail'">Quote #{{ currentQuotationNumber }}</span>
        </div>

        <div class="nav-actions">
          <!-- View Toggle -->
          <div class="view-toggle-group">
            <button
              class="toggle-btn"
              [class.active]="activeView === 'list'"
              (click)="switchToList()"
            >
              <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
              Fulfillment Orders
            </button>
            <button
              class="toggle-btn"
              [class.active]="activeView === 'detail'"
              (click)="switchToDetail()"
              [disabled]="!selectedPlan && !targetQuoteId"
            >
              <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              Allocation Details
            </button>
          </div>

          <button
            class="btn btn-outline btn-sm"
            (click)="openFulfillQuoteModal()"
            *ngIf="isAuthorized"
            title="Generate fulfillment plan for an approved quotation"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"></path></svg>
            Fulfill Approved Quote
          </button>
        </div>
      </div>

      <!-- RBAC BANNER -->
      <div class="glass-panel rbac-banner">
        <div class="rbac-left">
          <span class="role-icon">📦</span>
          <div>
            <div class="rbac-title">
              <span class="text-muted">Logistics Role:</span>
              <strong class="text-primary-blue">{{ currentUserName }}</strong>
              <span class="badge ml-2" [class.badge-primary]="currentRole==='ADMIN'" [class.badge-success]="currentRole==='FINANCE'" [class.badge-warning]="currentRole==='SALES_MANAGER'">
                {{ currentRole }}
              </span>
            </div>
            <p class="rbac-subtext">
              {{ isAuthorized ? 'Full Operations Authority: You can optimize allocations, accept suggested splits, execute manual overrides, and re-evaluate backorders.' : 'Observer Mode: Viewing fulfillment recommendations. Modifications require Sales Manager, Finance, or Admin authority.' }}
            </p>
          </div>
        </div>
        <div class="rbac-right" *ngIf="activeView === 'detail' && selectedPlan">
          <button class="btn btn-outline btn-sm" (click)="recomputeSplit()" [disabled]="!isAuthorized || actionLoading">
            <svg class="spin-icon" *ngIf="actionLoading" width="14" height="14" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/></svg>
            <svg *ngIf="!actionLoading" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            Re-run Greedy Split Algorithm
          </button>
        </div>
      </div>

      <!-- ========================================================================= -->
      <!-- VIEW 1: FULFILLMENT LIST SCREEN (Real Backend Data, Sort createdAt DESC)  -->
      <!-- ========================================================================= -->
      <div class="view-list" *ngIf="activeView === 'list'">

        <!-- KPI SUMMARY CARDS -->
        <div class="kpi-grid">
          <div class="glass-panel kpi-card">
            <span class="kpi-lbl">Total Fulfillments</span>
            <span class="kpi-val">{{ plans.length }}</span>
            <span class="kpi-sub">Across all regional warehouses</span>
          </div>
          <div class="glass-panel kpi-card">
            <span class="kpi-lbl">Fulfilled & Shipped</span>
            <span class="kpi-val text-success">{{ getStatusCount('FULFILLED') }}</span>
            <span class="kpi-sub">100% Inventory reserved</span>
          </div>
          <div class="glass-panel kpi-card">
            <span class="kpi-lbl">Suggested / Pending</span>
            <span class="kpi-val text-primary-blue">{{ getStatusCount('ALLOCATION_SUGGESTED') + getStatusCount('SPLIT_PENDING') + getStatusCount('PENDING') }}</span>
            <span class="kpi-sub">Awaiting confirmation</span>
          </div>
          <div class="glass-panel kpi-card">
            <span class="kpi-lbl">Backordered / Partial</span>
            <span class="kpi-val text-warning">{{ getStatusCount('PARTIALLY_FULFILLED') + getStatusCount('BACKORDERED') }}</span>
            <span class="kpi-sub">Requires replenishment</span>
          </div>
        </div>

        <!-- SEARCH & FILTER BAR -->
        <div class="glass-panel filter-bar mt-3">
          <div class="search-box-wrapper">
            <svg class="search-icon" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><path d="M21 21l-4.35-4.35"></path></svg>
            <input
              type="text"
              class="form-control search-input"
              placeholder="Search by fulfillment #, quote #, or customer name..."
              [(ngModel)]="searchQuery"
            />
          </div>

          <div class="filter-pills">
            <button class="pill-btn" [class.active]="statusFilter === 'ALL'" (click)="statusFilter = 'ALL'">
              All ({{ plans.length }})
            </button>
            <button class="pill-btn" [class.active]="statusFilter === 'ALLOCATION_SUGGESTED'" (click)="statusFilter = 'ALLOCATION_SUGGESTED'">
              Suggested
            </button>
            <button class="pill-btn" [class.active]="statusFilter === 'FULFILLED'" (click)="statusFilter = 'FULFILLED'">
              Fulfilled
            </button>
            <button class="pill-btn" [class.active]="statusFilter === 'PARTIALLY_FULFILLED'" (click)="statusFilter = 'PARTIALLY_FULFILLED'">
              Backordered / Partial
            </button>
            <button class="pill-btn" [class.active]="statusFilter === 'OVERRIDDEN'" (click)="statusFilter = 'OVERRIDDEN'">
              Overridden
            </button>
          </div>
        </div>

        <!-- FULFILLMENT LIST DATA GRID -->
        <div class="glass-panel table-card mt-3">
          <div class="table-container">
            <table class="table-custom">
              <thead>
                <tr>
                  <th>Fulfillment #</th>
                  <th>Customer</th>
                  <th>Quotation #</th>
                  <th>Status</th>
                  <th>Total Units</th>
                  <th>Allocated</th>
                  <th>Backordered</th>
                  <th>Shipments</th>
                  <th>Created Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <!-- Loading Skeleton -->
                <tr *ngIf="loadingPlans" class="skeleton-row">
                  <td colspan="10"><div class="skeleton-cell"></div></td>
                </tr>

                <!-- Data Rows -->
                <tr *ngFor="let p of filteredPlans" class="clickable-row" (click)="openDetail(p)">
                  <td>
                    <span class="mono font-bold text-primary-blue">FUL-2026-{{ p.id }}</span>
                  </td>
                  <td>
                    <strong>{{ p.quotation?.customer?.name || 'Enterprise Customer' }}</strong>
                    <div class="text-muted text-xs">{{ p.quotation?.customer?.companyName || p.quotation?.customer?.destinationRegion || p.quotation?.customer?.address || '' }}</div>
                  </td>
                  <td>
                    <span class="badge badge-neutral mono">{{ p.quotation?.quoteNumber || ('Q-' + p.quotation?.id) }}</span>
                  </td>
                  <td>
                    <span class="badge" [ngClass]="getStatusBadgeClass(p.status)">
                      {{ formatStatusLabel(p.status) }}
                    </span>
                  </td>
                  <td class="mono font-bold">{{ getTotalRequestedUnits(p) }}</td>
                  <td class="mono font-bold text-success">{{ getTotalAllocatedUnits(p) }}</td>
                  <td class="mono font-bold" [class.text-danger]="getTotalBackorderedUnits(p) > 0">
                    {{ getTotalBackorderedUnits(p) }}
                  </td>
                  <td>
                    <span class="badge badge-neutral mono">{{ p.shipmentCount || 1 }} shipment(s)</span>
                  </td>
                  <td class="text-xs text-muted">
                    {{ p.createdAt | date:'mediumDate' }}
                  </td>
                  <td>
                    <button class="btn btn-outline btn-xs" (click)="openDetail(p); $event.stopPropagation()">
                      View Details →
                    </button>
                  </td>
                </tr>

                <!-- Empty State -->
                <tr *ngIf="!loadingPlans && filteredPlans.length === 0">
                  <td colspan="10" class="empty-cell">
                    <div class="empty-state">
                      <span class="empty-icon">📦</span>
                      <h4>No Fulfillment Records Found</h4>
                      <p class="text-muted">No fulfillment orders match the current filter or search criteria.</p>
                      <button class="btn btn-primary btn-sm mt-2" (click)="openFulfillQuoteModal()" *ngIf="isAuthorized">
                        Fulfill an Approved Quotation
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ========================================================================= -->
      <!-- VIEW 2: FULFILLMENT DETAIL SCREEN (Order items, live stock, recommended)  -->
      <!-- ========================================================================= -->
      <div class="view-detail" *ngIf="activeView === 'detail'">

        <!-- Detail Header with Back link -->
        <div class="detail-top-bar">
          <button class="btn btn-outline btn-sm back-to-list-btn" (click)="switchToList()">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"></path></svg>
            Back to Fulfillment List
          </button>
          <div class="detail-header-tags">
            <span class="badge badge-neutral mono">Fulfillment #FUL-2026-{{ selectedPlan?.id || 'NEW' }}</span>
            <span class="badge" [ngClass]="getStatusBadgeClass(selectedPlan?.status || 'PENDING')">
              {{ formatStatusLabel(selectedPlan?.status || 'PENDING') }}
            </span>
          </div>
        </div>

        <!-- ORDER & CUSTOMER INFO CARD -->
        <div class="glass-panel order-summary-card mt-3">
          <div class="summary-col">
            <span class="sum-lbl">Customer</span>
            <strong class="sum-val">{{ selectedPlan?.quotation?.customer?.name || currentCustomerName || 'Enterprise Customer' }}</strong>
            <span class="sum-sub">{{ selectedPlan?.quotation?.customer?.companyName || 'Corporate Client' }}</span>
          </div>
          <div class="summary-col">
            <span class="sum-lbl">Quotation Number</span>
            <strong class="sum-val text-primary-blue mono">{{ selectedPlan?.quotation?.quoteNumber || ('Q-' + targetQuoteId) }}</strong>
            <span class="sum-sub">Status: {{ selectedPlan?.quotation?.status || 'APPROVED' }}</span>
          </div>
          <div class="summary-col">
            <span class="sum-lbl">Order Value</span>
            <strong class="sum-val mono">{{ formatCurrency(selectedPlan?.quotation?.totalAmount || 0) }}</strong>
            <span class="sum-sub">Net after discounts</span>
          </div>
          <div class="summary-col">
            <span class="sum-lbl">Promised Delivery</span>
            <strong class="sum-val">{{ (selectedPlan?.quotation?.promisedDeliveryDate | date:'mediumDate') || 'Standard (3-5 days)' }}</strong>
            <span class="sum-sub">Logistics Priority</span>
          </div>
        </div>

        <!-- ORDER ITEMS SUMMARY TABLE -->
        <div class="glass-panel mt-3">
          <div class="panel-title-bar">
            <div>
              <h3>Commercial Order Items</h3>
              <p class="text-muted text-xs">Line items requested by customer in Quotation #{{ selectedPlan?.quotation?.quoteNumber || targetQuoteId }}</p>
            </div>
          </div>

          <div class="table-container">
            <table class="table-custom">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Requested Qty</th>
                  <th>Allocated Qty</th>
                  <th>Backordered Qty</th>
                  <th>Coverage</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let line of orderLines">
                  <td>
                    <strong>{{ line.product?.name || 'Product' }}</strong>
                    <div class="text-xs text-muted">{{ line.product?.sku || ('PRD-' + line.product?.id) }}</div>
                  </td>
                  <td class="mono font-bold">{{ line.quantity }} units</td>
                  <td class="mono font-bold text-success">{{ getProductAllocatedQty(line.product?.id) }} units</td>
                  <td class="mono font-bold" [class.text-danger]="getProductBackorderedQty(line.product?.id) > 0">
                    {{ getProductBackorderedQty(line.product?.id) }} units
                  </td>
                  <td>
                    <div class="progress-bar-wrapper">
                      <div class="progress-bar-fill" [style.width.%]="getCoveragePercent(line)"></div>
                    </div>
                    <span class="text-xs text-muted font-bold">{{ getCoveragePercent(line) }}%</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- BACKORDER WARNING BANNER (If Backorder Present) -->
        <div class="glass-panel backorder-alert mt-3" *ngIf="hasBackorders">
          <div class="alert-content">
            <span class="alert-icon">⚠️</span>
            <div>
              <h4>Partial Stock Exhausted & Backorder Active</h4>
              <p class="sub">
                Total available warehouse inventory is less than customer requested quantity. Outstanding units are backordered.
                When inventory is replenished, click <strong>Re-evaluate Backorders</strong> to auto-allocate from fresh stock.
              </p>
            </div>
          </div>
          <button class="btn btn-warning" (click)="reEvaluateBackorders()" [disabled]="!isAuthorized || actionLoading">
            <svg class="spin-icon" *ngIf="actionLoading" width="14" height="14" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/></svg>
            Re-evaluate Backorders
          </button>
        </div>

        <!-- RECOMMENDED WAREHOUSE SPLIT SECTION -->
        <div class="glass-panel splits-panel mt-3">
          <div class="panel-header-flex">
            <div>
              <h3>Recommended Warehouse Split</h3>
              <p class="text-muted text-xs">Computed via Greedy Freight Optimizer with Warehouse Shipping Cost Weighting</p>
            </div>
            <div class="action-btn-group">
              <button
                class="btn btn-outline btn-sm"
                (click)="openManualOverrideModal()"
                *ngIf="isAuthorized"
                [disabled]="actionLoading"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                Manual Override
              </button>

              <button
                class="btn btn-primary btn-sm"
                (click)="acceptSuggestedSplit()"
                *ngIf="isAuthorized && selectedPlan?.status !== 'FULFILLED'"
                [disabled]="actionLoading"
              >
                <svg class="spin-icon" *ngIf="actionLoading" width="14" height="14" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/></svg>
                <svg *ngIf="!actionLoading" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"></path></svg>
                Accept Suggested Split
              </button>

              <span class="badge badge-success px-3 py-2" *ngIf="selectedPlan?.status === 'FULFILLED'">
                ✓ Allocation Accepted & Inventory Reserved
              </span>
            </div>
          </div>

          <!-- SPLIT TABLE -->
          <div class="table-container mt-2">
            <table class="table-custom">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Warehouse Facility</th>
                  <th>Allocated Qty</th>
                  <th>Live Available Stock</th>
                  <th>Shipment Group</th>
                  <th>Shipping Cost / Weight Impact</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let split of selectedPlan?.splits">
                  <td>
                    <strong>{{ split.product?.name || split.productName || 'Hardware Component' }}</strong>
                  </td>
                  <td>
                    <div *ngIf="!split.isBackorder">
                      <strong>{{ split.warehouse?.name || 'Main Warehouse' }}</strong>
                      <div class="text-xs text-muted">{{ split.warehouse?.location || 'Central Depot' }} (Weight: {{ split.warehouse?.shippingCostWeight || 1.0 }}x)</div>
                    </div>
                    <div *ngIf="split.isBackorder" class="text-danger font-bold">
                      Pending Replenishment (Backorder)
                    </div>
                  </td>
                  <td>
                    <span class="mono font-bold" [class.text-success]="!split.isBackorder" [class.text-danger]="split.isBackorder">
                      {{ split.quantity || 0 }} units
                    </span>
                  </td>
                  <td>
                    <span class="mono font-bold" [class.text-muted]="split.isBackorder">
                      {{ split.isBackorder ? '—' : getLiveAvailable(split.warehouse?.id, split.product?.id) + ' units' }}
                    </span>
                  </td>
                  <td>
                    <span class="badge badge-neutral mono">{{ split.shipmentGroup || 'MAIN-SHIP-01' }}</span>
                  </td>
                  <td class="mono font-bold">
                    {{ split.isBackorder ? '$0.00' : formatCurrency(split.estimatedCost || 0) }}
                  </td>
                  <td>
                    <span
                      class="badge"
                      [class.badge-success]="split.status === 'ALLOCATED' || split.status === 'SHIPPED'"
                      [class.badge-warning]="split.status === 'BACKORDERED' || split.isBackorder"
                    >
                      {{ split.isBackorder ? 'BACKORDERED' : split.status }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- LOGISTICS IMPACT STRIP -->
          <div class="logistics-impact-strip mt-3">
            <div class="impact-item">
              <span class="impact-lbl">Shipment Count:</span>
              <span class="impact-val mono">{{ selectedPlan?.shipmentCount || 1 }}</span>
            </div>
            <div class="impact-divider"></div>
            <div class="impact-item">
              <span class="impact-lbl">Shipping Cost Impact:</span>
              <span class="impact-val mono text-primary-blue">{{ formatCurrency(selectedPlan?.totalShippingCost || 0) }}</span>
            </div>
            <div class="impact-divider"></div>
            <div class="impact-item">
              <span class="impact-lbl">Fulfillment Health:</span>
              <span class="badge" [class.badge-success]="!hasBackorders" [class.badge-warning]="hasBackorders">
                {{ hasBackorders ? 'Partial / Backordered' : '100% Fully Stocked' }}
              </span>
            </div>
          </div>
        </div>

      </div>

      <!-- ========================================================================= -->
      <!-- MODAL: MANUAL OVERRIDE (Section 10 Requirement)                          -->
      <!-- ========================================================================= -->
      <div class="modal-backdrop" *ngIf="showManualOverrideModal">
        <div class="modal-card modal-lg">
          <div class="modal-header">
            <h3>Manual Warehouse Allocation Override</h3>
            <button class="close-btn" (click)="closeManualOverrideModal()">✕</button>
          </div>

          <div class="modal-body">
            <p class="text-muted text-xs mb-3">
              Adjust the warehouse assignment and allocated quantities. The backend validates warehouse existence,
              product availability, non-negative values, and prevents over-allocation. Any deficit will automatically become a backorder.
            </p>

            <div class="manual-override-table-wrapper">
              <table class="table-custom">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Warehouse</th>
                    <th>Allocated Quantity</th>
                    <th>Max Available</th>
                    <th>Backorder?</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let row of manualOverrideRows; let idx = index">
                    <td>
                      <select class="form-control form-control-sm" [(ngModel)]="row.productId" (change)="onManualProductChange(row)">
                        <option *ngFor="let p of uniqueProductsInQuote" [ngValue]="p.id">{{ p.name }}</option>
                      </select>
                    </td>
                    <td>
                      <select class="form-control form-control-sm" [(ngModel)]="row.warehouseId" (change)="updateMaxAvailable(row)">
                        <option *ngFor="let wh of warehouses" [ngValue]="wh.id">
                          {{ wh.name }} (Freight wt: {{ wh.shippingCostWeight || 1.0 }}x)
                        </option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        class="form-control form-control-sm mono"
                        min="0"
                        [(ngModel)]="row.quantity"
                      />
                    </td>
                    <td class="mono text-xs">
                      <span [class.text-danger]="row.quantity > row.maxAvailable" [class.text-success]="row.quantity <= row.maxAvailable">
                        {{ row.maxAvailable }} units
                      </span>
                    </td>
                    <td>
                      <label class="checkbox-label text-xs">
                        <input type="checkbox" [(ngModel)]="row.isBackorder" />
                        Backorder
                      </label>
                    </td>
                    <td>
                      <button class="btn btn-outline btn-xs text-danger" (click)="removeManualRow(idx)" [disabled]="manualOverrideRows.length <= 1">
                        ✕
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <button class="btn btn-outline btn-xs mt-2" (click)="addManualRow()">
              + Add Split Row
            </button>

            <div class="form-group mt-3">
              <label class="form-label">Override Reason / Justification</label>
              <input
                type="text"
                class="form-control form-control-sm"
                [(ngModel)]="overrideReason"
                placeholder="e.g. Customer requested West Coast routing to expedite transit"
              />
            </div>

            <div class="alert-box-danger mt-2" *ngIf="overrideError">
              {{ overrideError }}
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeManualOverrideModal()" [disabled]="actionLoading">Cancel</button>
            <button class="btn btn-primary" (click)="saveManualOverride()" [disabled]="actionLoading">
              {{ actionLoading ? 'Validating & Saving...' : 'Save Manual Allocation' }}
            </button>
          </div>
        </div>
      </div>

      <!-- ========================================================================= -->
      <!-- MODAL: FULFILL APPROVED QUOTATION (Picker)                                -->
      <!-- ========================================================================= -->
      <div class="modal-backdrop" *ngIf="showFulfillQuoteModal">
        <div class="modal-card">
          <div class="modal-header">
            <h3>Fulfill Approved Quotation</h3>
            <button class="close-btn" (click)="closeFulfillQuoteModal()">✕</button>
          </div>
          <div class="modal-body">
            <p class="text-muted text-xs mb-3">
              Select an approved or confirmed quotation to generate a multi-warehouse greedy fulfillment split.
            </p>

            <div class="form-group">
              <label class="form-label">Approved Quotations</label>
              <select class="form-control" [(ngModel)]="selectedQuoteToFulfill">
                <option [ngValue]="null">-- Select an Approved Quotation --</option>
                <option *ngFor="let q of approvedQuotes" [ngValue]="q">
                  {{ q.quoteNumber }} - {{ q.customer?.name || 'Customer' }} ({{ formatCurrency(q.totalAmount) }})
                </option>
              </select>
            </div>

            <div class="alert-box-info mt-2" *ngIf="selectedQuoteToFulfill">
              <strong>{{ selectedQuoteToFulfill.quoteNumber }}</strong> contains {{ selectedQuoteToFulfill.lines?.length || 0 }} line item(s).
              Clicking generate will calculate the optimal shipment routing across live warehouses.
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeFulfillQuoteModal()">Cancel</button>
            <button
              class="btn btn-primary"
              [disabled]="!selectedQuoteToFulfill || actionLoading"
              (click)="generateFulfillmentForSelectedQuote()"
            >
              {{ actionLoading ? 'Computing Split...' : 'Generate Fulfillment' }}
            </button>
          </div>
        </div>
      </div>

      <!-- TOAST NOTIFICATION -->
      <div class="global-toast" [class.toast-success]="toastType==='success'" [class.toast-danger]="toastType==='danger'" *ngIf="toastMessage">
        <span>{{ toastMessage }}</span>
      </div>

    </div>
  `,
  styles: [`
    .fulfillment-page {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .glass-panel {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
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
      color: #64748b;
      text-decoration: none;
      font-weight: 600;
      font-size: 13.5px;
    }
    .back-link:hover { color: #2563eb; }
    .divider { color: #cbd5e1; }
    .title-main { font-size: 15px; font-weight: 700; color: #0f172a; }
    .text-primary-blue { color: #2563eb; }

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
    .toggle-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    /* RBAC Banner */
    .rbac-banner {
      padding: 14px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-left: 4px solid #2563eb;
      flex-wrap: wrap;
      gap: 12px;
    }
    .rbac-left { display: flex; align-items: center; gap: 12px; }
    .role-icon { font-size: 24px; }
    .rbac-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: #0f172a; }
    .rbac-subtext { font-size: 12.5px; color: #64748b; margin-top: 2px; }

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 14px;
    }
    .kpi-card {
      padding: 16px 18px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .kpi-lbl { font-size: 11.5px; text-transform: uppercase; color: #64748b; font-weight: 600; letter-spacing: 0.03em; }
    .kpi-val { font-size: 24px; font-weight: 700; color: #0f172a; font-family: 'Outfit', sans-serif; }
    .kpi-sub { font-size: 11.5px; color: #94a3b8; }

    /* Filter Bar */
    .filter-bar {
      padding: 12px 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }
    .search-box-wrapper { position: relative; width: 340px; }
    .search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
    .search-input {
      padding-left: 34px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      color: #0f172a;
      height: 36px;
      font-size: 13.5px;
      width: 100%;
    }
    .filter-pills { display: flex; gap: 6px; flex-wrap: wrap; }
    .pill-btn {
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      color: #475569;
      padding: 6px 14px;
      border-radius: 9999px;
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

    /* Table Styles */
    .table-card { padding: 0; overflow: hidden; }
    .table-container { overflow-x: auto; width: 100%; }
    .table-custom {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 13px;
    }
    .table-custom th {
      background: #f8fafc;
      color: #475569;
      font-weight: 600;
      padding: 12px 16px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .table-custom td {
      padding: 12px 16px;
      border-bottom: 1px solid #f1f5f9;
      color: #1e293b;
      vertical-align: middle;
    }
    .clickable-row { cursor: pointer; transition: background 0.12s; }
    .clickable-row:hover { background: #f8fafc; }
    .empty-cell { padding: 40px 20px; text-align: center; }
    .empty-state { display: flex; flex-direction: column; align-items: center; gap: 8px; }
    .empty-icon { font-size: 32px; }

    /* Detail View Elements */
    .detail-top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }
    .back-to-list-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
    }
    .detail-header-tags { display: flex; gap: 8px; align-items: center; }

    .order-summary-card {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      padding: 16px 20px;
      gap: 16px;
    }
    .summary-col { display: flex; flex-direction: column; gap: 3px; }
    .sum-lbl { font-size: 11.5px; text-transform: uppercase; color: #64748b; font-weight: 600; }
    .sum-val { font-size: 15px; color: #0f172a; }
    .sum-sub { font-size: 12px; color: #94a3b8; }

    .panel-title-bar {
      padding: 16px 20px 8px 20px;
    }
    .panel-title-bar h3 { margin: 0 0 2px 0; font-size: 15px; font-weight: 700; color: #0f172a; }

    .splits-panel { padding: 20px; }
    .panel-header-flex {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 12px;
    }
    .panel-header-flex h3 { margin: 0 0 2px 0; font-size: 16px; font-weight: 700; color: #0f172a; }
    .action-btn-group { display: flex; gap: 8px; align-items: center; }

    /* Progress bar */
    .progress-bar-wrapper {
      width: 90px;
      height: 6px;
      background: #e2e8f0;
      border-radius: 9999px;
      overflow: hidden;
      margin-bottom: 3px;
    }
    .progress-bar-fill {
      height: 100%;
      background: #2563eb;
      border-radius: 9999px;
    }

    /* Backorder alert banner */
    .backorder-alert {
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
    .alert-content h4 { margin: 0 0 3px 0; color: #92400e; font-size: 14px; font-weight: 700; }
    .alert-content .sub { margin: 0; color: #b45309; font-size: 12.5px; }

    /* Logistics Impact Strip */
    .logistics-impact-strip {
      display: flex;
      align-items: center;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 18px;
      gap: 20px;
      flex-wrap: wrap;
    }
    .impact-item { display: flex; align-items: center; gap: 8px; }
    .impact-lbl { font-size: 12.5px; font-weight: 600; color: #64748b; }
    .impact-val { font-size: 16px; font-weight: 700; color: #0f172a; }
    .impact-divider { width: 1px; height: 20px; background: #cbd5e1; }

    /* Modals */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.5);
      backdrop-filter: blur(4px);
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .modal-card {
      background: #ffffff;
      border-radius: 14px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      width: 100%;
      max-width: 520px;
      max-height: 90vh;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    }
    .modal-lg { max-width: 820px; }
    .modal-header {
      padding: 16px 20px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .modal-header h3 { margin: 0; font-size: 16px; font-weight: 700; color: #0f172a; }
    .close-btn { background: none; border: none; font-size: 18px; color: #94a3b8; cursor: pointer; }
    .modal-body { padding: 20px; flex: 1; }
    .modal-footer {
      padding: 14px 20px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      background: #f8fafc;
    }
    .checkbox-label { display: flex; align-items: center; gap: 6px; cursor: pointer; }

    /* Alert boxes */
    .alert-box-info {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 12.5px;
      color: #1e40af;
    }
    .alert-box-danger {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 12.5px;
      color: #b91c1c;
    }

    /* Buttons & Badges */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.15s;
    }
    .btn-sm { padding: 7px 14px; font-size: 13px; }
    .btn-xs { padding: 4px 10px; font-size: 12px; }
    .btn-primary { background: #2563eb; color: #ffffff; border-color: #2563eb; }
    .btn-primary:hover:not(:disabled) { background: #1d4ed8; }
    .btn-outline { background: #ffffff; border-color: #cbd5e1; color: #334155; }
    .btn-outline:hover:not(:disabled) { background: #f8fafc; border-color: #94a3b8; }
    .btn-warning { background: #d97706; color: #ffffff; border-color: #d97706; }
    .btn-warning:hover:not(:disabled) { background: #b45309; }
    .btn-secondary { background: #f1f5f9; color: #475569; border-color: #e2e8f0; }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }

    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 600;
    }
    .badge-primary { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; }
    .badge-success { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
    .badge-warning { background: #fffbeb; color: #d97706; border: 1px solid #fde68a; }
    .badge-info { background: #f8fafc; color: #475569; border: 1px solid #e2e8f0; }
    .badge-neutral { background: #f1f5f9; color: #475569; }

    .mono { font-family: 'JetBrains Mono', monospace; }
    .text-xs { font-size: 11.5px; }
    .text-muted { color: #64748b; }
    .text-success { color: #16a34a; }
    .text-danger { color: #dc2626; }
    .text-warning { color: #d97706; }
    .font-bold { font-weight: 700; }
    .mt-2 { margin-top: 8px; }
    .mt-3 { margin-top: 14px; }
    .mb-3 { margin-bottom: 14px; }

    .global-toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 13.5px;
      font-weight: 600;
      z-index: 1000;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      animation: slideUp 0.2s ease-out;
    }
    .toast-success { background: #10b981; color: #ffffff; }
    .toast-danger { background: #ef4444; color: #ffffff; }
    @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

    .spin-icon { animation: spin 0.7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .skeleton-cell {
      height: 20px;
      background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
      background-size: 200% 100%;
      animation: shimmer 1.2s infinite;
      border-radius: 4px;
    }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
  `]
})
export class WarehouseSplitComponent implements OnInit, OnDestroy {
  // Navigation / Views
  activeView: 'list' | 'detail' = 'list';
  targetQuoteId?: number;

  // Real backend data
  plans: FulfillmentPlan[] = [];
  loadingPlans = false;
  selectedPlan?: FulfillmentPlan;
  orderLines: any[] = [];
  warehouses: Warehouse[] = [];
  warehouseStocks: WarehouseStock[] = [];

  // Filter & Search
  searchQuery = '';
  statusFilter = 'ALL';

  // Manual Override State
  showManualOverrideModal = false;
  manualOverrideRows: ManualSplitRow[] = [];
  overrideReason = 'Logistics routing optimization';
  overrideError = '';

  // Fulfill Quote Modal State
  showFulfillQuoteModal = false;
  approvedQuotes: Quotation[] = [];
  selectedQuoteToFulfill: Quotation | null = null;

  // Action Loading & Toast
  actionLoading = false;
  toastMessage = '';
  toastType: 'success' | 'danger' = 'success';

  // RBAC
  currentRole = 'ADMIN';
  currentUserName = 'User';

  private subs = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fulfillmentService: FulfillmentService,
    private quotationService: QuotationService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // 1. Subscribe to auth role & user
    this.subs.add(
      this.authService.currentRole$.subscribe(r => this.currentRole = r)
    );
    this.subs.add(
      this.authService.currentUser$.subscribe(u => {
        if (u?.name) this.currentUserName = u.name;
      })
    );

    // 2. Load supporting data (Warehouses and Live Inventory)
    this.loadWarehousesAndStocks();

    // 3. Check route parameters
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'new') {
      const parsedId = parseInt(idParam, 10);
      if (!isNaN(parsedId)) {
        this.targetQuoteId = parsedId;
        this.activeView = 'detail';
        this.loadPlanForQuotation(parsedId);
      }
    }

    // Always fetch fulfillment plans for list view
    this.loadFulfillmentPlans();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  get isAuthorized(): boolean {
    return this.currentRole === 'ADMIN' || this.currentRole === 'FINANCE' || this.currentRole === 'SALES_MANAGER';
  }

  // ==========================================
  // DATA FETCHING (100% REAL BACKEND APIS)
  // ==========================================

  loadFulfillmentPlans(): void {
    this.loadingPlans = true;
    this.fulfillmentService.getAllPlans().pipe(
      timeout(8000),
      catchError(() => of([] as FulfillmentPlan[]))
    ).subscribe(data => {
      this.loadingPlans = false;
      this.plans = data || [];
      // If we were targeting a quote ID, find it in loaded plans if detail not yet set
      if (this.targetQuoteId && !this.selectedPlan) {
        const found = this.plans.find(p => p.quotation?.id === this.targetQuoteId || p.id === this.targetQuoteId);
        if (found) {
          this.selectedPlan = found;
          this.orderLines = found.quotation?.lines || [];
        }
      }
      this.cdr.detectChanges();
    });
  }

  loadWarehousesAndStocks(): void {
    this.fulfillmentService.getWarehouses().pipe(
      catchError(() => of([] as Warehouse[]))
    ).subscribe(whs => this.warehouses = whs);

    this.fulfillmentService.getStocks().pipe(
      catchError(() => of([] as WarehouseStock[]))
    ).subscribe(stks => this.warehouseStocks = stks);
  }

  loadPlanForQuotation(quoteId: number): void {
    this.actionLoading = true;
    this.fulfillmentService.getPlanForQuotation(quoteId).pipe(
      timeout(10000),
      catchError((err: any) => {
        this.showToast(err?.error?.message || 'Failed to load fulfillment plan for quotation #' + quoteId, 'danger');
        return of(null);
      })
    ).subscribe(plan => {
      this.actionLoading = false;
      if (plan) {
        this.selectedPlan = plan;
        this.orderLines = plan.quotation?.lines || [];
      }
      this.cdr.detectChanges();
    });
  }

  // ==========================================
  // VIEW SWITCHING
  // ==========================================

  switchToList(): void {
    this.activeView = 'list';
    this.loadFulfillmentPlans();
  }

  switchToDetail(): void {
    if (this.selectedPlan || this.targetQuoteId) {
      this.activeView = 'detail';
    }
  }

  openDetail(plan: FulfillmentPlan): void {
    this.selectedPlan = plan;
    this.targetQuoteId = plan.quotation?.id || plan.id;
    this.orderLines = plan.quotation?.lines || [];
    this.activeView = 'detail';
    // Reload latest live stocks
    this.loadWarehousesAndStocks();
  }

  // ==========================================
  // ACTIONS: ACCEPT SPLIT (Section 9)
  // ==========================================

  acceptSuggestedSplit(): void {
    if (!this.isAuthorized) {
      this.showToast('Restricted: Manager, Finance, or Admin authority required.', 'danger');
      return;
    }
    if (!this.selectedPlan?.id) return;

    this.actionLoading = true;
    this.fulfillmentService.acceptPlan(this.selectedPlan.id).pipe(
      timeout(10000),
      catchError((err: any) => {
        this.actionLoading = false;
        const msg = err?.error?.message || 'Inventory conflict: stock changed. Please re-run optimizer.';
        this.showToast(msg, 'danger');
        return of(null);
      })
    ).subscribe(updated => {
      this.actionLoading = false;
      if (updated?.id) {
        this.selectedPlan = updated;
        this.showToast('✅ Suggested split accepted! Physical inventory reserved and manifests confirmed.', 'success');
        this.loadWarehousesAndStocks();
        this.loadFulfillmentPlans();
      }
      this.cdr.detectChanges();
    });
  }

  // ==========================================
  // ACTIONS: RECOMPUTE SPLIT (Section 6 & 8)
  // ==========================================

  recomputeSplit(): void {
    const qId = this.selectedPlan?.quotation?.id || this.targetQuoteId;
    if (!qId) return;

    this.actionLoading = true;
    this.fulfillmentService.recomputePlan(qId).pipe(
      timeout(10000),
      catchError((err: any) => {
        this.actionLoading = false;
        this.showToast(err?.error?.message || 'Failed to recompute split.', 'danger');
        return of(null);
      })
    ).subscribe(updated => {
      this.actionLoading = false;
      if (updated?.id) {
        this.selectedPlan = updated;
        this.showToast('⚡ Greedy optimizer recomputed allocation across live warehouse stocks!', 'success');
        this.loadWarehousesAndStocks();
      }
      this.cdr.detectChanges();
    });
  }

  // ==========================================
  // ACTIONS: RE-EVALUATE BACKORDERS (Section 13)
  // ==========================================

  reEvaluateBackorders(): void {
    if (!this.selectedPlan?.id) return;

    this.actionLoading = true;
    this.fulfillmentService.reEvaluateBackorders(this.selectedPlan.id).pipe(
      timeout(10000),
      catchError((err: any) => {
        this.actionLoading = false;
        this.showToast(err?.error?.message || 'Failed to re-evaluate backorders.', 'danger');
        return of(null);
      })
    ).subscribe(updated => {
      this.actionLoading = false;
      if (updated?.id) {
        this.selectedPlan = updated;
        this.showToast('📦 Backorders re-evaluated against newly replenished warehouse stock!', 'success');
        this.loadWarehousesAndStocks();
        this.loadFulfillmentPlans();
      }
      this.cdr.detectChanges();
    });
  }

  // ==========================================
  // ACTIONS: MANUAL OVERRIDE (Section 10)
  // ==========================================

  openManualOverrideModal(): void {
    if (!this.isAuthorized) {
      this.showToast('Restricted: Manager, Finance, or Admin authority required.', 'danger');
      return;
    }
    this.overrideError = '';
    this.manualOverrideRows = [];

    // Pre-populate rows from current splits or order lines
    if (this.selectedPlan?.splits && this.selectedPlan.splits.length > 0) {
      this.manualOverrideRows = this.selectedPlan.splits.map(s => ({
        warehouseId: s.warehouse?.id || (this.warehouses[0]?.id || 1),
        productId: s.product?.id || (s as any).productId || 1,
        productName: s.product?.name || (s as any).productName || 'Product',
        quantity: s.quantity || 0,
        isBackorder: !!s.isBackorder,
        maxAvailable: this.getLiveAvailable(s.warehouse?.id, s.product?.id)
      }));
    } else {
      // Create a row for each line item
      this.orderLines.forEach(l => {
        this.manualOverrideRows.push({
          warehouseId: this.warehouses[0]?.id || 1,
          productId: l.product?.id || 1,
          productName: l.product?.name || 'Product',
          quantity: l.quantity || 1,
          isBackorder: false,
          maxAvailable: this.getLiveAvailable(this.warehouses[0]?.id, l.product?.id)
        });
      });
    }

    this.showManualOverrideModal = true;
  }

  closeManualOverrideModal(): void {
    this.showManualOverrideModal = false;
    this.overrideError = '';
  }

  addManualRow(): void {
    const firstProd = this.uniqueProductsInQuote[0];
    const firstWh = this.warehouses[0];
    this.manualOverrideRows.push({
      warehouseId: firstWh?.id || 1,
      productId: firstProd?.id || 1,
      productName: firstProd?.name || 'Product',
      quantity: 1,
      isBackorder: false,
      maxAvailable: this.getLiveAvailable(firstWh?.id, firstProd?.id)
    });
  }

  removeManualRow(idx: number): void {
    this.manualOverrideRows.splice(idx, 1);
  }

  onManualProductChange(row: ManualSplitRow): void {
    const prod = this.uniqueProductsInQuote.find(p => p.id === row.productId);
    if (prod) row.productName = prod.name;
    this.updateMaxAvailable(row);
  }

  updateMaxAvailable(row: ManualSplitRow): void {
    row.maxAvailable = this.getLiveAvailable(row.warehouseId, row.productId);
  }

  saveManualOverride(): void {
    this.overrideError = '';
    if (!this.selectedPlan?.id) return;

    // Validate rows
    for (const r of this.manualOverrideRows) {
      if (!r.isBackorder && r.quantity > r.maxAvailable) {
        this.overrideError = `Cannot allocate ${r.quantity} units of '${r.productName}'. Warehouse only has ${r.maxAvailable} available.`;
        return;
      }
      if (r.quantity < 0) {
        this.overrideError = `Quantity cannot be negative for '${r.productName}'.`;
        return;
      }
    }

    const payload = this.manualOverrideRows.map(r => ({
      warehouseId: r.warehouseId,
      productId: r.productId,
      quantity: r.quantity,
      isBackorder: r.isBackorder,
      shipmentGroup: 'MANUAL-OVERRIDE-01'
    }));

    this.actionLoading = true;
    this.fulfillmentService.overridePlan(this.selectedPlan.id, payload, this.overrideReason).pipe(
      timeout(10000),
      catchError((err: any) => {
        this.actionLoading = false;
        this.overrideError = err?.error?.message || 'Manual override validation failed in backend.';
        return of(null);
      })
    ).subscribe(updated => {
      this.actionLoading = false;
      if (updated?.id) {
        this.selectedPlan = updated;
        this.showManualOverrideModal = false;
        this.showToast('✅ Manual warehouse allocation override saved and validated!', 'success');
        this.loadWarehousesAndStocks();
        this.loadFulfillmentPlans();
      }
      this.cdr.detectChanges();
    });
  }

  // ==========================================
  // ACTIONS: FULFILL APPROVED QUOTATION MODAL
  // ==========================================

  openFulfillQuoteModal(): void {
    this.selectedQuoteToFulfill = null;
    this.quotationService.getQuotations().pipe(
      catchError(() => of([] as Quotation[]))
    ).subscribe(quotes => {
      // Filter quotes that are APPROVED or CONFIRMED
      this.approvedQuotes = (quotes || []).filter(q =>
        q.status === 'APPROVED' || q.status === 'CONFIRMED'
      );
      this.showFulfillQuoteModal = true;
      this.cdr.detectChanges();
    });
  }

  closeFulfillQuoteModal(): void {
    this.showFulfillQuoteModal = false;
    this.selectedQuoteToFulfill = null;
  }

  generateFulfillmentForSelectedQuote(): void {
    if (!this.selectedQuoteToFulfill?.id) return;

    this.actionLoading = true;
    const qId = this.selectedQuoteToFulfill.id;
    this.fulfillmentService.recomputePlan(qId).pipe(
      timeout(10000),
      catchError((err: any) => {
        this.actionLoading = false;
        this.showToast(err?.error?.message || 'Failed to generate fulfillment for quote #' + qId, 'danger');
        return of(null);
      })
    ).subscribe(plan => {
      this.actionLoading = false;
      this.showFulfillQuoteModal = false;
      if (plan?.id) {
        this.selectedPlan = plan;
        this.targetQuoteId = qId;
        this.orderLines = plan.quotation?.lines || [];
        this.activeView = 'detail';
        this.showToast(`✅ Multi-warehouse fulfillment plan generated for Quote #${plan.quotation?.quoteNumber || qId}!`, 'success');
        this.loadFulfillmentPlans();
      }
      this.cdr.detectChanges();
    });
  }

  // ==========================================
  // HELPERS & GETTERS
  // ==========================================

  get filteredPlans(): FulfillmentPlan[] {
    let list = this.plans || [];
    if (this.statusFilter !== 'ALL') {
      list = list.filter(p => p.status === this.statusFilter);
    }
    if (this.searchQuery && this.searchQuery.trim()) {
      const q = this.searchQuery.trim().toLowerCase();
      list = list.filter(p =>
        ('ful-2026-' + p.id).toLowerCase().includes(q) ||
        (p.quotation?.quoteNumber || '').toLowerCase().includes(q) ||
        (p.quotation?.customer?.name || '').toLowerCase().includes(q) ||
        (p.status || '').toLowerCase().includes(q)
      );
    }
    return list;
  }

  getStatusCount(status: string): number {
    return (this.plans || []).filter(p => p.status === status).length;
  }

  getTotalRequestedUnits(plan: FulfillmentPlan): number {
    if (!plan.quotation?.lines) return 0;
    return plan.quotation.lines.reduce((sum, l) => sum + (l.quantity || 0), 0);
  }

  getTotalAllocatedUnits(plan: FulfillmentPlan): number {
    if (!plan.splits) return 0;
    return plan.splits.filter(s => !s.isBackorder).reduce((sum, s) => sum + (s.quantity || 0), 0);
  }

  getTotalBackorderedUnits(plan: FulfillmentPlan): number {
    if (!plan.splits) return 0;
    return plan.splits.filter(s => s.isBackorder).reduce((sum, s) => sum + (s.quantity || 0), 0);
  }

  getProductAllocatedQty(productId?: number): number {
    if (!productId || !this.selectedPlan?.splits) return 0;
    return this.selectedPlan.splits
      .filter(s => !s.isBackorder && (s.product?.id === productId || (s as any).productId === productId))
      .reduce((sum, s) => sum + (s.quantity || 0), 0);
  }

  getProductBackorderedQty(productId?: number): number {
    if (!productId || !this.selectedPlan?.splits) return 0;
    return this.selectedPlan.splits
      .filter(s => s.isBackorder && (s.product?.id === productId || (s as any).productId === productId))
      .reduce((sum, s) => sum + (s.quantity || 0), 0);
  }

  getCoveragePercent(line: any): number {
    const requested = line.quantity || 1;
    const allocated = this.getProductAllocatedQty(line.product?.id);
    return Math.min(100, Math.round((allocated / requested) * 100));
  }

  get hasBackorders(): boolean {
    if (!this.selectedPlan?.splits) return false;
    return this.selectedPlan.splits.some(s => s.isBackorder || s.status === 'BACKORDERED');
  }

  get uniqueProductsInQuote(): any[] {
    const map = new Map<number, any>();
    this.orderLines.forEach(l => {
      if (l.product && !map.has(l.product.id)) {
        map.set(l.product.id, l.product);
      }
    });
    return Array.from(map.values());
  }

  getLiveAvailable(warehouseId?: number, productId?: number): number {
    if (!warehouseId || !productId) return 0;
    const stock = this.warehouseStocks.find(s => s.warehouse?.id === warehouseId && s.product?.id === productId);
    return stock?.available ?? 0;
  }

  get currentQuotationNumber(): string {
    return this.selectedPlan?.quotation?.quoteNumber || ('Q-' + (this.targetQuoteId || ''));
  }

  get currentCustomerName(): string {
    return this.selectedPlan?.quotation?.customer?.name || '';
  }

  formatStatusLabel(status: string): string {
    switch (status) {
      case 'ALLOCATION_SUGGESTED': return 'Allocation Suggested';
      case 'SPLIT_PENDING': return 'Split Pending';
      case 'PARTIALLY_FULFILLED': return 'Partially Fulfilled';
      case 'BACKORDERED': return 'Backordered';
      case 'FULFILLED': return 'Fulfilled';
      case 'OVERRIDDEN': return 'Overridden';
      case 'PENDING': return 'Pending';
      case 'CANCELLED': return 'Cancelled';
      default: return status || 'Pending';
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'FULFILLED': return 'badge-success';
      case 'ALLOCATION_SUGGESTED':
      case 'SPLIT_PENDING': return 'badge-primary';
      case 'PARTIALLY_FULFILLED':
      case 'BACKORDERED': return 'badge-warning';
      case 'OVERRIDDEN': return 'badge-neutral';
      default: return 'badge-info';
    }
  }

  formatCurrency(val: number): string {
    return '$' + (Number(val) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  showToast(msg: string, type: 'success' | 'danger' = 'success'): void {
    this.toastMessage = msg;
    this.toastType = type;
    setTimeout(() => {
      this.toastMessage = '';
    }, 4500);
  }
}
