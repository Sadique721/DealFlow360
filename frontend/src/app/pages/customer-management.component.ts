import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CatalogService } from '../services/catalog.service';
import { AuthService, UserRole } from '../services/auth.service';
import {
  Customer,
  CustomerRequest,
  CustomerTier,
  CustomerTierRequest,
  ApprovalChainRule,
  ApprovalChainRequest
} from '../models/dealflow.model';

@Component({
  selector: 'app-customer-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="customer-container">

      <!-- Header & Active Scoping Banner -->
      <div class="glass-panel customer-header">
        <div class="header-left">
          <div class="header-title-group">
            <span class="customer-badge">Customer Master & Governance</span>
            <h1 class="page-title">Customers, Discount Tiers & Approval Chains</h1>
            <p class="page-sub">
              Manage enterprise customer profiles, commercial discount allowances, and automatic multi-tier governance escalation rules.
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
            [class.active]="activeTab === 'customers'"
            (click)="setTab('customers')"
          >
            <span class="tab-icon">🏢</span>
            <span>Customers</span>
            <span class="tab-count">{{ customers.length }}</span>
          </button>
          <button
            class="tab-btn"
            [class.active]="activeTab === 'tiers'"
            (click)="setTab('tiers')"
          >
            <span class="tab-icon">💎</span>
            <span>Discount Tiers</span>
            <span class="tab-count">{{ customerTiers.length }}</span>
          </button>
          <button
            class="tab-btn"
            [class.active]="activeTab === 'chains'"
            (click)="setTab('chains')"
          >
            <span class="tab-icon">⚖️</span>
            <span>Approval Chains</span>
            <span class="tab-count">{{ approvalChains.length }}</span>
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

          <div *ngIf="activeTab === 'customers'" class="tier-filter">
            <select [(ngModel)]="selectedTierFilter" class="filter-select">
              <option value="ALL">All Tiers</option>
              <option *ngFor="let tier of customerTiers" [value]="tier.tierName">{{ tier.tierName }}</option>
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
        <p>Loading enterprise customer records and governance rules...</p>
      </div>

      <!-- TAB 1: CUSTOMERS DIRECTORY -->
      <div *ngIf="!loading && activeTab === 'customers'" class="glass-panel table-panel">
        <div *ngIf="filteredCustomers.length === 0" class="empty-state">
          <div class="empty-icon">🏢</div>
          <h3>No customer accounts found</h3>
          <p>No customer accounts match your search or filter criteria.</p>
          <button *ngIf="isAdmin" class="cyber-btn primary-btn mt-3" (click)="openCustomerModal()">
            Create First Customer
          </button>
        </div>

        <div *ngIf="filteredCustomers.length > 0" class="table-responsive">
          <table class="cyber-table">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Assigned Tier</th>
                <th>Max Discount Allowance</th>
                <th>Primary Contact</th>
                <th>Email Address</th>
                <th>Phone</th>
                <th>Shipping / Office Address</th>
                <th *ngIf="isAdmin" class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let c of filteredCustomers">
                <td>
                  <div class="customer-identity">
                    <span class="customer-name">{{ c.name }}</span>
                    <span class="customer-id mono">ID: #{{ c.id }}</span>
                  </div>
                </td>
                <td>
                  <span class="tier-pill" [class.tier-gold]="c.tier === 'GOLD'" [class.tier-silver]="c.tier === 'SILVER'" [class.tier-bronze]="c.tier === 'BRONZE'" [class.tier-platinum]="c.tier === 'PLATINUM'" [class.tier-enterprise]="c.tier === 'ENTERPRISE'">
                    ★ {{ c.tier }}
                  </span>
                </td>
                <td>
                  <span class="discount-cap-badge">
                    {{ (c.tierMaxDiscount || getTierDiscount(c.tier)) }}% Max
                  </span>
                </td>
                <td>
                  <span class="contact-name font-weight-bold">{{ c.contactPerson || '—' }}</span>
                </td>
                <td>
                  <a [href]="'mailto:' + c.email" class="email-link">{{ c.email }}</a>
                </td>
                <td class="mono text-muted">
                  {{ c.phone || '—' }}
                </td>
                <td>
                  <span class="address-text text-muted" [title]="c.address || ''">
                    {{ c.address || '—' }}
                  </span>
                </td>
                <td *ngIf="isAdmin" class="text-right">
                  <div class="action-buttons">
                    <button class="action-btn edit" (click)="openCustomerModal(c)" title="Edit Customer">
                      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                      </svg>
                    </button>
                    <button class="action-btn delete" (click)="deleteCustomer(c)" title="Delete Customer">
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

      <!-- TAB 2: DISCOUNT TIERS -->
      <div *ngIf="!loading && activeTab === 'tiers'" class="glass-panel table-panel">
        <div *ngIf="filteredTiers.length === 0" class="empty-state">
          <div class="empty-icon">💎</div>
          <h3>No discount tiers found</h3>
          <p>No customer discount tiers configured yet.</p>
          <button *ngIf="isAdmin" class="cyber-btn primary-btn mt-3" (click)="openTierModal()">
            Create First Tier
          </button>
        </div>

        <div *ngIf="filteredTiers.length > 0" class="table-responsive">
          <table class="cyber-table">
            <thead>
              <tr>
                <th>Tier Name</th>
                <th>Max Allowed Discount (%)</th>
                <th>Pricing Policy / Governance Description</th>
                <th *ngIf="isAdmin" class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let t of filteredTiers">
                <td>
                  <span class="tier-pill" [class.tier-gold]="t.tierName === 'GOLD'" [class.tier-silver]="t.tierName === 'SILVER'" [class.tier-bronze]="t.tierName === 'BRONZE'" [class.tier-platinum]="t.tierName === 'PLATINUM'" [class.tier-enterprise]="t.tierName === 'ENTERPRISE'">
                    ★ {{ t.tierName }}
                  </span>
                </td>
                <td class="mono font-weight-bold text-accent">
                  {{ t.maxDiscountPercent }}% Max
                </td>
                <td>
                  <span class="text-muted text-sm">
                    {{ t.description || 'Standard commercial margin policy applied' }}
                  </span>
                </td>
                <td *ngIf="isAdmin" class="text-right">
                  <div class="action-buttons">
                    <button class="action-btn edit" (click)="openTierModal(t)" title="Edit Tier">
                      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                      </svg>
                    </button>
                    <button class="action-btn delete" (click)="deleteTier(t)" title="Delete Tier">
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

      <!-- TAB 3: APPROVAL CHAINS -->
      <div *ngIf="!loading && activeTab === 'chains'" class="glass-panel table-panel">
        <div *ngIf="filteredApprovalChains.length === 0" class="empty-state">
          <div class="empty-icon">⚖️</div>
          <h3>No approval chain rules configured</h3>
          <p>Configure risk score routing brackets for multi-tier approval governance.</p>
          <button *ngIf="isAdmin" class="cyber-btn primary-btn mt-3" (click)="openApprovalChainModal()">
            Create First Approval Rule
          </button>
        </div>

        <div *ngIf="filteredApprovalChains.length > 0" class="table-responsive">
          <table class="cyber-table">
            <thead>
              <tr>
                <th>Risk Score Range</th>
                <th>Required Governance Level</th>
                <th>Approval Routing Workflow</th>
                <th>Description / SLA Policy</th>
                <th *ngIf="isAdmin" class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let ch of filteredApprovalChains">
                <td>
                  <span class="score-bracket mono">
                    {{ ch.minScore | number:'1.2-2' }} &le; Score &le; {{ ch.maxScore | number:'1.2-2' }}
                  </span>
                </td>
                <td>
                  <span class="level-pill" [class.level-finance]="ch.requiredLevel === 'MANAGER_THEN_FINANCE'" [class.level-manager]="ch.requiredLevel === 'MANAGER'">
                    {{ ch.requiredLevel === 'MANAGER_THEN_FINANCE' ? '⚡ Manager + Finance (2-Tier)' : '👤 Sales Manager' }}
                  </span>
                </td>
                <td>
                  <div class="workflow-steps">
                    <span class="step-badge manager">1. Sales Manager</span>
                    <span *ngIf="ch.requiredLevel === 'MANAGER_THEN_FINANCE'" class="step-arrow">&rarr;</span>
                    <span *ngIf="ch.requiredLevel === 'MANAGER_THEN_FINANCE'" class="step-badge finance">2. Commercial Finance</span>
                  </div>
                </td>
                <td>
                  <span class="text-muted text-sm">{{ ch.description || 'Standard SLA governance rule' }}</span>
                </td>
                <td *ngIf="isAdmin" class="text-right">
                  <div class="action-buttons">
                    <button class="action-btn edit" (click)="openApprovalChainModal(ch)" title="Edit Rule">
                      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                      </svg>
                    </button>
                    <button class="action-btn delete" (click)="deleteApprovalChain(ch)" title="Delete Rule">
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
      <!-- CUSTOMER MODAL DIALOG                         -->
      <!-- ============================================== -->
      <div *ngIf="showCustomerModal" class="modal-backdrop" (click)="showCustomerModal = false">
        <div class="cyber-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ editingCustomer ? 'Edit Customer Account' : 'Register New Customer Account' }}</h3>
            <button class="modal-close" (click)="showCustomerModal = false">×</button>
          </div>
          <div class="modal-body">
            <div class="form-grid">
              <div class="form-group span-2">
                <label>Company / Account Name *</label>
                <input type="text" [(ngModel)]="customerForm.name" placeholder="e.g. Acme Corporation" class="form-input" />
              </div>

              <div class="form-group">
                <label>Customer Tier *</label>
                <select [(ngModel)]="customerForm.tier" class="form-input">
                  <option *ngFor="let t of customerTiers" [value]="t.tierName">{{ t.tierName }} (Max {{ t.maxDiscountPercent }}%)</option>
                </select>
              </div>

              <div class="form-group">
                <label>Primary Email Address *</label>
                <input type="email" [(ngModel)]="customerForm.email" placeholder="billing@acmecorp.com" class="form-input" />
              </div>

              <div class="form-group">
                <label>Primary Contact Person</label>
                <input type="text" [(ngModel)]="customerForm.contactPerson" placeholder="e.g. Alex Mercer" class="form-input" />
              </div>

              <div class="form-group">
                <label>Phone Number</label>
                <input type="text" [(ngModel)]="customerForm.phone" placeholder="+1-555-0192" class="form-input" />
              </div>

              <div class="form-group span-2">
                <label>Office / Shipping Address</label>
                <textarea rows="3" [(ngModel)]="customerForm.address" placeholder="100 Silicon Valley Way, San Jose, CA" class="form-input"></textarea>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="cyber-btn secondary-btn" (click)="showCustomerModal = false">Cancel</button>
            <button class="cyber-btn primary-btn" [disabled]="isSaving || !customerForm.name || !customerForm.tier || !customerForm.email" (click)="saveCustomer()">
              {{ isSaving ? 'Saving...' : (editingCustomer ? 'Update Customer' : 'Create Customer') }}
            </button>
          </div>
        </div>
      </div>

      <!-- ============================================== -->
      <!-- DISCOUNT TIER MODAL DIALOG                    -->
      <!-- ============================================== -->
      <div *ngIf="showTierModal" class="modal-backdrop" (click)="showTierModal = false">
        <div class="cyber-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ editingTier ? 'Edit Discount Tier' : 'Create Customer Discount Tier' }}</h3>
            <button class="modal-close" (click)="showTierModal = false">×</button>
          </div>
          <div class="modal-body">
            <div class="form-grid">
              <div class="form-group span-2">
                <label>Tier Name *</label>
                <input type="text" [(ngModel)]="tierForm.tierName" placeholder="e.g. PLATINUM / ENTERPRISE" class="form-input" />
              </div>

              <div class="form-group span-2">
                <label>Max Allowed Discount (%) *</label>
                <input type="number" step="0.5" [(ngModel)]="tierForm.maxDiscountPercent" placeholder="15" class="form-input" />
                <span class="field-hint">Ceiling before automated risk overage triggers for this tier</span>
              </div>

              <div class="form-group span-2">
                <label>Governance Description</label>
                <textarea rows="3" [(ngModel)]="tierForm.description" placeholder="Pricing allowance rationale..." class="form-input"></textarea>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="cyber-btn secondary-btn" (click)="showTierModal = false">Cancel</button>
            <button class="cyber-btn primary-btn" [disabled]="isSaving || !tierForm.tierName || tierForm.maxDiscountPercent < 0" (click)="saveTier()">
              {{ isSaving ? 'Saving...' : (editingTier ? 'Update Tier' : 'Create Tier') }}
            </button>
          </div>
        </div>
      </div>

      <!-- ============================================== -->
      <!-- APPROVAL CHAIN MODAL DIALOG                   -->
      <!-- ============================================== -->
      <div *ngIf="showApprovalChainModal" class="modal-backdrop" (click)="showApprovalChainModal = false">
        <div class="cyber-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ editingApprovalChain ? 'Edit Approval Chain Rule' : 'Create Approval Chain Rule' }}</h3>
            <button class="modal-close" (click)="showApprovalChainModal = false">×</button>
          </div>
          <div class="modal-body">
            <div class="form-grid">
              <div class="form-group">
                <label>Min Risk Score *</label>
                <input type="number" step="0.5" [(ngModel)]="approvalChainForm.minScore" placeholder="0.01" class="form-input" />
              </div>

              <div class="form-group">
                <label>Max Risk Score *</label>
                <input type="number" step="0.5" [(ngModel)]="approvalChainForm.maxScore" placeholder="10.00" class="form-input" />
              </div>

              <div class="form-group span-2">
                <label>Required Governance Level *</label>
                <select [(ngModel)]="approvalChainForm.requiredLevel" class="form-input">
                  <option value="MANAGER">Sales Manager (1-Tier)</option>
                  <option value="MANAGER_THEN_FINANCE">Sales Manager + Commercial Finance (2-Tier)</option>
                </select>
              </div>

              <div class="form-group span-2">
                <label>Governance Description</label>
                <textarea rows="3" [(ngModel)]="approvalChainForm.description" placeholder="Policy explanation for this bracket..." class="form-input"></textarea>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="cyber-btn secondary-btn" (click)="showApprovalChainModal = false">Cancel</button>
            <button class="cyber-btn primary-btn" [disabled]="isSaving || approvalChainForm.minScore < 0 || approvalChainForm.maxScore < approvalChainForm.minScore" (click)="saveApprovalChain()">
              {{ isSaving ? 'Saving...' : (editingApprovalChain ? 'Update Rule' : 'Create Rule') }}
            </button>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .customer-container {
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
    .customer-header {
      padding: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
      flex-wrap: wrap;
    }

    .customer-badge {
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

    .customer-identity {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .customer-name {
      font-weight: 600;
      color: #0f172a;
    }

    .customer-id {
      font-size: 11px;
      color: #94a3b8;
    }

    .tier-pill {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 700;
      letter-spacing: 0.04em;
    }

    .tier-gold {
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fde68a;
    }

    .tier-silver {
      background: #f1f5f9;
      color: #334155;
      border: 1px solid #cbd5e1;
    }

    .tier-bronze {
      background: #ffedd5;
      color: #9a3412;
      border: 1px solid #fed7aa;
    }

    .tier-platinum {
      background: #e0e7ff;
      color: #3730a3;
      border: 1px solid #c7d2fe;
    }

    .tier-enterprise {
      background: #1e1b4b;
      color: #c7d2fe;
      border: 1px solid #4338ca;
    }

    .discount-cap-badge {
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      font-family: ui-monospace, monospace;
    }

    .email-link {
      color: #2563eb;
      text-decoration: none;
      font-size: 13px;
    }

    .email-link:hover {
      text-decoration: underline;
    }

    .address-text {
      display: block;
      max-width: 260px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: 12.5px;
    }

    .score-bracket {
      background: #f8fafc;
      color: #0f172a;
      border: 1px solid #e2e8f0;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
    }

    .level-pill {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
    }

    .level-manager {
      background: #fef3c7;
      color: #b45309;
      border: 1px solid #fde68a;
    }

    .level-finance {
      background: #f5f3ff;
      color: #6d28d9;
      border: 1px solid #ddd6fe;
    }

    .workflow-steps {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .step-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .step-badge.manager {
      background: #fffbeb;
      color: #d97706;
      border: 1px solid #fef3c7;
    }

    .step-badge.finance {
      background: #faf5ff;
      color: #7c3aed;
      border: 1px solid #f3e8ff;
    }

    .step-arrow {
      color: #94a3b8;
      font-size: 12px;
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
export class CustomerManagementComponent implements OnInit {
  activeTab: 'customers' | 'tiers' | 'chains' = 'customers';
  loading = false;
  isSaving = false;
  searchQuery = '';
  selectedTierFilter = 'ALL';

  toastMessage = '';
  isToastError = false;

  customers: Customer[] = [];
  customerTiers: CustomerTier[] = [];
  approvalChains: ApprovalChainRule[] = [];

  // Modals state
  showCustomerModal = false;
  editingCustomer: Customer | null = null;
  customerForm: CustomerRequest = {
    name: '',
    tier: 'BRONZE',
    email: '',
    contactPerson: '',
    phone: '',
    address: ''
  };

  showTierModal = false;
  editingTier: CustomerTier | null = null;
  tierForm: CustomerTierRequest = {
    tierName: '',
    maxDiscountPercent: 5,
    description: ''
  };

  showApprovalChainModal = false;
  editingApprovalChain: ApprovalChainRule | null = null;
  approvalChainForm: ApprovalChainRequest = {
    minScore: 0.01,
    maxScore: 10.00,
    requiredLevel: 'MANAGER',
    description: ''
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
      case 'customers': return 'Customer';
      case 'tiers': return 'Discount Tier';
      case 'chains': return 'Approval Rule';
    }
  }

  ngOnInit() {
    this.loadAllData(true);
  }

  setTab(tab: 'customers' | 'tiers' | 'chains') {
    this.activeTab = tab;
    this.searchQuery = '';
  }

  loadAllData(showSpinner = true) {
    if (showSpinner) {
      this.loading = true;
    }

    // Load discount tiers
    this.catalogService.getCustomerTiers().subscribe({
      next: (tiers) => {
        this.customerTiers = tiers || [];
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Failed to load customer tiers', err)
    });

    // Load approval chains
    this.catalogService.getApprovalChains().subscribe({
      next: (chains) => {
        this.approvalChains = chains || [];
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Failed to load approval chains', err)
    });

    // Load customers
    this.catalogService.getCustomers().subscribe({
      next: (custs) => {
        this.customers = custs || [];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load customers', err);
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  get filteredCustomers(): Customer[] {
    let result = this.customers;
    if (this.selectedTierFilter !== 'ALL') {
      result = result.filter(c => c.tier === this.selectedTierFilter);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.contactPerson && c.contactPerson.toLowerCase().includes(q)) ||
        (c.tier && c.tier.toLowerCase().includes(q))
      );
    }
    return result;
  }

  get filteredTiers(): CustomerTier[] {
    if (!this.searchQuery.trim()) return this.customerTiers;
    const q = this.searchQuery.toLowerCase();
    return this.customerTiers.filter(t =>
      (t.tierName && t.tierName.toLowerCase().includes(q)) ||
      (t.description && t.description.toLowerCase().includes(q))
    );
  }

  get filteredApprovalChains(): ApprovalChainRule[] {
    if (!this.searchQuery.trim()) return this.approvalChains;
    const q = this.searchQuery.toLowerCase();
    return this.approvalChains.filter(ch =>
      ch.requiredLevel.toLowerCase().includes(q) ||
      (ch.description && ch.description.toLowerCase().includes(q))
    );
  }

  getTierDiscount(tierName?: string): number {
    if (!tierName) return 5;
    const tier = this.customerTiers.find(t => t.tierName?.toUpperCase() === tierName.toUpperCase());
    return tier ? (tier.maxDiscountPercent || 5) : 5;
  }

  openCreateModal() {
    switch (this.activeTab) {
      case 'customers': this.openCustomerModal(); break;
      case 'tiers': this.openTierModal(); break;
      case 'chains': this.openApprovalChainModal(); break;
    }
  }

  // ===================================
  // CUSTOMER MODAL & ACTIONS
  // ===================================
  openCustomerModal(cust?: Customer) {
    if (cust) {
      this.editingCustomer = cust;
      this.customerForm = {
        name: cust.name,
        tier: cust.tier || 'BRONZE',
        email: cust.email || '',
        contactPerson: cust.contactPerson || '',
        phone: cust.phone || '',
        address: cust.address || '',
        portalUserId: cust.portalUserId
      };
    } else {
      this.editingCustomer = null;
      this.customerForm = {
        name: '',
        tier: this.customerTiers[0]?.tierName || 'BRONZE',
        email: '',
        contactPerson: '',
        phone: '',
        address: ''
      };
    }
    this.showCustomerModal = true;
    this.cdr.markForCheck();
  }

  saveCustomer() {
    if (!this.customerForm.name || !this.customerForm.tier || !this.customerForm.email) {
      this.showToast('Company name, tier, and email are required', true);
      return;
    }

    this.isSaving = true;
    if (this.editingCustomer) {
      this.catalogService.updateCustomer(this.editingCustomer.id, this.customerForm).subscribe({
        next: (updated) => {
          this.isSaving = false;
          this.showCustomerModal = false;
          this.showToast(`Customer account "${updated.name}" updated successfully`);
          this.loadAllData(false);
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isSaving = false;
          this.showToast(err?.error?.message || 'Failed to update customer', true);
          this.cdr.markForCheck();
        }
      });
    } else {
      this.catalogService.createCustomer(this.customerForm).subscribe({
        next: (created) => {
          this.isSaving = false;
          this.showCustomerModal = false;
          this.showToast(`Customer account "${created.name}" registered successfully`);
          this.loadAllData(false);
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isSaving = false;
          this.showToast(err?.error?.message || 'Failed to register customer', true);
          this.cdr.markForCheck();
        }
      });
    }
  }

  deleteCustomer(cust: Customer) {
    if (!confirm(`Are you sure you want to delete customer account "${cust.name}"?`)) return;
    this.catalogService.deleteCustomer(cust.id).subscribe({
      next: () => {
        this.showToast(`Customer "${cust.name}" deleted`);
        this.loadAllData(false);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.showToast(err?.error?.message || 'Failed to delete customer', true);
        this.cdr.markForCheck();
      }
    });
  }

  // ===================================
  // DISCOUNT TIER MODAL & ACTIONS
  // ===================================
  openTierModal(tier?: CustomerTier) {
    if (tier) {
      this.editingTier = tier;
      this.tierForm = {
        tierName: tier.tierName || '',
        maxDiscountPercent: tier.maxDiscountPercent || 5,
        description: tier.description || ''
      };
    } else {
      this.editingTier = null;
      this.tierForm = {
        tierName: '',
        maxDiscountPercent: 5,
        description: ''
      };
    }
    this.showTierModal = true;
    this.cdr.markForCheck();
  }

  saveTier() {
    if (!this.tierForm.tierName) {
      this.showToast('Tier name is required', true);
      return;
    }

    this.isSaving = true;
    if (this.editingTier) {
      this.catalogService.updateCustomerTier(this.editingTier.id!, this.tierForm).subscribe({
        next: (updated) => {
          this.isSaving = false;
          this.showTierModal = false;
          this.showToast(`Discount tier "${updated.tierName}" updated successfully`);
          this.loadAllData(false);
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isSaving = false;
          this.showToast(err?.error?.message || 'Failed to update discount tier', true);
          this.cdr.markForCheck();
        }
      });
    } else {
      this.catalogService.createCustomerTier(this.tierForm).subscribe({
        next: (created) => {
          this.isSaving = false;
          this.showTierModal = false;
          this.showToast(`Discount tier "${created.tierName}" created successfully`);
          this.loadAllData(false);
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isSaving = false;
          this.showToast(err?.error?.message || 'Failed to create discount tier', true);
          this.cdr.markForCheck();
        }
      });
    }
  }

  deleteTier(tier: CustomerTier) {
    if (!confirm(`Are you sure you want to delete discount tier "${tier.tierName}"?`)) return;
    this.catalogService.deleteCustomerTier(tier.id!).subscribe({
      next: () => {
        this.showToast(`Discount tier "${tier.tierName}" deleted`);
        this.loadAllData(false);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.showToast(err?.error?.message || 'Failed to delete discount tier', true);
        this.cdr.markForCheck();
      }
    });
  }

  // ===================================
  // APPROVAL CHAIN MODAL & ACTIONS
  // ===================================
  openApprovalChainModal(ch?: ApprovalChainRule) {
    if (ch) {
      this.editingApprovalChain = ch;
      this.approvalChainForm = {
        minScore: ch.minScore,
        maxScore: ch.maxScore,
        requiredLevel: ch.requiredLevel,
        description: ch.description || ''
      };
    } else {
      this.editingApprovalChain = null;
      this.approvalChainForm = {
        minScore: 0.01,
        maxScore: 10.00,
        requiredLevel: 'MANAGER',
        description: ''
      };
    }
    this.showApprovalChainModal = true;
    this.cdr.markForCheck();
  }

  saveApprovalChain() {
    if (this.approvalChainForm.minScore < 0 || this.approvalChainForm.maxScore < this.approvalChainForm.minScore) {
      this.showToast('Invalid score range: max score must be >= min score', true);
      return;
    }

    this.isSaving = true;
    if (this.editingApprovalChain) {
      this.catalogService.updateApprovalChain(this.editingApprovalChain.id, this.approvalChainForm).subscribe({
        next: (updated) => {
          this.isSaving = false;
          this.showApprovalChainModal = false;
          this.showToast(`Approval rule for ${updated.requiredLevel} updated`);
          this.loadAllData(false);
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isSaving = false;
          this.showToast(err?.error?.message || 'Failed to update approval rule', true);
          this.cdr.markForCheck();
        }
      });
    } else {
      this.catalogService.createApprovalChain(this.approvalChainForm).subscribe({
        next: (created) => {
          this.isSaving = false;
          this.showApprovalChainModal = false;
          this.showToast(`Approval rule for ${created.requiredLevel} created`);
          this.loadAllData(false);
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isSaving = false;
          this.showToast(err?.error?.message || 'Failed to create approval rule', true);
          this.cdr.markForCheck();
        }
      });
    }
  }

  deleteApprovalChain(ch: ApprovalChainRule) {
    if (!confirm(`Are you sure you want to delete this approval rule?`)) return;
    this.catalogService.deleteApprovalChain(ch.id).subscribe({
      next: () => {
        this.showToast('Approval rule deleted');
        this.loadAllData(false);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.showToast(err?.error?.message || 'Failed to delete approval rule', true);
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
