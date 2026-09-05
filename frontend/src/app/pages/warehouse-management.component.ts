import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { FulfillmentService } from '../services/fulfillment.service';
import { CatalogService } from '../services/catalog.service';
import { AuthService } from '../services/auth.service';
import { Warehouse, WarehouseStock, Product } from '../models/dealflow.model';

@Component({
  selector: 'app-warehouse-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="page-content">

      <!-- Global Toast Alert -->
      <div *ngIf="toastMessage" class="toast-floating" [class.toast-danger]="toastType === 'danger'">
        <span class="toast-icon">{{ toastType === 'danger' ? '⚠️' : '✅' }}</span>
        <span>{{ toastMessage }}</span>
      </div>

      <!-- VIEW 1: WAREHOUSE LIST -->
      <div *ngIf="viewMode === 'LIST'">
        <!-- Page Header -->
        <div class="header-banner flex items-center justify-between mb-6">
          <div>
            <div class="header-eyebrow">SUPPLY CHAIN & LOGISTICS</div>
            <h1 class="text-xl font-bold text-primary">Warehouse & Inventory Management</h1>
            <p class="text-sm text-muted mt-1">
              Configure distribution facilities, freight weight parameters, and live multi-warehouse product stock levels
            </p>
          </div>
          <div class="flex items-center gap-3">
            <button class="btn btn-secondary" (click)="loadWarehouses()" [disabled]="loading">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
              </svg>
              Refresh
            </button>
            <button class="btn btn-primary" (click)="openCreateWarehouse()" *ngIf="isAdmin">
              <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              Add Warehouse
            </button>
          </div>
        </div>

        <!-- KPI Metrics Grid -->
        <div class="grid-4 mb-6">
          <div class="stat-card">
            <div class="stat-icon" style="background: #eff6ff; color: #2563eb;">🏢</div>
            <div class="stat-value">{{ warehouses.length }}</div>
            <div class="stat-label">Total Facilities</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background: #ecfdf5; color: #059669;">📦</div>
            <div class="stat-value">{{ activeWarehousesCount }}</div>
            <div class="stat-label">Active Facilities</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background: #f0fdf4; color: #16a34a;">⚡</div>
            <div class="stat-value">{{ totalInventoryUnits }}</div>
            <div class="stat-label">Total Units on Hand</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background: #fffbeb; color: #d97706;">⚠️</div>
            <div class="stat-value">{{ lowStockAlertsCount }}</div>
            <div class="stat-label">Low Stock Alerts</div>
          </div>
        </div>

        <!-- Filter & Search Toolbar -->
        <div class="card mb-4">
          <div class="table-toolbar">
            <div class="search-input-wrapper">
              <svg class="search-icon" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                class="search-input"
                placeholder="Search by warehouse code, name, or city..."
                [(ngModel)]="searchWarehouse"
              />
            </div>
            <select class="form-control" style="width: auto;" [(ngModel)]="statusFilter">
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          <!-- Loading State -->
          <div *ngIf="loading" class="text-center py-12">
            <div class="spinner"></div>
            <p class="text-sm text-muted mt-3">Loading warehouse facilities from database...</p>
          </div>

          <!-- Empty State -->
          <div *ngIf="!loading && filteredWarehouses.length === 0" class="text-center py-12">
            <div style="font-size: 36px; margin-bottom: 8px;">🏭</div>
            <h3 class="font-bold text-gray-800">No Warehouses Found</h3>
            <p class="text-sm text-muted mt-1">
              {{ searchWarehouse ? 'No warehouses match your search query.' : 'No distribution warehouses exist yet.' }}
            </p>
            <button class="btn btn-primary mt-4" (click)="openCreateWarehouse()" *ngIf="isAdmin">
              Create Your First Warehouse
            </button>
          </div>

          <!-- Warehouses Table -->
          <div class="table-container" *ngIf="!loading && filteredWarehouses.length > 0" style="border:none; border-radius:0;">
            <table class="table-custom">
              <thead>
                <tr>
                  <th>Facility Code</th>
                  <th>Warehouse Name</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Shipping Cost Weight</th>
                  <th>Base Freight</th>
                  <th>Created</th>
                  <th style="text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let wh of filteredWarehouses; trackBy: trackWarehouse">
                  <td>
                    <span class="facility-code-pill font-mono">{{ wh.warehouseCode || wh.code || ('WH-' + wh.id) }}</span>
                  </td>
                  <td>
                    <a [routerLink]="['/dashboard/warehouses', wh.id]" class="facility-name-link font-semibold">
                      {{ wh.name || wh.warehouseName }}
                    </a>
                  </td>
                  <td>
                    <span class="location-text">📍 {{ wh.location }}</span>
                  </td>
                  <td>
                    <span class="badge" [class.badge-success]="(wh.status || 'ACTIVE') === 'ACTIVE'" [class.badge-secondary]="wh.status === 'INACTIVE'">
                      {{ wh.status || 'ACTIVE' }}
                    </span>
                  </td>
                  <td>
                    <span class="weight-tag font-mono font-bold">{{ wh.shippingCostWeight || 1.0 | number:'1.2-2' }}x</span>
                  </td>
                  <td>
                    <span class="text-sm font-mono">\${{ wh.baseFreight || 20.0 | number:'1.2-2' }}</span>
                  </td>
                  <td class="text-muted text-xs">
                    {{ wh.createdAt ? (wh.createdAt | date:'shortDate') : 'Seeded' }}
                  </td>
                  <td style="text-align: right;">
                    <div class="flex items-center justify-end gap-2">
                      <a [routerLink]="['/dashboard/warehouses', wh.id]" class="btn btn-secondary btn-sm" title="View Details & Manage Inventory">
                        <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                        </svg>
                        Inventory
                      </a>
                      <button class="btn btn-secondary btn-sm" (click)="openEditWarehouse(wh)" *ngIf="isAdmin" title="Edit Warehouse">
                        <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        Edit
                      </button>
                      <button class="btn btn-danger-ghost btn-sm" (click)="openDeleteWarehouse(wh)" *ngIf="isAdmin" title="Delete Warehouse">
                        <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                          <path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- VIEW 2: WAREHOUSE DETAIL & INVENTORY -->
      <div *ngIf="viewMode === 'DETAIL' && selectedWarehouse">
        <!-- Breadcrumb & Detail Header -->
        <div class="mb-5 flex items-center justify-between">
          <div class="breadcrumb">
            <a routerLink="/dashboard/warehouses" class="breadcrumb-link flex items-center gap-1">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              Warehouses
            </a>
            <span class="breadcrumb-sep">/</span>
            <span class="breadcrumb-current">{{ selectedWarehouse.name }}</span>
          </div>

          <div class="flex items-center gap-3">
            <button class="btn btn-secondary btn-sm" (click)="loadWarehouseDetail(selectedWarehouse.id)" [disabled]="loadingStocks">
              <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
              </svg>
              Refresh
            </button>
            <button class="btn btn-secondary btn-sm" (click)="openEditWarehouse(selectedWarehouse)" *ngIf="isAdmin">
              <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Edit Facility
            </button>
            <button class="btn btn-primary btn-sm" (click)="openAddInventory()" *ngIf="isAdmin">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              Add Inventory
            </button>
          </div>
        </div>

        <!-- Warehouse Facility Overview Card -->
        <div class="card mb-6 warehouse-overview-card">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div class="flex items-center gap-4">
              <div class="facility-hero-icon">🏢</div>
              <div>
                <div class="flex items-center gap-2">
                  <h2 class="text-lg font-bold text-gray-900 m-0">{{ selectedWarehouse.name }}</h2>
                  <span class="facility-code-pill font-mono">{{ selectedWarehouse.warehouseCode || selectedWarehouse.code || ('WH-' + selectedWarehouse.id) }}</span>
                  <span class="badge" [class.badge-success]="(selectedWarehouse.status || 'ACTIVE') === 'ACTIVE'" [class.badge-secondary]="selectedWarehouse.status === 'INACTIVE'">
                    {{ selectedWarehouse.status || 'ACTIVE' }}
                  </span>
                </div>
                <div class="text-sm text-muted mt-1 flex items-center gap-4">
                  <span>📍 {{ selectedWarehouse.location }}</span>
                  <span>•</span>
                  <span>Shipping Cost Weight: <strong class="text-primary font-mono">{{ selectedWarehouse.shippingCostWeight || 1.0 }}x</strong></span>
                  <span>•</span>
                  <span>Base Freight: <strong class="font-mono">\${{ selectedWarehouse.baseFreight || 20.0 | number:'1.2-2' }}</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Inventory Summary Stats -->
        <div class="grid-4 mb-5">
          <div class="stat-card">
            <div class="stat-icon" style="background:#f0f9ff; color:#0284c7;">📦</div>
            <div class="stat-value">{{ stocks.length }}</div>
            <div class="stat-label">Unique Products (SKUs)</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background:#f0fdf4; color:#16a34a;">🟢</div>
            <div class="stat-value">{{ warehouseAvailableUnits }}</div>
            <div class="stat-label">Available for Sale</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background:#eff6ff; color:#3b82f6;">🔒</div>
            <div class="stat-value">{{ warehouseReservedUnits }}</div>
            <div class="stat-label">Reserved for Orders</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background:#fffbeb; color:#d97706;">⚠️</div>
            <div class="stat-value">{{ warehouseLowStockCount }}</div>
            <div class="stat-label">Low Stock SKUs</div>
          </div>
        </div>

        <!-- Inventory Table Card -->
        <div class="card mb-6">
          <div class="table-toolbar">
            <div class="search-input-wrapper">
              <svg class="search-icon" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                class="search-input"
                placeholder="Filter by product name..."
                [(ngModel)]="searchInventory"
              />
            </div>
            <select class="form-control" style="width: auto;" [(ngModel)]="stockStatusFilter">
              <option value="ALL">All Stock Levels</option>
              <option value="NORMAL">Normal</option>
              <option value="LOW STOCK">Low Stock</option>
              <option value="OUT OF STOCK">Out of Stock</option>
            </select>
          </div>

          <!-- Loading State -->
          <div *ngIf="loadingStocks" class="text-center py-12">
            <div class="spinner"></div>
            <p class="text-sm text-muted mt-3">Loading inventory stock records...</p>
          </div>

          <!-- Empty State -->
          <div *ngIf="!loadingStocks && filteredStocks.length === 0" class="text-center py-12">
            <div style="font-size: 36px; margin-bottom: 8px;">📦</div>
            <h3 class="font-bold text-gray-800">No Inventory in this Warehouse</h3>
            <p class="text-sm text-muted mt-1">
              {{ searchInventory ? 'No items match your filter.' : 'This warehouse has no products assigned to it yet.' }}
            </p>
            <button class="btn btn-primary mt-4" (click)="openAddInventory()" *ngIf="isAdmin">
              + Add Product Inventory
            </button>
          </div>

          <!-- Inventory Table -->
          <div class="table-container" *ngIf="!loadingStocks && filteredStocks.length > 0" style="border:none; border-radius:0;">
            <table class="table-custom">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th style="text-align: right;">Total In Stock</th>
                  <th style="text-align: right;">Reserved</th>
                  <th style="text-align: right;">Available</th>
                  <th style="text-align: right;">Reorder Level</th>
                  <th>Stock Status</th>
                  <th style="text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let s of filteredStocks; trackBy: trackStock">
                  <td>
                    <div class="font-semibold text-gray-900">{{ s.product?.name || 'Unknown Product' }}</div>
                    <div class="text-xs text-muted font-mono">Product ID: #{{ s.product?.id }}</div>
                  </td>
                  <td>
                    <span class="badge badge-secondary text-xs">
                      {{ s.product?.category?.name || 'General' }}
                    </span>
                  </td>
                  <td style="text-align: right;">
                    <span class="font-mono font-bold text-gray-800">{{ s.inStock }}</span>
                  </td>
                  <td style="text-align: right;">
                    <span class="font-mono" [class.text-amber-600]="s.reserved > 0" [class.text-gray-400]="s.reserved === 0">
                      {{ s.reserved }}
                    </span>
                  </td>
                  <td style="text-align: right;">
                    <span class="font-mono font-bold" [class.text-emerald-600]="s.available >= s.reorderLevel" [class.text-amber-600]="s.available < s.reorderLevel && s.available > 0" [class.text-rose-600]="s.available <= 0">
                      {{ s.available }}
                    </span>
                  </td>
                  <td style="text-align: right;">
                    <span class="font-mono text-gray-600">{{ s.reorderLevel }}</span>
                  </td>
                  <td>
                    <span class="stock-badge" [ngClass]="getStockStatusClass(s)">
                      <span class="stock-dot"></span>
                      {{ getStockStatusLabel(s) }}
                    </span>
                  </td>
                  <td style="text-align: right;">
                    <div class="flex items-center justify-end gap-2">
                      <button class="btn btn-secondary btn-sm" (click)="openEditInventory(s)" *ngIf="isAdmin" title="Edit Inventory Levels">
                        <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        Edit
                      </button>
                      <button class="btn btn-danger-ghost btn-sm" (click)="openDeleteInventory(s)" *ngIf="isAdmin" title="Delete Inventory Item">
                        <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                          <path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- MODAL: CREATE / EDIT WAREHOUSE -->
      <div class="modal-backdrop" *ngIf="warehouseModalOpen" (click)="closeWarehouseModal()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 class="modal-title font-bold text-gray-900">
              {{ warehouseEditMode ? 'Edit Warehouse Facility' : 'Create New Warehouse' }}
            </h3>
            <button class="close-btn" (click)="closeWarehouseModal()">&times;</button>
          </div>

          <div class="modal-body">
            <div *ngIf="warehouseFormError" class="alert-banner mb-4">
              <span>⚠️ {{ warehouseFormError }}</span>
            </div>

            <div class="form-group mb-3">
              <label class="form-label">Warehouse Code <span class="text-rose-500">*</span></label>
              <input
                type="text"
                class="form-control font-mono uppercase"
                placeholder="e.g. WH-003"
                [(ngModel)]="warehouseForm.code"
                (ngModelChange)="warehouseForm.code = $event.toUpperCase()"
                maxlength="50"
              />
              <span class="text-xs text-muted">Unique identifier for this facility (e.g. WH-001, WH-002)</span>
            </div>

            <div class="form-group mb-3">
              <label class="form-label">Warehouse Name <span class="text-rose-500">*</span></label>
              <input
                type="text"
                class="form-control"
                placeholder="e.g. West Coast Distribution Center"
                [(ngModel)]="warehouseForm.name"
              />
            </div>

            <div class="form-group mb-3">
              <label class="form-label">Location / Address <span class="text-rose-500">*</span></label>
              <input
                type="text"
                class="form-control"
                placeholder="e.g. Seattle, WA"
                [(ngModel)]="warehouseForm.location"
              />
            </div>

            <div class="grid-2 gap-3 mb-3">
              <div class="form-group">
                <label class="form-label">Status</label>
                <select class="form-control" [(ngModel)]="warehouseForm.status">
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Shipping Cost Weight <span class="text-rose-500">*</span></label>
                <input
                  type="number"
                  step="0.05"
                  min="0.1"
                  class="form-control font-mono"
                  placeholder="1.00"
                  [(ngModel)]="warehouseForm.shippingCostWeight"
                />
                <span class="text-xs text-muted">Used by optimizer split logic (e.g. 1.00, 1.40)</span>
              </div>
            </div>

            <div class="form-group mb-3">
              <label class="form-label">Base Freight (\$) <span class="text-rose-500">*</span></label>
              <input
                type="number"
                step="1"
                min="0"
                class="form-control font-mono"
                placeholder="20.00"
                [(ngModel)]="warehouseForm.baseFreight"
              />
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeWarehouseModal()" [disabled]="warehouseSubmitting">
              Cancel
            </button>
            <button class="btn btn-primary" (click)="saveWarehouse()" [disabled]="warehouseSubmitting">
              <span *ngIf="warehouseSubmitting" class="spinner-sm mr-2"></span>
              {{ warehouseEditMode ? 'Update Warehouse' : 'Save Warehouse' }}
            </button>
          </div>
        </div>
      </div>

      <!-- MODAL: ADD INVENTORY -->
      <div class="modal-backdrop" *ngIf="inventoryModalOpen" (click)="closeInventoryModal()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 class="modal-title font-bold text-gray-900">
              {{ inventoryEditMode ? 'Edit Stock Levels' : 'Add Inventory to Warehouse' }}
            </h3>
            <button class="close-btn" (click)="closeInventoryModal()">&times;</button>
          </div>

          <div class="modal-body">
            <div *ngIf="inventoryFormError" class="alert-banner mb-4">
              <span>⚠️ {{ inventoryFormError }}</span>
            </div>

            <div class="form-group mb-3" *ngIf="!inventoryEditMode">
              <label class="form-label">Select Product <span class="text-rose-500">*</span></label>
              <select class="form-control" [(ngModel)]="inventoryForm.productId">
                <option [ngValue]="0" disabled>-- Select a Catalog Product --</option>
                <option *ngFor="let p of availableProducts" [ngValue]="p.id">
                  {{ p.name }} ({{ p.category?.name || 'General' }}) - Base: \${{ p.basePrice }}
                </option>
              </select>
            </div>

            <div class="form-group mb-3" *ngIf="inventoryEditMode">
              <label class="form-label">Product</label>
              <input type="text" class="form-control bg-gray-50" [value]="inventoryForm.productName" disabled />
            </div>

            <div class="grid-2 gap-3 mb-3">
              <div class="form-group">
                <label class="form-label">In-Stock Quantity <span class="text-rose-500">*</span></label>
                <input
                  type="number"
                  min="0"
                  class="form-control font-mono font-bold"
                  placeholder="0"
                  [(ngModel)]="inventoryForm.inStock"
                />
                <span class="text-xs text-muted">Total physical quantity on hand</span>
              </div>
              <div class="form-group">
                <label class="form-label">Reserved Quantity</label>
                <input
                  type="number"
                  min="0"
                  class="form-control font-mono"
                  placeholder="0"
                  [(ngModel)]="inventoryForm.reserved"
                />
                <span class="text-xs text-muted">Committed to active orders</span>
              </div>
            </div>

            <div class="form-group mb-3">
              <label class="form-label">Reorder Level <span class="text-rose-500">*</span></label>
              <input
                type="number"
                min="0"
                class="form-control font-mono"
                placeholder="10"
                [(ngModel)]="inventoryForm.reorderLevel"
              />
              <span class="text-xs text-muted">Triggers "LOW STOCK" alert when available falls below this</span>
            </div>

            <div class="preview-box p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-900">
              <div class="flex justify-between mb-1">
                <span>Calculated Available:</span>
                <strong class="font-mono">{{ (inventoryForm.inStock || 0) - (inventoryForm.reserved || 0) }} units</strong>
              </div>
              <div class="flex justify-between">
                <span>Resulting Status:</span>
                <strong [class.text-emerald-700]="((inventoryForm.inStock || 0) - (inventoryForm.reserved || 0)) >= (inventoryForm.reorderLevel || 10)" [class.text-amber-700]="((inventoryForm.inStock || 0) - (inventoryForm.reserved || 0)) < (inventoryForm.reorderLevel || 10)">
                  {{ ((inventoryForm.inStock || 0) - (inventoryForm.reserved || 0)) <= 0 ? 'OUT OF STOCK' : (((inventoryForm.inStock || 0) - (inventoryForm.reserved || 0)) < (inventoryForm.reorderLevel || 10) ? 'LOW STOCK' : 'NORMAL') }}
                </strong>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeInventoryModal()" [disabled]="inventorySubmitting">
              Cancel
            </button>
            <button class="btn btn-primary" (click)="saveInventory()" [disabled]="inventorySubmitting">
              <span *ngIf="inventorySubmitting" class="spinner-sm mr-2"></span>
              {{ inventoryEditMode ? 'Update Stock' : 'Add to Warehouse' }}
            </button>
          </div>
        </div>
      </div>

      <!-- MODAL: DELETE CONFIRMATION -->
      <div class="modal-backdrop" *ngIf="deleteWarehouseModalOpen" (click)="closeDeleteWarehouseModal()">
        <div class="modal-card modal-sm" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 class="modal-title font-bold text-rose-600">Delete Warehouse Facility</h3>
            <button class="close-btn" (click)="closeDeleteWarehouseModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div *ngIf="deleteWarehouseError" class="alert-banner mb-3">
              <span>⚠️ {{ deleteWarehouseError }}</span>
            </div>
            <p class="text-sm text-gray-700">
              Are you sure you want to delete warehouse <strong>{{ warehouseToDelete?.name }}</strong> ({{ warehouseToDelete?.warehouseCode || warehouseToDelete?.code }})?
            </p>
            <p class="text-xs text-muted mt-2">
              Note: Warehouses holding reserved inventory or tied to active fulfillment splits cannot be deleted.
            </p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeDeleteWarehouseModal()" [disabled]="deleteWarehouseSubmitting">
              Cancel
            </button>
            <button class="btn btn-danger" (click)="confirmDeleteWarehouse()" [disabled]="deleteWarehouseSubmitting">
              <span *ngIf="deleteWarehouseSubmitting" class="spinner-sm mr-2"></span>
              Delete Facility
            </button>
          </div>
        </div>
      </div>

      <!-- MODAL: DELETE INVENTORY CONFIRMATION -->
      <div class="modal-backdrop" *ngIf="deleteInventoryModalOpen" (click)="closeDeleteInventoryModal()">
        <div class="modal-card modal-sm" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 class="modal-title font-bold text-rose-600">Delete Inventory Record</h3>
            <button class="close-btn" (click)="closeDeleteInventoryModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div *ngIf="deleteInventoryError" class="alert-banner mb-3">
              <span>⚠️ {{ deleteInventoryError }}</span>
            </div>
            <p class="text-sm text-gray-700">
              Remove <strong>{{ stockToDelete?.product?.name }}</strong> inventory from {{ selectedWarehouse?.name }}?
            </p>
            <p class="text-xs text-muted mt-2">
              If this item has reserved units for pending customer orders, the deletion will be safely rejected.
            </p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeDeleteInventoryModal()" [disabled]="deleteInventorySubmitting">
              Cancel
            </button>
            <button class="btn btn-danger" (click)="confirmDeleteInventory()" [disabled]="deleteInventorySubmitting">
              <span *ngIf="deleteInventorySubmitting" class="spinner-sm mr-2"></span>
              Delete Item
            </button>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .page-content {
      padding: 24px 32px;
      max-width: 1440px;
      margin: 0 auto;
    }

    .header-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header-eyebrow {
      font-size: 11px;
      font-weight: 700;
      color: #2563eb;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 2px;
    }

    .card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      overflow: hidden;
    }

    .warehouse-overview-card {
      padding: 20px 24px;
      background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
      border-left: 4px solid #2563eb;
    }

    .facility-hero-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: #eff6ff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
    }

    .facility-code-pill {
      display: inline-block;
      padding: 2px 8px;
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
    }

    .facility-name-link {
      color: #0f172a;
      text-decoration: none;
      transition: color 0.15s;
    }

    .facility-name-link:hover {
      color: #2563eb;
    }

    .location-text {
      font-size: 13px;
      color: #475569;
    }

    .weight-tag {
      display: inline-block;
      padding: 2px 6px;
      background: #f1f5f9;
      border-radius: 4px;
      color: #334155;
      font-size: 12px;
    }

    /* Grid & Stats */
    .grid-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }

    .grid-2 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .stat-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 16px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.03);
    }

    .stat-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }

    .stat-value {
      font-size: 24px;
      font-weight: 700;
      color: #0f172a;
      margin: 6px 0 2px;
    }

    .stat-label {
      font-size: 12px;
      color: #64748b;
      font-weight: 500;
    }

    /* Table Toolbar */
    .table-toolbar {
      padding: 14px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 1px solid #e2e8f0;
      background: #fafafa;
    }

    .search-input-wrapper {
      position: relative;
      flex: 1;
      max-width: 380px;
    }

    .search-icon {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      color: #94a3b8;
    }

    .search-input {
      width: 100%;
      padding: 7px 12px 7px 32px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 13px;
      background: #ffffff;
      color: #0f172a;
      outline: none;
    }

    .search-input:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
    }

    /* Tables */
    .table-container {
      overflow-x: auto;
    }

    .table-custom {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    .table-custom th {
      background: #f8fafc;
      color: #475569;
      font-weight: 600;
      padding: 12px 18px;
      border-bottom: 1px solid #e2e8f0;
      text-align: left;
    }

    .table-custom td {
      padding: 14px 18px;
      border-bottom: 1px solid #f1f5f9;
      color: #1e293b;
      vertical-align: middle;
    }

    .table-custom tr:hover td {
      background: #f8fafc;
    }

    /* Badges */
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.02em;
    }

    .badge-success {
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
    }

    .badge-secondary {
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #e2e8f0;
    }

    /* Stock Status Badges */
    .stock-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
    }

    .stock-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }

    .stock-normal {
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
    }
    .stock-normal .stock-dot { background: #10b981; }

    .stock-low {
      background: #fffbeb;
      color: #92400e;
      border: 1px solid #fde68a;
    }
    .stock-low .stock-dot { background: #f59e0b; }

    .stock-out {
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }
    .stock-out .stock-dot { background: #ef4444; }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.15s ease;
      text-decoration: none;
    }

    .btn-sm {
      padding: 5px 10px;
      font-size: 12px;
    }

    .btn-primary {
      background: #2563eb;
      color: #ffffff;
      border-color: #2563eb;
    }
    .btn-primary:hover:not(:disabled) {
      background: #1d4ed8;
      border-color: #1d4ed8;
    }

    .btn-secondary {
      background: #ffffff;
      color: #334155;
      border-color: #cbd5e1;
    }
    .btn-secondary:hover:not(:disabled) {
      background: #f8fafc;
      border-color: #94a3b8;
    }

    .btn-danger {
      background: #dc2626;
      color: #ffffff;
      border-color: #dc2626;
    }
    .btn-danger:hover:not(:disabled) {
      background: #b91c1c;
    }

    .btn-danger-ghost {
      background: transparent;
      color: #ef4444;
      border-color: #fecaca;
    }
    .btn-danger-ghost:hover:not(:disabled) {
      background: #fee2e2;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* Breadcrumbs */
    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
    }

    .breadcrumb-link {
      color: #64748b;
      text-decoration: none;
      font-weight: 500;
    }
    .breadcrumb-link:hover {
      color: #2563eb;
    }

    .breadcrumb-sep {
      color: #cbd5e1;
    }

    .breadcrumb-current {
      color: #0f172a;
      font-weight: 600;
    }

    /* Forms & Inputs */
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .form-label {
      font-size: 12px;
      font-weight: 600;
      color: #334155;
    }

    .form-control {
      padding: 7px 10px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 13px;
      color: #0f172a;
      background: #ffffff;
      outline: none;
    }
    .form-control:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
    }

    /* Modals */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.5);
      backdrop-filter: blur(2px);
      z-index: 50;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .modal-card {
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      width: 100%;
      max-width: 520px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .modal-card.modal-sm {
      max-width: 420px;
    }

    .modal-header {
      padding: 16px 20px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .modal-title {
      margin: 0;
      font-size: 16px;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 22px;
      color: #94a3b8;
      cursor: pointer;
      line-height: 1;
    }
    .close-btn:hover {
      color: #0f172a;
    }

    .modal-body {
      padding: 20px;
      max-height: calc(85vh - 120px);
      overflow-y: auto;
    }

    .modal-footer {
      padding: 14px 20px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      background: #f8fafc;
    }

    .alert-banner {
      padding: 10px 14px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 6px;
      color: #991b1b;
      font-size: 13px;
    }

    /* Floating Toast */
    .toast-floating {
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 100;
      padding: 12px 18px;
      background: #0f172a;
      color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2);
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      animation: fadeInSlide 0.2s ease-out;
    }

    .toast-danger {
      background: #991b1b;
    }

    @keyframes fadeInSlide {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .spinner {
      border: 3px solid rgba(0,0,0,0.1);
      border-top-color: #2563eb;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      animation: spin 0.8s linear infinite;
      margin: 0 auto;
    }

    .spinner-sm {
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #ffffff;
      border-radius: 50%;
      width: 12px;
      height: 12px;
      display: inline-block;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @media (max-width: 900px) {
      .grid-4 {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `]
})
export class WarehouseManagementComponent implements OnInit, OnDestroy {
  viewMode: 'LIST' | 'DETAIL' = 'LIST';

  warehouses: Warehouse[] = [];
  selectedWarehouse: Warehouse | null = null;
  stocks: WarehouseStock[] = [];
  availableProducts: Product[] = [];

  loading: boolean = false;
  loadingStocks: boolean = false;
  isAdmin: boolean = false;

  searchWarehouse: string = '';
  statusFilter: string = 'ALL';
  searchInventory: string = '';
  stockStatusFilter: string = 'ALL';

  // Toast
  toastMessage: string = '';
  toastType: 'success' | 'danger' = 'success';
  private toastTimer: any;

  // Warehouse Modal
  warehouseModalOpen: boolean = false;
  warehouseEditMode: boolean = false;
  warehouseForm = {
    id: 0,
    code: '',
    name: '',
    location: '',
    status: 'ACTIVE',
    shippingCostWeight: 1.00,
    baseFreight: 20.00
  };
  warehouseFormError: string = '';
  warehouseSubmitting: boolean = false;

  // Delete Warehouse Modal
  deleteWarehouseModalOpen: boolean = false;
  warehouseToDelete: Warehouse | null = null;
  deleteWarehouseError: string = '';
  deleteWarehouseSubmitting: boolean = false;

  // Inventory Modal
  inventoryModalOpen: boolean = false;
  inventoryEditMode: boolean = false;
  inventoryForm = {
    id: 0,
    warehouseId: 0,
    productId: 0,
    productName: '',
    inStock: 0,
    reserved: 0,
    reorderLevel: 10
  };
  inventoryFormError: string = '';
  inventorySubmitting: boolean = false;

  // Delete Inventory Modal
  deleteInventoryModalOpen: boolean = false;
  stockToDelete: WarehouseStock | null = null;
  deleteInventoryError: string = '';
  deleteInventorySubmitting: boolean = false;

  private subs = new Subscription();

  constructor(
    private fulfillmentService: FulfillmentService,
    private catalogService: CatalogService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const role = this.authService.currentRole;
    this.isAdmin = (role === 'ADMIN');

    // Subscribe to route changes
    this.subs.add(
      this.route.params.subscribe(params => {
        const id = params['id'];
        if (id) {
          this.viewMode = 'DETAIL';
          this.loadWarehouseDetail(+id);
        } else {
          this.viewMode = 'LIST';
          this.loadWarehouses();
        }

        // Check if route ended in /new
        if (this.router.url.includes('/warehouses/new')) {
          this.openCreateWarehouse();
        }
      })
    );

    // Load active products for inventory selection dropdown
    this.loadProducts();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  // ─── Data Loading ─────────────────────────────────────────────────────────────

  loadWarehouses(): void {
    this.loading = true;
    this.fulfillmentService.getWarehouses().subscribe({
      next: (data) => {
        this.warehouses = data || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.showToast(err?.error?.message || 'Failed to load warehouses.', 'danger');
        this.cdr.detectChanges();
      }
    });
  }

  loadWarehouseDetail(id: number): void {
    this.loadingStocks = true;
    this.fulfillmentService.getWarehouseById(id).subscribe({
      next: (wh) => {
        this.selectedWarehouse = wh;
        this.loadStocksForWarehouse(id);
      },
      error: (err) => {
        this.loadingStocks = false;
        this.showToast(err?.error?.message || 'Warehouse not found.', 'danger');
        this.router.navigate(['/dashboard/warehouses']);
      }
    });
  }

  loadStocksForWarehouse(warehouseId: number): void {
    this.loadingStocks = true;
    this.fulfillmentService.getStocks(warehouseId).subscribe({
      next: (stocks) => {
        this.stocks = stocks || [];
        this.loadingStocks = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loadingStocks = false;
        this.showToast(err?.error?.message || 'Failed to load inventory stocks.', 'danger');
        this.cdr.detectChanges();
      }
    });
  }

  loadProducts(): void {
    this.catalogService.getProducts().subscribe({
      next: (prods) => {
        this.availableProducts = prods || [];
      },
      error: () => {}
    });
  }

  // ─── Filtered Getters ─────────────────────────────────────────────────────────

  get filteredWarehouses(): Warehouse[] {
    return this.warehouses.filter(w => {
      const q = this.searchWarehouse.trim().toLowerCase();
      const code = (w.warehouseCode || w.code || '').toLowerCase();
      const name = (w.name || w.warehouseName || '').toLowerCase();
      const loc = (w.location || '').toLowerCase();
      const matchesSearch = !q || code.includes(q) || name.includes(q) || loc.includes(q);

      const status = (w.status || 'ACTIVE').toUpperCase();
      const matchesStatus = this.statusFilter === 'ALL' || status === this.statusFilter;

      return matchesSearch && matchesStatus;
    });
  }

  get filteredStocks(): WarehouseStock[] {
    return this.stocks.filter(s => {
      const q = this.searchInventory.trim().toLowerCase();
      const prodName = (s.product?.name || '').toLowerCase();
      const matchesSearch = !q || prodName.includes(q);

      const status = this.getStockStatusLabel(s);
      const matchesStatus = this.stockStatusFilter === 'ALL' || status === this.stockStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }

  get activeWarehousesCount(): number {
    return this.warehouses.filter(w => (w.status || 'ACTIVE') === 'ACTIVE').length;
  }

  get totalInventoryUnits(): number {
    return this.stocks.reduce((sum, s) => sum + (s.inStock || 0), 0);
  }

  get lowStockAlertsCount(): number {
    return this.stocks.filter(s => (s.available || 0) < (s.reorderLevel || 10)).length;
  }

  get warehouseAvailableUnits(): number {
    return this.stocks.reduce((sum, s) => sum + (s.available || 0), 0);
  }

  get warehouseReservedUnits(): number {
    return this.stocks.reduce((sum, s) => sum + (s.reserved || 0), 0);
  }

  get warehouseLowStockCount(): number {
    return this.stocks.filter(s => (s.available || 0) < (s.reorderLevel || 10)).length;
  }

  // ─── Warehouse CRUD ───────────────────────────────────────────────────────────

  openCreateWarehouse(): void {
    this.warehouseEditMode = false;
    this.warehouseForm = {
      id: 0,
      code: 'WH-' + String(this.warehouses.length + 1).padStart(3, '0'),
      name: '',
      location: '',
      status: 'ACTIVE',
      shippingCostWeight: 1.00,
      baseFreight: 20.00
    };
    this.warehouseFormError = '';
    this.warehouseModalOpen = true;
  }

  openEditWarehouse(wh: Warehouse): void {
    this.warehouseEditMode = true;
    this.warehouseForm = {
      id: wh.id,
      code: wh.warehouseCode || wh.code || '',
      name: wh.name || wh.warehouseName || '',
      location: wh.location || '',
      status: wh.status || 'ACTIVE',
      shippingCostWeight: wh.shippingCostWeight || 1.00,
      baseFreight: wh.baseFreight || 20.00
    };
    this.warehouseFormError = '';
    this.warehouseModalOpen = true;
  }

  closeWarehouseModal(): void {
    this.warehouseModalOpen = false;
    this.warehouseSubmitting = false;
  }

  saveWarehouse(): void {
    this.warehouseFormError = '';

    if (!this.warehouseForm.name.trim()) {
      this.warehouseFormError = 'Warehouse Name is required.';
      return;
    }
    if (!this.warehouseForm.code.trim()) {
      this.warehouseFormError = 'Warehouse Code is required.';
      return;
    }
    if (!this.warehouseForm.location.trim()) {
      this.warehouseFormError = 'Location / address is required.';
      return;
    }
    if (this.warehouseForm.shippingCostWeight <= 0) {
      this.warehouseFormError = 'Shipping Cost Weight must be greater than 0.';
      return;
    }

    this.warehouseSubmitting = true;

    const payload: any = {
      warehouseCode: this.warehouseForm.code.trim().toUpperCase(),
      name: this.warehouseForm.name.trim(),
      location: this.warehouseForm.location.trim(),
      status: this.warehouseForm.status,
      shippingCostWeight: this.warehouseForm.shippingCostWeight,
      baseFreight: this.warehouseForm.baseFreight
    };

    if (this.warehouseEditMode) {
      this.fulfillmentService.updateWarehouse(this.warehouseForm.id, payload).subscribe({
        next: (updated) => {
          this.warehouseSubmitting = false;
          this.warehouseModalOpen = false;
          this.showToast(`Warehouse "${updated.name}" updated successfully.`, 'success');
          if (this.viewMode === 'DETAIL' && this.selectedWarehouse?.id === updated.id) {
            this.selectedWarehouse = updated;
          }
          this.loadWarehouses();
        },
        error: (err) => {
          this.warehouseSubmitting = false;
          this.warehouseFormError = err?.error?.message || 'Failed to update warehouse.';
          this.cdr.detectChanges();
        }
      });
    } else {
      this.fulfillmentService.createWarehouse(payload).subscribe({
        next: (created) => {
          this.warehouseSubmitting = false;
          this.warehouseModalOpen = false;
          this.showToast(`Warehouse "${created.name}" created successfully.`, 'success');
          // Reload warehouses to ensure newest-first backend order is reflected
          this.loadWarehouses();
        },
        error: (err) => {
          this.warehouseSubmitting = false;
          this.warehouseFormError = err?.error?.message || 'Failed to create warehouse.';
          this.cdr.detectChanges();
        }
      });
    }
  }

  openDeleteWarehouse(wh: Warehouse): void {
    this.warehouseToDelete = wh;
    this.deleteWarehouseError = '';
    this.deleteWarehouseModalOpen = true;
  }

  closeDeleteWarehouseModal(): void {
    this.deleteWarehouseModalOpen = false;
    this.warehouseToDelete = null;
    this.deleteWarehouseSubmitting = false;
  }

  confirmDeleteWarehouse(): void {
    if (!this.warehouseToDelete) return;

    this.deleteWarehouseSubmitting = true;
    this.deleteWarehouseError = '';

    this.fulfillmentService.deleteWarehouse(this.warehouseToDelete.id).subscribe({
      next: () => {
        this.deleteWarehouseSubmitting = false;
        this.showToast(`Warehouse "${this.warehouseToDelete?.name}" deleted.`, 'success');
        this.closeDeleteWarehouseModal();
        this.loadWarehouses();
      },
      error: (err) => {
        this.deleteWarehouseSubmitting = false;
        this.deleteWarehouseError = err?.error?.message || 'Cannot delete warehouse due to active inventory or allocations.';
        this.cdr.detectChanges();
      }
    });
  }

  // ─── Inventory CRUD ───────────────────────────────────────────────────────────

  openAddInventory(): void {
    if (!this.selectedWarehouse) return;
    this.inventoryEditMode = false;
    this.inventoryForm = {
      id: 0,
      warehouseId: this.selectedWarehouse.id,
      productId: this.availableProducts.length > 0 ? this.availableProducts[0].id : 0,
      productName: '',
      inStock: 10,
      reserved: 0,
      reorderLevel: 10
    };
    this.inventoryFormError = '';
    this.inventoryModalOpen = true;
  }

  openEditInventory(stock: WarehouseStock): void {
    this.inventoryEditMode = true;
    this.inventoryForm = {
      id: stock.id,
      warehouseId: this.selectedWarehouse?.id || stock.warehouse?.id || 0,
      productId: stock.product?.id || 0,
      productName: stock.product?.name || 'Item',
      inStock: stock.inStock,
      reserved: stock.reserved,
      reorderLevel: stock.reorderLevel
    };
    this.inventoryFormError = '';
    this.inventoryModalOpen = true;
  }

  closeInventoryModal(): void {
    this.inventoryModalOpen = false;
    this.inventorySubmitting = false;
  }

  saveInventory(): void {
    this.inventoryFormError = '';

    if (!this.inventoryEditMode && (!this.inventoryForm.productId || this.inventoryForm.productId <= 0)) {
      this.inventoryFormError = 'Please select a catalog product.';
      return;
    }
    if (this.inventoryForm.inStock < 0) {
      this.inventoryFormError = 'In-stock quantity cannot be negative.';
      return;
    }
    if (this.inventoryForm.reserved < 0) {
      this.inventoryFormError = 'Reserved quantity cannot be negative.';
      return;
    }
    if (this.inventoryForm.reserved > this.inventoryForm.inStock) {
      this.inventoryFormError = `Reserved quantity (${this.inventoryForm.reserved}) cannot exceed in-stock quantity (${this.inventoryForm.inStock}).`;
      return;
    }
    if (this.inventoryForm.reorderLevel < 0) {
      this.inventoryFormError = 'Reorder level cannot be negative.';
      return;
    }

    this.inventorySubmitting = true;

    if (this.inventoryEditMode) {
      const payload = {
        inStock: this.inventoryForm.inStock,
        reserved: this.inventoryForm.reserved,
        reorderLevel: this.inventoryForm.reorderLevel
      };

      this.fulfillmentService.updateInventory(this.inventoryForm.id, payload).subscribe({
        next: () => {
          this.inventorySubmitting = false;
          this.inventoryModalOpen = false;
          this.showToast('Inventory stock updated successfully.', 'success');
          if (this.selectedWarehouse) {
            this.loadStocksForWarehouse(this.selectedWarehouse.id);
          }
        },
        error: (err) => {
          this.inventorySubmitting = false;
          this.inventoryFormError = err?.error?.message || 'Failed to update inventory.';
          this.cdr.detectChanges();
        }
      });
    } else {
      const payload = {
        warehouseId: this.inventoryForm.warehouseId,
        productId: this.inventoryForm.productId,
        inStock: this.inventoryForm.inStock,
        reserved: this.inventoryForm.reserved,
        reorderLevel: this.inventoryForm.reorderLevel
      };

      this.fulfillmentService.createInventory(payload).subscribe({
        next: () => {
          this.inventorySubmitting = false;
          this.inventoryModalOpen = false;
          this.showToast('Product inventory added to warehouse.', 'success');
          if (this.selectedWarehouse) {
            this.loadStocksForWarehouse(this.selectedWarehouse.id);
          }
        },
        error: (err) => {
          this.inventorySubmitting = false;
          this.inventoryFormError = err?.error?.message || 'Failed to add inventory. Item may already exist in this facility.';
          this.cdr.detectChanges();
        }
      });
    }
  }

  openDeleteInventory(stock: WarehouseStock): void {
    this.stockToDelete = stock;
    this.deleteInventoryError = '';
    this.deleteInventoryModalOpen = true;
  }

  closeDeleteInventoryModal(): void {
    this.deleteInventoryModalOpen = false;
    this.stockToDelete = null;
    this.deleteInventorySubmitting = false;
  }

  confirmDeleteInventory(): void {
    if (!this.stockToDelete) return;

    this.deleteInventorySubmitting = true;
    this.deleteInventoryError = '';

    this.fulfillmentService.deleteInventory(this.stockToDelete.id).subscribe({
      next: () => {
        this.deleteInventorySubmitting = false;
        this.showToast(`Inventory for "${this.stockToDelete?.product?.name}" deleted.`, 'success');
        this.closeDeleteInventoryModal();
        if (this.selectedWarehouse) {
          this.loadStocksForWarehouse(this.selectedWarehouse.id);
        }
      },
      error: (err) => {
        this.deleteInventorySubmitting = false;
        this.deleteInventoryError = err?.error?.message || 'Cannot delete inventory with active reservations.';
        this.cdr.detectChanges();
      }
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  getStockStatusLabel(s: WarehouseStock): string {
    if (s.available <= 0) return 'OUT OF STOCK';
    if (s.available < s.reorderLevel) return 'LOW STOCK';
    return 'NORMAL';
  }

  getStockStatusClass(s: WarehouseStock): string {
    if (s.available <= 0) return 'stock-out';
    if (s.available < s.reorderLevel) return 'stock-low';
    return 'stock-normal';
  }

  showToast(msg: string, type: 'success' | 'danger' = 'success'): void {
    this.toastMessage = msg;
    this.toastType = type;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastMessage = '';
      this.cdr.detectChanges();
    }, 4500);
    this.cdr.detectChanges();
  }

  trackWarehouse(_: number, item: Warehouse): number {
    return item.id;
  }

  trackStock(_: number, item: WarehouseStock): number {
    return item.id;
  }
}
