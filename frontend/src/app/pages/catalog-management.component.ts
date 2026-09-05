import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CatalogService } from '../services/catalog.service';
import { AuthService, UserRole } from '../services/auth.service';
import {
  Product,
  ProductRequest,
  Category,
  CategoryRequest,
  PriceList,
  PriceListRequest
} from '../models/dealflow.model';

@Component({
  selector: 'app-catalog-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="catalog-container">

      <!-- Header & Active Scoping Banner -->
      <div class="glass-panel catalog-header">
        <div class="header-left">
          <div class="header-title-group">
            <span class="catalog-badge">Master Data</span>
            <h1 class="page-title">Catalog & Pricing Architecture</h1>
            <p class="page-sub">
              Manage product hierarchies, discount ceilings, category sensitivity ($\gamma$), and customer tier price lists.
            </p>
          </div>
        </div>
        <div class="header-right">
          <div class="role-badge" [class.badge-admin]="isAdmin" [class.badge-readonly]="!isAdmin">
            <span class="dot"></span>
            <span>{{ isAdmin ? 'Admin Full Access' : 'Read-Only Mode' }}</span>
          </div>
          <button
            *ngIf="isAdmin"
            class="cyber-btn primary-btn"
            (click)="openCreateModal()"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M12 4v16m8-8H4"/>
            </svg>
            <span>Add {{ activeTabTitleSingular }}</span>
          </button>
        </div>
      </div>

      <!-- Toast Feedback Message -->
      <div *ngIf="toastMessage" class="toast-banner" [class.toast-error]="isToastError" [class.toast-success]="!isToastError">
        <div class="toast-content">
          <span class="toast-icon">{{ isToastError ? '⚠️' : '✅' }}</span>
          <span>{{ toastMessage }}</span>
        </div>
        <button class="toast-close" (click)="toastMessage = ''">×</button>
      </div>

      <!-- Tab Navigation & Search Bar -->
      <div class="glass-panel tab-control-bar">
        <div class="tabs-group">
          <button
            class="tab-btn"
            [class.active]="activeTab === 'products'"
            (click)="setTab('products')"
          >
            <span class="tab-icon">📦</span>
            <span>Products</span>
            <span class="tab-count">{{ products.length }}</span>
          </button>
          <button
            class="tab-btn"
            [class.active]="activeTab === 'categories'"
            (click)="setTab('categories')"
          >
            <span class="tab-icon">🏷️</span>
            <span>Categories</span>
            <span class="tab-count">{{ categories.length }}</span>
          </button>
          <button
            class="tab-btn"
            [class.active]="activeTab === 'pricelists'"
            (click)="setTab('pricelists')"
          >
            <span class="tab-icon">💳</span>
            <span>Tier Price Lists</span>
            <span class="tab-count">{{ priceLists.length }}</span>
          </button>
        </div>

        <!-- Filter / Search Section -->
        <div class="search-filter-group">
          <div class="search-box">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              placeholder="Search {{ activeTab }}..."
              class="search-input"
            />
            <button *ngIf="searchQuery" class="clear-search" (click)="searchQuery = ''">×</button>
          </div>

          <div *ngIf="activeTab === 'products'" class="category-filter">
            <select [(ngModel)]="selectedCategoryFilter" class="filter-select">
              <option value="ALL">All Categories</option>
              <option *ngFor="let cat of categories" [value]="cat.id">{{ cat.name }}</option>
            </select>
          </div>

          <button class="refresh-btn" (click)="loadAllData()" title="Refresh data">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="glass-panel loading-state">
        <div class="cyber-spinner"></div>
        <p>Loading master catalog records from database...</p>
      </div>

      <!-- TAB 1: PRODUCTS TABLE -->
      <div *ngIf="!loading && activeTab === 'products'" class="glass-panel table-panel">
        <div *ngIf="filteredProducts.length === 0" class="empty-state">
          <div class="empty-icon">📦</div>
          <h3>No products found</h3>
          <p>No product records match your current filter criteria.</p>
          <button *ngIf="isAdmin" class="cyber-btn primary-btn mt-3" (click)="openProductModal()">
            Create First Product
          </button>
        </div>

        <div *ngIf="filteredProducts.length > 0" class="table-responsive">
          <table class="cyber-table">
            <thead>
              <tr>
                <th>Product & SKU</th>
                <th>Category</th>
                <th>Base Price</th>
                <th>Cost Price</th>
                <th>Estimated Margin</th>
                <th>Tax %</th>
                <th>Type / Interval</th>
                <th>Status</th>
                <th *ngIf="isAdmin" class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let p of filteredProducts">
                <td>
                  <div class="product-identity">
                    <span class="product-name">{{ p.name }}</span>
                    <span class="product-sku mono">{{ p.sku || 'PROD-' + p.id }}</span>
                  </div>
                </td>
                <td>
                  <span class="category-pill">
                    {{ p.categoryName || getCategoryName(p.categoryId) }}
                  </span>
                </td>
                <td class="mono font-weight-bold text-accent">
                  \${{ p.basePrice | number:'1.2-2' }}
                </td>
                <td class="mono text-muted">
                  \${{ (p.costPrice || 0) | number:'1.2-2' }}
                </td>
                <td>
                  <span class="margin-pill" [class.margin-high]="getMarginPct(p) >= 30" [class.margin-low]="getMarginPct(p) < 30">
                    {{ getMarginPct(p) | number:'1.1-1' }}%
                  </span>
                </td>
                <td>
                  <span class="tax-badge">{{ p.taxPercentage || 0 }}%</span>
                </td>
                <td>
                  <span *ngIf="p.isSubscription" class="type-pill subscription">
                    🔄 {{ p.recurringInterval || 'MONTHLY' }}
                  </span>
                  <span *ngIf="!p.isSubscription" class="type-pill standard">
                    📦 {{ p.unitOfMeasure || 'Unit' }}
                  </span>
                </td>
                <td>
                  <span class="status-indicator" [class.active]="p.active !== false" [class.inactive]="p.active === false">
                    <span class="status-dot"></span>
                    {{ p.active !== false ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td *ngIf="isAdmin" class="text-right">
                  <div class="action-buttons">
                    <button class="action-btn edit" (click)="openProductModal(p)" title="Edit Product">
                      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                      </svg>
                    </button>
                    <button class="action-btn delete" (click)="deleteProduct(p)" title="Deactivate / Delete">
                      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TAB 2: CATEGORIES TABLE -->
      <div *ngIf="!loading && activeTab === 'categories'" class="glass-panel table-panel">
        <div *ngIf="filteredCategories.length === 0" class="empty-state">
          <div class="empty-icon">🏷️</div>
          <h3>No categories found</h3>
          <p>No product categories registered yet.</p>
          <button *ngIf="isAdmin" class="cyber-btn primary-btn mt-3" (click)="openCategoryModal()">
            Create First Category
          </button>
        </div>

        <div *ngIf="filteredCategories.length > 0" class="table-responsive">
          <table class="cyber-table">
            <thead>
              <tr>
                <th>Category Name</th>
                <th>Discount Ceiling (Max %)</th>
                <th>Sensitivity Gamma ($\gamma$)</th>
                <th>Description / Governance Rule</th>
                <th *ngIf="isAdmin" class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let cat of filteredCategories">
                <td>
                  <div class="cat-identity">
                    <span class="cat-name">{{ cat.name }}</span>
                    <span class="cat-id mono">ID: #{{ cat.id }}</span>
                  </div>
                </td>
                <td>
                  <span class="ceiling-badge">
                    {{ (cat.maxDiscountPercent || cat.maxDiscountCeilingPct || 0) }}% Max
                  </span>
                </td>
                <td>
                  <span class="gamma-badge">
                    $\gamma$ = {{ (cat.sensitivityGamma || 1.0) | number:'1.2-2' }}
                  </span>
                </td>
                <td>
                  <span class="text-muted text-sm">
                    {{ cat.description || 'Standard category margin policy applied' }}
                  </span>
                </td>
                <td *ngIf="isAdmin" class="text-right">
                  <div class="action-buttons">
                    <button class="action-btn edit" (click)="openCategoryModal(cat)" title="Edit Category">
                      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                      </svg>
                    </button>
                    <button class="action-btn delete" (click)="deleteCategory(cat)" title="Delete Category">
                      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TAB 3: PRICE LISTS TABLE -->
      <div *ngIf="!loading && activeTab === 'pricelists'" class="glass-panel table-panel">
        <div *ngIf="filteredPriceLists.length === 0" class="empty-state">
          <div class="empty-icon">💳</div>
          <h3>No Tier Price Lists Defined</h3>
          <p>Create customer tier pricing adjustments (e.g., Enterprise discount modifiers).</p>
          <button *ngIf="isAdmin" class="cyber-btn primary-btn mt-3" (click)="openPriceListModal()">
            Create First Price List
          </button>
        </div>

        <div *ngIf="filteredPriceLists.length > 0" class="table-responsive">
          <table class="cyber-table">
            <thead>
              <tr>
                <th>Customer Tier</th>
                <th>Currency</th>
                <th>Discount / Price Adjustment</th>
                <th>Effective Pricing Multiplier</th>
                <th *ngIf="isAdmin" class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let pl of filteredPriceLists">
                <td>
                  <span class="tier-badge" [class.tier-enterprise]="pl.customerTier === 'ENTERPRISE'" [class.tier-platinum]="pl.customerTier === 'PLATINUM'" [class.tier-gold]="pl.customerTier === 'GOLD'">
                    ★ {{ pl.customerTier }}
                  </span>
                </td>
                <td class="mono font-weight-bold">
                  {{ pl.currency || 'USD' }}
                </td>
                <td>
                  <span class="adjustment-badge" [class.adjustment-negative]="pl.discountAdjustmentPercent < 0" [class.adjustment-positive]="pl.discountAdjustmentPercent >= 0">
                    {{ pl.discountAdjustmentPercent > 0 ? '+' : '' }}{{ pl.discountAdjustmentPercent }}%
                  </span>
                </td>
                <td class="mono text-muted">
                  x{{ ((100 - pl.discountAdjustmentPercent) / 100) | number:'1.2-2' }} list price
                </td>
                <td *ngIf="isAdmin" class="text-right">
                  <div class="action-buttons">
                    <button class="action-btn edit" (click)="openPriceListModal(pl)" title="Edit Price List">
                      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                      </svg>
                    </button>
                    <button class="action-btn delete" (click)="deletePriceList(pl)" title="Delete Price List">
                      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ============================================== -->
      <!-- PRODUCT MODAL DIALOG                          -->
      <!-- ============================================== -->
      <div *ngIf="showProductModal" class="modal-backdrop" (click)="showProductModal = false">
        <div class="cyber-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ editingProduct ? 'Edit Product' : 'Create New Product' }}</h3>
            <button class="modal-close" (click)="showProductModal = false">×</button>
          </div>
          <div class="modal-body">
            <div class="form-grid">
              <div class="form-group span-2">
                <label>Product Name *</label>
                <input type="text" [(ngModel)]="productForm.name" placeholder="e.g. Enterprise Router X-900" class="form-input" />
              </div>

              <div class="form-group">
                <label>Category *</label>
                <select [(ngModel)]="productForm.categoryId" class="form-input">
                  <option [ngValue]="null" disabled>Select category...</option>
                  <option *ngFor="let cat of categories" [ngValue]="cat.id">{{ cat.name }} (Max {{ cat.maxDiscountPercent || 15 }}%)</option>
                </select>
              </div>

              <div class="form-group">
                <label>Base List Price ($) *</label>
                <input type="number" step="0.01" [(ngModel)]="productForm.basePrice" placeholder="0.00" class="form-input" />
              </div>

              <div class="form-group">
                <label>Unit Cost Price ($)</label>
                <input type="number" step="0.01" [(ngModel)]="productForm.costPrice" placeholder="0.00" class="form-input" />
              </div>

              <div class="form-group">
                <label>Unit of Measure</label>
                <input type="text" [(ngModel)]="productForm.unitOfMeasure" placeholder="Units / Licenses / Hours" class="form-input" />
              </div>

              <div class="form-group">
                <label>Tax Rate (%)</label>
                <input type="number" step="0.5" [(ngModel)]="productForm.taxPercentage" placeholder="0" class="form-input" />
              </div>

              <div class="form-group">
                <label>Stock on Hand</label>
                <input type="number" [(ngModel)]="productForm.stockOnHand" placeholder="100" class="form-input" />
              </div>

              <div class="form-group span-2 flex-row">
                <label class="toggle-label">
                  <input type="checkbox" [(ngModel)]="productForm.isSubscription" />
                  <span>Is Subscription / Recurring Product</span>
                </label>
              </div>

              <div *ngIf="productForm.isSubscription" class="form-group">
                <label>Billing Frequency</label>
                <select [(ngModel)]="productForm.recurringInterval" class="form-input">
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="ANNUAL">Annual</option>
                </select>
              </div>

              <div class="form-group span-2 flex-row">
                <label class="toggle-label">
                  <input type="checkbox" [(ngModel)]="productForm.active" />
                  <span>Active & Sellable in CPQ</span>
                </label>
              </div>

              <div class="form-group span-2">
                <label>Description / Technical Notes</label>
                <textarea rows="3" [(ngModel)]="productForm.description" placeholder="Product specifications..." class="form-input"></textarea>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="cyber-btn secondary-btn" (click)="showProductModal = false">Cancel</button>
            <button class="cyber-btn primary-btn" [disabled]="isSaving || !productForm.name || !productForm.categoryId || productForm.basePrice <= 0" (click)="saveProduct()">
              {{ isSaving ? 'Saving...' : (editingProduct ? 'Update Product' : 'Create Product') }}
            </button>
          </div>
        </div>
      </div>

      <!-- ============================================== -->
      <!-- CATEGORY MODAL DIALOG                         -->
      <!-- ============================================== -->
      <div *ngIf="showCategoryModal" class="modal-backdrop" (click)="showCategoryModal = false">
        <div class="cyber-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ editingCategory ? 'Edit Category' : 'Create Product Category' }}</h3>
            <button class="modal-close" (click)="showCategoryModal = false">×</button>
          </div>
          <div class="modal-body">
            <div class="form-grid">
              <div class="form-group span-2">
                <label>Category Name *</label>
                <input type="text" [(ngModel)]="categoryForm.name" placeholder="e.g. Hardware / Professional Services" class="form-input" />
              </div>

              <div class="form-group">
                <label>Max Discount Ceiling (%) *</label>
                <input type="number" step="0.5" [(ngModel)]="categoryForm.maxDiscountPercent" placeholder="15" class="form-input" />
                <span class="field-hint">Ceiling before automated risk overage triggers</span>
              </div>

              <div class="form-group">
                <label>Sensitivity Factor Gamma ($\gamma$)</label>
                <input type="number" step="0.1" [(ngModel)]="categoryForm.sensitivityGamma" placeholder="1.2" class="form-input" />
                <span class="field-hint">Risk curve exponent ($\gamma \ge 1.0$)</span>
              </div>

              <div class="form-group span-2">
                <label>Description & Scope</label>
                <textarea rows="3" [(ngModel)]="categoryForm.description" placeholder="Governance rules for this category..." class="form-input"></textarea>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="cyber-btn secondary-btn" (click)="showCategoryModal = false">Cancel</button>
            <button class="cyber-btn primary-btn" [disabled]="isSaving || !categoryForm.name" (click)="saveCategory()">
              {{ isSaving ? 'Saving...' : (editingCategory ? 'Update Category' : 'Create Category') }}
            </button>
          </div>
        </div>
      </div>

      <!-- ============================================== -->
      <!-- PRICE LIST MODAL DIALOG                       -->
      <!-- ============================================== -->
      <div *ngIf="showPriceListModal" class="modal-backdrop" (click)="showPriceListModal = false">
        <div class="cyber-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ editingPriceList ? 'Edit Tier Price List' : 'Create Tier Price List' }}</h3>
            <button class="modal-close" (click)="showPriceListModal = false">×</button>
          </div>
          <div class="modal-body">
            <div class="form-grid">
              <div class="form-group">
                <label>Customer Tier *</label>
                <select [(ngModel)]="priceListForm.customerTier" class="form-input">
                  <option value="STANDARD">STANDARD</option>
                  <option value="SILVER">SILVER</option>
                  <option value="GOLD">GOLD</option>
                  <option value="PLATINUM">PLATINUM</option>
                  <option value="ENTERPRISE">ENTERPRISE</option>
                </select>
              </div>

              <div class="form-group">
                <label>Currency</label>
                <select [(ngModel)]="priceListForm.currency" class="form-input">
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>

              <div class="form-group span-2">
                <label>Discount Adjustment (%) *</label>
                <input type="number" step="0.5" [(ngModel)]="priceListForm.discountAdjustmentPercent" placeholder="0" class="form-input" />
                <span class="field-hint">e.g. 5.0 for standard 5% tier discount, -2.0 for surcharge</span>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="cyber-btn secondary-btn" (click)="showPriceListModal = false">Cancel</button>
            <button class="cyber-btn primary-btn" [disabled]="isSaving || !priceListForm.customerTier" (click)="savePriceList()">
              {{ isSaving ? 'Saving...' : (editingPriceList ? 'Update Price List' : 'Create Price List') }}
            </button>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .catalog-container {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .glass-panel {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }

    /* Header */
    .catalog-header {
      padding: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
      flex-wrap: wrap;
    }

    .catalog-badge {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #2563eb;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      padding: 2px 8px;
      border-radius: 6px;
      display: inline-block;
      margin-bottom: 6px;
    }

    .page-title {
      font-size: 22px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 4px;
    }

    .page-sub {
      font-size: 13.5px;
      color: #64748b;
      margin: 0;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .role-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }

    .badge-admin {
      background: #eff6ff;
      color: #2563eb;
      border: 1px solid #bfdbfe;
    }

    .badge-readonly {
      background: #f8fafc;
      color: #64748b;
      border: 1px solid #e2e8f0;
    }

    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    /* Buttons */
    .cyber-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 9px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      border: 1px solid transparent;
    }

    .primary-btn {
      background: #2563eb;
      color: #ffffff;
      box-shadow: 0 2px 4px rgba(37,99,235,0.2);
    }

    .primary-btn:hover:not(:disabled) {
      background: #1d4ed8;
      box-shadow: 0 4px 8px rgba(37,99,235,0.3);
    }

    .primary-btn:disabled {
      background: #94a3b8;
      cursor: not-allowed;
      box-shadow: none;
    }

    .secondary-btn {
      background: #f8fafc;
      color: #475569;
      border-color: #e2e8f0;
    }

    .secondary-btn:hover {
      background: #f1f5f9;
      color: #0f172a;
    }

    /* Toast Banner */
    .toast-banner {
      padding: 12px 18px;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      animation: slideDown 0.2s ease;
    }

    .toast-success {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      color: #065f46;
    }

    .toast-error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
    }

    .toast-content {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13.5px;
      font-weight: 500;
    }

    .toast-close {
      background: none;
      border: none;
      font-size: 18px;
      cursor: pointer;
      color: inherit;
    }

    /* Tab Control Bar */
    .tab-control-bar {
      padding: 12px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .tabs-group {
      display: flex;
      gap: 6px;
    }

    .tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      border-radius: 8px;
      background: none;
      border: 1px solid transparent;
      color: #64748b;
      font-size: 13.5px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .tab-btn:hover {
      background: #f1f5f9;
      color: #0f172a;
    }

    .tab-btn.active {
      background: #eff6ff;
      color: #2563eb;
      font-weight: 600;
      border-color: #bfdbfe;
    }

    .tab-count {
      background: #e2e8f0;
      color: #475569;
      font-size: 11px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 12px;
    }

    .tab-btn.active .tab-count {
      background: #dbeafe;
      color: #1d4ed8;
    }

    /* Search & Filter */
    .search-filter-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .search-box {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      color: #64748b;
    }

    .search-input {
      border: none;
      background: none;
      outline: none;
      font-size: 13px;
      color: #0f172a;
      width: 180px;
    }

    .clear-search {
      background: none;
      border: none;
      cursor: pointer;
      color: #94a3b8;
      font-size: 16px;
      padding: 0;
    }

    .filter-select {
      padding: 6px 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 13px;
      color: #0f172a;
      outline: none;
    }

    .refresh-btn {
      padding: 8px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      color: #64748b;
      cursor: pointer;
      transition: all 0.15s;
    }

    .refresh-btn:hover {
      background: #f1f5f9;
      color: #0f172a;
    }

    /* Table Styles */
    .table-panel {
      overflow: hidden;
    }

    .table-responsive {
      overflow-x: auto;
    }

    .cyber-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 13.5px;
    }

    .cyber-table th {
      background: #f8fafc;
      padding: 12px 16px;
      font-size: 11.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      border-bottom: 1px solid #e2e8f0;
    }

    .cyber-table td {
      padding: 14px 16px;
      border-bottom: 1px solid #f1f5f9;
      color: #1e293b;
      vertical-align: middle;
    }

    .cyber-table tr:hover td {
      background: #fafafa;
    }

    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    .font-weight-bold {
      font-weight: 600;
    }

    .text-accent {
      color: #0284c7;
    }

    .text-muted {
      color: #64748b;
    }

    .text-right {
      text-align: right;
    }

    .text-sm {
      font-size: 12px;
    }

    .product-identity, .cat-identity {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .product-name, .cat-name {
      font-weight: 600;
      color: #0f172a;
    }

    .product-sku, .cat-id {
      font-size: 11px;
      color: #94a3b8;
    }

    .category-pill {
      background: #f1f5f9;
      color: #334155;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
    }

    .margin-pill {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11.5px;
      font-weight: 600;
      font-family: ui-monospace, SFMono-Regular, monospace;
    }

    .margin-high {
      background: #ecfdf5;
      color: #059669;
      border: 1px solid #a7f3d0;
    }

    .margin-low {
      background: #fef2f2;
      color: #dc2626;
      border: 1px solid #fecaca;
    }

    .tax-badge {
      background: #f8fafc;
      color: #475569;
      border: 1px solid #e2e8f0;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }

    .type-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 500;
    }

    .type-pill.subscription {
      background: #f5f3ff;
      color: #7c3aed;
      border: 1px solid #ddd6fe;
    }

    .type-pill.standard {
      background: #f8fafc;
      color: #475569;
      border: 1px solid #e2e8f0;
    }

    .status-indicator {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 500;
    }

    .status-indicator.active {
      color: #16a34a;
    }

    .status-indicator.inactive {
      color: #94a3b8;
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    .ceiling-badge {
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
    }

    .gamma-badge {
      background: #faf5ff;
      color: #6b21a8;
      border: 1px solid #e9d5ff;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      font-family: ui-monospace, monospace;
    }

    .tier-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.04em;
    }

    .tier-enterprise {
      background: #1e1b4b;
      color: #c7d2fe;
    }

    .tier-platinum {
      background: #312e81;
      color: #e0e7ff;
    }

    .tier-gold {
      background: #78350f;
      color: #fef3c7;
    }

    .adjustment-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      font-family: ui-monospace, monospace;
    }

    .adjustment-positive {
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
    }

    .adjustment-negative {
      background: #fef2f2;
      color: #b91c1c;
      border: 1px solid #fecaca;
    }

    .action-buttons {
      display: inline-flex;
      gap: 6px;
    }

    .action-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      color: #64748b;
      cursor: pointer;
      transition: all 0.15s;
    }

    .action-btn.edit:hover {
      background: #eff6ff;
      border-color: #bfdbfe;
      color: #2563eb;
    }

    .action-btn.delete:hover {
      background: #fef2f2;
      border-color: #fecaca;
      color: #dc2626;
    }

    /* Empty & Loading States */
    .empty-state {
      padding: 48px 24px;
      text-align: center;
    }

    .empty-icon {
      font-size: 40px;
      margin-bottom: 12px;
    }

    .empty-state h3 {
      font-size: 16px;
      font-weight: 600;
      color: #0f172a;
      margin: 0 0 6px;
    }

    .empty-state p {
      font-size: 13.5px;
      color: #64748b;
      margin: 0;
    }

    .loading-state {
      padding: 60px 24px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      color: #64748b;
    }

    .cyber-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #e2e8f0;
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @keyframes slideDown {
      from { transform: translateY(-10px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    /* Modal Backdrop & Body */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 50;
      padding: 20px;
      animation: fadeIn 0.15s ease;
    }

    .cyber-modal {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      width: 100%;
      max-width: 580px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
      overflow: hidden;
    }

    .modal-header {
      padding: 18px 24px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .modal-header h3 {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }

    .modal-close {
      background: none;
      border: none;
      font-size: 20px;
      color: #94a3b8;
      cursor: pointer;
    }

    .modal-body {
      padding: 24px;
      overflow-y: auto;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .span-2 {
      grid-column: span 2;
    }

    .flex-row {
      display: flex;
      align-items: center;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-group label {
      font-size: 12px;
      font-weight: 600;
      color: #334155;
    }

    .form-input {
      padding: 9px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 13.5px;
      color: #0f172a;
      background: #ffffff;
      outline: none;
      transition: border-color 0.15s;
    }

    .form-input:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
    }

    .field-hint {
      font-size: 11px;
      color: #94a3b8;
    }

    .toggle-label {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      color: #334155;
    }

    .modal-footer {
      padding: 16px 24px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      background: #f8fafc;
    }
  `]
})
export class CatalogManagementComponent implements OnInit {
  activeTab: 'products' | 'categories' | 'pricelists' = 'products';
  loading = false;
  isSaving = false;
  searchQuery = '';
  selectedCategoryFilter: string | number = 'ALL';

  toastMessage = '';
  isToastError = false;

  products: Product[] = [];
  categories: Category[] = [];
  priceLists: PriceList[] = [];

  // Modals state
  showProductModal = false;
  editingProduct: Product | null = null;
  productForm: ProductRequest = {
    name: '',
    categoryId: 1,
    basePrice: 0,
    costPrice: 0,
    unitOfMeasure: 'Units',
    taxPercentage: 0,
    isSubscription: false,
    recurringInterval: 'MONTHLY',
    stockOnHand: 100,
    active: true,
    description: ''
  };

  showCategoryModal = false;
  editingCategory: Category | null = null;
  categoryForm: CategoryRequest = {
    name: '',
    maxDiscountPercent: 15,
    sensitivityGamma: 1.2,
    description: ''
  };

  showPriceListModal = false;
  editingPriceList: PriceList | null = null;
  priceListForm: PriceListRequest = {
    customerTier: 'STANDARD',
    currency: 'USD',
    discountAdjustmentPercent: 0
  };

  constructor(
    private catalogService: CatalogService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  get currentRole(): UserRole {
    return this.authService.currentRole || 'ADMIN';
  }

  get isAdmin(): boolean {
    return this.currentRole === 'ADMIN';
  }

  get activeTabTitleSingular(): string {
    switch (this.activeTab) {
      case 'products': return 'Product';
      case 'categories': return 'Category';
      case 'pricelists': return 'Price List';
    }
  }

  ngOnInit() {
    this.loadAllData(true);
  }

  setTab(tab: 'products' | 'categories' | 'pricelists') {
    this.activeTab = tab;
    this.searchQuery = '';
  }

  loadAllData(showSpinner = true) {
    if (showSpinner) {
      this.loading = true;
    }

    // Load categories
    this.catalogService.getCategories().subscribe({
      next: (cats) => {
        this.categories = cats || [];
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Failed to load categories', err)
    });

    // Load price lists
    this.catalogService.getPriceLists().subscribe({
      next: (pls) => {
        this.priceLists = pls || [];
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Failed to load price lists', err)
    });

    // Load products (admin sees all including inactive)
    const productReq = this.isAdmin
      ? this.catalogService.getAllProductsAdmin()
      : this.catalogService.getProducts();

    productReq.subscribe({
      next: (prods) => {
        this.products = prods || [];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load products', err);
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  get filteredProducts(): Product[] {
    let result = this.products;
    if (this.selectedCategoryFilter !== 'ALL') {
      const catId = Number(this.selectedCategoryFilter);
      result = result.filter(p => p.categoryId === catId);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.categoryName && p.categoryName.toLowerCase().includes(q))
      );
    }
    return result;
  }

  get filteredCategories(): Category[] {
    if (!this.searchQuery.trim()) return this.categories;
    const q = this.searchQuery.toLowerCase();
    return this.categories.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.description && c.description.toLowerCase().includes(q))
    );
  }

  get filteredPriceLists(): PriceList[] {
    if (!this.searchQuery.trim()) return this.priceLists;
    const q = this.searchQuery.toLowerCase();
    return this.priceLists.filter(p =>
      p.customerTier.toLowerCase().includes(q) ||
      (p.currency && p.currency.toLowerCase().includes(q))
    );
  }

  getCategoryName(id?: number): string {
    if (!id) return 'Uncategorized';
    const cat = this.categories.find(c => c.id === id);
    return cat ? cat.name : `Category #${id}`;
  }

  getMarginPct(p: Product): number {
    if (!p.basePrice || p.basePrice <= 0) return 0;
    const cost = p.costPrice || p.unitCost || 0;
    return ((p.basePrice - cost) / p.basePrice) * 100;
  }

  openCreateModal() {
    switch (this.activeTab) {
      case 'products': this.openProductModal(); break;
      case 'categories': this.openCategoryModal(); break;
      case 'pricelists': this.openPriceListModal(); break;
    }
  }

  // ===================================
  // PRODUCT MODAL & ACTIONS
  // ===================================
  openProductModal(prod?: Product) {
    if (prod) {
      this.editingProduct = prod;
      this.productForm = {
        name: prod.name,
        categoryId: prod.categoryId || (this.categories[0]?.id ?? 1),
        basePrice: prod.basePrice,
        costPrice: prod.costPrice || prod.unitCost || 0,
        unitOfMeasure: prod.unitOfMeasure || 'Units',
        taxPercentage: prod.taxPercentage || 0,
        isSubscription: prod.isSubscription || false,
        recurringInterval: prod.recurringInterval || 'MONTHLY',
        stockOnHand: prod.stockOnHand || 100,
        active: prod.active !== false,
        description: prod.description || ''
      };
    } else {
      this.editingProduct = null;
      this.productForm = {
        name: '',
        categoryId: this.categories[0]?.id ?? 1,
        basePrice: 0,
        costPrice: 0,
        unitOfMeasure: 'Units',
        taxPercentage: 0,
        isSubscription: false,
        recurringInterval: 'MONTHLY',
        stockOnHand: 100,
        active: true,
        description: ''
      };
    }
    this.showProductModal = true;
    this.cdr.markForCheck();
  }

  saveProduct() {
    if (!this.productForm.name || !this.productForm.categoryId || this.productForm.basePrice <= 0) {
      this.showToast('Product name, category, and valid base price are required', true);
      return;
    }

    this.isSaving = true;
    if (this.editingProduct) {
      this.catalogService.updateProduct(this.editingProduct.id, this.productForm).subscribe({
        next: (updated) => {
          this.isSaving = false;
          this.showProductModal = false;
          this.showToast(`Product "${updated.name}" updated successfully`);
          this.loadAllData(false);
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isSaving = false;
          this.showToast(err?.error?.message || 'Failed to update product', true);
          this.cdr.markForCheck();
        }
      });
    } else {
      this.catalogService.createProduct(this.productForm).subscribe({
        next: (created) => {
          this.isSaving = false;
          this.showProductModal = false;
          this.showToast(`Product "${created.name}" created successfully`);
          this.loadAllData(false);
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isSaving = false;
          this.showToast(err?.error?.message || 'Failed to create product', true);
          this.cdr.markForCheck();
        }
      });
    }
  }

  deleteProduct(p: Product) {
    if (!confirm(`Are you sure you want to deactivate or remove product "${p.name}"?`)) return;
    this.catalogService.deleteProduct(p.id).subscribe({
      next: () => {
        this.showToast(`Product "${p.name}" removed / deactivated`);
        this.loadAllData(false);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.showToast(err?.error?.message || 'Failed to remove product', true);
        this.cdr.markForCheck();
      }
    });
  }

  // ===================================
  // CATEGORY MODAL & ACTIONS
  // ===================================
  openCategoryModal(cat?: Category) {
    if (cat) {
      this.editingCategory = cat;
      this.categoryForm = {
        name: cat.name,
        maxDiscountPercent: cat.maxDiscountPercent || cat.maxDiscountCeilingPct || 15,
        sensitivityGamma: cat.sensitivityGamma || 1.2,
        description: cat.description || ''
      };
    } else {
      this.editingCategory = null;
      this.categoryForm = {
        name: '',
        maxDiscountPercent: 15,
        sensitivityGamma: 1.2,
        description: ''
      };
    }
    this.showCategoryModal = true;
    this.cdr.markForCheck();
  }

  saveCategory() {
    if (!this.categoryForm.name) {
      this.showToast('Category name is required', true);
      return;
    }

    this.isSaving = true;
    if (this.editingCategory) {
      this.catalogService.updateCategory(this.editingCategory.id, this.categoryForm).subscribe({
        next: (updated) => {
          this.isSaving = false;
          this.showCategoryModal = false;
          this.showToast(`Category "${updated.name}" updated successfully`);
          this.loadAllData(false);
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isSaving = false;
          this.showToast(err?.error?.message || 'Failed to update category', true);
          this.cdr.markForCheck();
        }
      });
    } else {
      this.catalogService.createCategory(this.categoryForm).subscribe({
        next: (created) => {
          this.isSaving = false;
          this.showCategoryModal = false;
          this.showToast(`Category "${created.name}" created successfully`);
          this.loadAllData(false);
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isSaving = false;
          this.showToast(err?.error?.message || 'Failed to create category', true);
          this.cdr.markForCheck();
        }
      });
    }
  }

  deleteCategory(cat: Category) {
    if (!confirm(`Are you sure you want to delete category "${cat.name}"?`)) return;
    this.catalogService.deleteCategory(cat.id).subscribe({
      next: () => {
        this.showToast(`Category "${cat.name}" deleted`);
        this.loadAllData(false);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.showToast(err?.error?.message || 'Failed to delete category', true);
        this.cdr.markForCheck();
      }
    });
  }

  // ===================================
  // PRICE LIST MODAL & ACTIONS
  // ===================================
  openPriceListModal(pl?: PriceList) {
    if (pl) {
      this.editingPriceList = pl;
      this.priceListForm = {
        customerTier: pl.customerTier,
        currency: pl.currency || 'USD',
        discountAdjustmentPercent: pl.discountAdjustmentPercent || 0
      };
    } else {
      this.editingPriceList = null;
      this.priceListForm = {
        customerTier: 'STANDARD',
        currency: 'USD',
        discountAdjustmentPercent: 0
      };
    }
    this.showPriceListModal = true;
    this.cdr.markForCheck();
  }

  savePriceList() {
    this.isSaving = true;
    if (this.editingPriceList) {
      this.catalogService.updatePriceList(this.editingPriceList.id, this.priceListForm).subscribe({
        next: (updated) => {
          this.isSaving = false;
          this.showPriceListModal = false;
          this.showToast(`Price List for ${updated.customerTier} updated`);
          this.loadAllData(false);
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isSaving = false;
          this.showToast(err?.error?.message || 'Failed to update price list', true);
          this.cdr.markForCheck();
        }
      });
    } else {
      this.catalogService.createPriceList(this.priceListForm).subscribe({
        next: (created) => {
          this.isSaving = false;
          this.showPriceListModal = false;
          this.showToast(`Price List for ${created.customerTier} created`);
          this.loadAllData(false);
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isSaving = false;
          this.showToast(err?.error?.message || 'Failed to create price list', true);
          this.cdr.markForCheck();
        }
      });
    }
  }

  deletePriceList(pl: PriceList) {
    if (!confirm(`Are you sure you want to delete price list for tier "${pl.customerTier}"?`)) return;
    this.catalogService.deletePriceList(pl.id).subscribe({
      next: () => {
        this.showToast(`Price List for tier "${pl.customerTier}" deleted`);
        this.loadAllData(false);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.showToast(err?.error?.message || 'Failed to delete price list', true);
        this.cdr.markForCheck();
      }
    });
  }

  private showToast(msg: string, isError = false) {
    this.toastMessage = msg;
    this.isToastError = isError;
    this.cdr.markForCheck();
    setTimeout(() => {
      if (this.toastMessage === msg) {
        this.toastMessage = '';
        this.cdr.markForCheck();
      }
    }, 4000);
  }
}
