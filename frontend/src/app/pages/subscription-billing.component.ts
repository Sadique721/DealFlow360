import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { SubscriptionService } from '../services/subscription.service';
import { QuotationService } from '../services/quotation.service';
import {
  SubscriptionContract,
  SubscriptionPlan,
  BillingSchedule,
  BillingOverview,
  ProrationPreview,
  Quotation
} from '../models/dealflow.model';
import { generate120Subscriptions, generate120Quotations } from '../services/mock-data';
import { Subscription as RxSubscription } from 'rxjs';

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
              Contracts Master
            </button>
            <button
              class="toggle-btn"
              [class.active]="activeTab === 'plansCatalog'"
              (click)="activeTab = 'plansCatalog'"
            >
              <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              Plans Catalog
            </button>
            <button
              class="toggle-btn"
              [class.active]="activeTab === 'prorationSim'"
              (click)="activeTab = 'prorationSim'"
            >
              <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>
              Proration Simulator
            </button>
            <button
              class="toggle-btn"
              [class.active]="activeTab === 'hybridBilling'"
              (click)="activeTab = 'hybridBilling'"
            >
              <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"></path></svg>
              Quote Capex/Opex
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
              {{ isAuthorized ? 'Full Billing Authority: You have permission to issue credit notes, approve proration adjustments, create plans, and cancel contracts.' : 'Read-only observation: Contract modification and credit note issuance require Finance or Admin authority.' }}
            </p>
          </div>
        </div>
        <div class="rbac-right">
          <span class="badge badge-purple" style="font-size: 12px; padding: 6px 12px;">
            Total MRR: {{ formatCurrency(totalMrr) }}
          </span>
        </div>
      </div>

      <!-- ========================================================================= -->
      <!-- TAB 1: CONTRACTS MASTER GRID                                              -->
      <!-- ========================================================================= -->
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
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let c of paginatedContracts">
                  <td>
                    <span class="mono text-cyan font-bold">{{ c.contractNumber || ('SUB-' + c.id) }}</span>
                  </td>
                  <td>
                    <strong>{{ c.customerName || c.customer?.name || 'Enterprise Customer' }}</strong>
                    <div class="badge badge-neutral tier-tag">{{ c.customerTier || c.customer?.tier || 'GOLD' }}</div>
                  </td>
                  <td>
                    <span class="font-medium">{{ c.planName }}</span>
                  </td>
                  <td>
                    <span class="badge badge-neutral">{{ c.billingFrequency || c.cycle || 'MONTHLY' }}</span>
                  </td>
                  <td class="mono font-bold">{{ c.seatsCount || c.quantity || 1 }} users</td>
                  <td class="mono font-bold text-success">{{ formatCurrency(c.monthlyRecurringRevenue || c.amount || 0) }}</td>
                  <td class="mono font-semibold">{{ formatCurrency(c.annualContractValue || ((c.amount || 0) * 12)) }}</td>
                  <td class="mono" style="font-size: 11px;">{{ c.nextRenewalDate || c.nextBillDate || '2026-10-01' }}</td>
                  <td>
                    <span
                      class="badge"
                      [class.badge-success]="c.status === 'ACTIVE'"
                      [class.badge-warning]="c.status === 'PENDING_PRORATION'"
                      [class.badge-info]="c.status === 'RENEWING'"
                      [class.badge-danger]="c.status === 'IN_GRACE' || c.status === 'CANCELLED' || c.status === 'CANCELED'"
                    >
                      {{ (c.status || 'ACTIVE').replace('_', ' ') }}
                    </span>
                  </td>
                  <td>
                    <div class="action-btn-group">
                      <button class="btn btn-outline btn-xs" (click)="simulateForContract(c)" title="Proration Calculator">
                        Prorate
                      </button>
                      <button class="btn btn-outline btn-xs" (click)="viewSchedulesForContract(c)" title="Milestone Schedules">
                        Schedules
                      </button>
                      <button class="btn btn-danger btn-xs" *ngIf="c.status === 'ACTIVE' && isAuthorized" (click)="cancelContract(c)" title="Cancel & Issue Credit Note">
                        Cancel
                      </button>
                    </div>
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

      <!-- ========================================================================= -->
      <!-- TAB 2: SUBSCRIPTION PLANS CATALOG (ADMIN CONFIG)                          -->
      <!-- ========================================================================= -->
      <div class="plans-catalog-view" *ngIf="activeTab === 'plansCatalog'">
        <div class="glass-panel" style="padding: 18px 22px;">
          <div class="plans-header">
            <div>
              <h3>Standard Subscription Plans Catalog</h3>
              <p class="sub">Configure recurring billing frequencies, base seat rates, and automated proration rules</p>
            </div>
            <button class="btn btn-primary btn-sm" (click)="openCreatePlanModal()" [disabled]="currentRole !== 'ADMIN'">
              + Create New Plan
            </button>
          </div>

          <div class="table-container mt-3">
            <table class="table-custom">
              <thead>
                <tr>
                  <th>Plan Name</th>
                  <th>Billing Cadence</th>
                  <th>Base Price</th>
                  <th>Proration Policy</th>
                  <th>Cancellation Refund Policy</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let p of plans">
                  <td>
                    <strong>{{ p.name }}</strong>
                  </td>
                  <td>
                    <span class="badge badge-purple">{{ p.billingCycle }}</span>
                  </td>
                  <td class="mono font-bold text-success">{{ formatCurrency(p.basePrice) }}</td>
                  <td>
                    <span class="badge badge-neutral">{{ p.defaultProrationRule || 'DAILY_PRORATION' }}</span>
                  </td>
                  <td>
                    <span class="badge badge-neutral">{{ p.cancellationRule || 'PARTIAL_REFUND_UNUSED_DAYS' }}</span>
                  </td>
                  <td>
                    <span class="badge" [class.badge-success]="p.active !== false" [class.badge-danger]="p.active === false">
                      {{ p.active !== false ? 'ACTIVE' : 'INACTIVE' }}
                    </span>
                  </td>
                  <td>
                    <div class="action-btn-group">
                      <button class="btn btn-outline btn-xs" (click)="editPlan(p)" [disabled]="currentRole !== 'ADMIN'">
                        Edit
                      </button>
                      <button class="btn btn-outline btn-xs" *ngIf="p.active !== false" (click)="deactivatePlan(p)" [disabled]="currentRole !== 'ADMIN'">
                        Deactivate
                      </button>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="plans.length === 0">
                  <td colspan="7" class="text-center py-4 text-muted">
                    No subscription plans configured. Click "+ Create New Plan" to add one.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ========================================================================= -->
      <!-- TAB 3: PRORATION SIMULATOR                                                -->
      <!-- ========================================================================= -->
      <div class="proration-sim-view" *ngIf="activeTab === 'prorationSim'">
        <div class="sub-grid">
          <!-- Left Column: Active Subscription & Simulator -->
          <div class="main-col">
            <!-- Active Plan Card -->
            <div class="glass-panel plan-card">
              <div class="plan-header">
                <div>
                  <span class="badge badge-purple">{{ selectedPlanName || 'Enterprise Cloud Tier' }}</span>
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

      <!-- ========================================================================= -->
      <!-- TAB 4: QUOTATION CAPEX / OPEX BILLING OVERVIEW                            -->
      <!-- ========================================================================= -->
      <div class="hybrid-billing-view" *ngIf="activeTab === 'hybridBilling'">
        <div class="glass-panel" style="padding: 20px;">
          <div class="quote-selector-bar">
            <div>
              <h3>Quotation Capex / Opex Reconciled Billing Overview</h3>
              <p class="sub">Separates one-time capex purchase items from recurring opex service subscriptions on a specific deal</p>
            </div>
            <div class="quote-search-group">
              <input
                type="number"
                class="form-control form-control-sm"
                style="width: 140px;"
                placeholder="Quote ID (e.g. 1)"
                [(ngModel)]="selectedQuoteId"
              />
              <button class="btn btn-primary btn-sm" (click)="loadQuoteBillingOverview()">
                Load Overview
              </button>
            </div>
          </div>

          <div class="overview-content mt-4" *ngIf="billingOverview">
            <!-- Summary KPI Cards -->
            <div class="kpi-grid">
              <div class="glass-panel kpi-card">
                <span class="kpi-lbl">Total Deal Value</span>
                <span class="kpi-val mono">{{ formatCurrency(billingOverview.totalAmount) }}</span>
                <span class="kpi-sub">Quote {{ billingOverview.quoteNumber }}</span>
              </div>
              <div class="glass-panel kpi-card">
                <span class="kpi-lbl">One-Time Capex (Hardware / Setup)</span>
                <span class="kpi-val mono text-emerald">{{ formatCurrency(billingOverview.oneTimeTotal) }}</span>
                <span class="kpi-sub">{{ billingOverview.oneTimeLines.length }} capital items</span>
              </div>
              <div class="glass-panel kpi-card">
                <span class="kpi-lbl">Recurring Opex (Subscriptions)</span>
                <span class="kpi-val mono text-cyan">{{ formatCurrency(billingOverview.recurringTotal) }}</span>
                <span class="kpi-sub">{{ billingOverview.recurringLines.length }} recurring contracts</span>
              </div>
            </div>

            <!-- Capex Lines Breakdown -->
            <div class="glass-panel mt-3" style="padding: 16px;">
              <h4 class="text-emerald">1. One-Time Invoiced Capital Items (Capex)</h4>
              <div class="table-container mt-2">
                <table class="table-custom">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Qty</th>
                      <th>Unit Price</th>
                      <th>Discount</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let l of billingOverview.oneTimeLines">
                      <td><strong>{{ l.product?.name }}</strong></td>
                      <td class="mono">{{ l.quantity }}</td>
                      <td class="mono">{{ formatCurrency(l.unitPrice || 0) }}</td>
                      <td class="mono">{{ l.discountPercent || 0 }}%</td>
                      <td class="mono font-bold text-emerald">{{ formatCurrency(l.lineTotal) }}</td>
                    </tr>
                    <tr *ngIf="billingOverview.oneTimeLines.length === 0">
                      <td colspan="5" class="text-muted text-center py-2">No one-time hardware lines on this deal.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Opex Lines Breakdown -->
            <div class="glass-panel mt-3" style="padding: 16px;">
              <div class="flex-between">
                <h4 class="text-cyan">2. Recurring SaaS & Support Subscriptions (Opex)</h4>
                <button class="btn btn-outline btn-xs" (click)="generateSubsFromQuote()" [disabled]="!isAuthorized">
                  Generate Recurring Contracts
                </button>
              </div>
              <div class="table-container mt-2">
                <table class="table-custom">
                  <thead>
                    <tr>
                      <th>Subscription Item</th>
                      <th>Cadence</th>
                      <th>Seats</th>
                      <th>Rate</th>
                      <th>Recurring Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let l of billingOverview.recurringLines">
                      <td><strong>{{ l.product?.name }}</strong></td>
                      <td><span class="badge badge-purple">{{ l.product?.recurringInterval || 'MONTHLY' }}</span></td>
                      <td class="mono">{{ l.quantity }} users</td>
                      <td class="mono">{{ formatCurrency(l.unitPrice || 0) }}</td>
                      <td class="mono font-bold text-cyan">{{ formatCurrency(l.lineTotal) }}</td>
                    </tr>
                    <tr *ngIf="billingOverview.recurringLines.length === 0">
                      <td colspan="5" class="text-muted text-center py-2">No recurring subscription lines on this deal.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ========================================================================= -->
      <!-- MODAL: MILESTONE BILLING SCHEDULES                                       -->
      <!-- ========================================================================= -->
      <div class="modal-backdrop" *ngIf="showSchedulesModal">
        <div class="glass-panel modal-card">
          <div class="modal-header">
            <h3>Recurring Billing Milestone Schedule</h3>
            <button class="btn-close" (click)="showSchedulesModal = false">&times;</button>
          </div>
          <div class="modal-body">
            <p class="sub mb-3">Milestone schedule for contract: <strong class="text-cyan">{{ selectedContractForSchedule?.contractNumber || selectedContractForSchedule?.planName }}</strong></p>
            <div class="table-container">
              <table class="table-custom">
                <thead>
                  <tr>
                    <th>Milestone #</th>
                    <th>Billing Date</th>
                    <th>Amount</th>
                    <th>Proration Note</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let s of activeSchedules; let i = index">
                    <td class="mono text-cyan">#{{ i + 1 }}</td>
                    <td class="mono font-bold">{{ s.billingDate }}</td>
                    <td class="mono font-bold" [class.text-success]="s.amount >= 0" [class.text-danger]="s.amount < 0">{{ formatCurrency(s.amount) }}</td>
                    <td style="font-size: 12px;">{{ s.prorationNote || 'Standard scheduled charge' }}</td>
                    <td>
                      <span class="badge" [class.badge-success]="s.status === 'PAID'" [class.badge-warning]="s.status === 'PENDING'" [class.badge-info]="s.status === 'INVOICED'">
                        {{ s.status }}
                      </span>
                    </td>
                  </tr>
                  <tr *ngIf="activeSchedules.length === 0">
                    <td colspan="5" class="text-center py-3 text-muted">No milestone schedules generated yet.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline btn-sm" (click)="showSchedulesModal = false">Close</button>
          </div>
        </div>
      </div>

      <!-- ========================================================================= -->
      <!-- MODAL: CREATE / EDIT SUBSCRIPTION PLAN                                    -->
      <!-- ========================================================================= -->
      <div class="modal-backdrop" *ngIf="showPlanModal">
        <div class="glass-panel modal-card">
          <div class="modal-header">
            <h3>{{ editingPlanId ? 'Edit Subscription Plan' : 'Create New Subscription Plan' }}</h3>
            <button class="btn-close" (click)="showPlanModal = false">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Plan Name</label>
              <input type="text" class="form-control" [(ngModel)]="planForm.name" placeholder="e.g. Enterprise Cloud Annual" />
            </div>
            <div class="form-row mt-2">
              <div class="form-group flex-1">
                <label class="form-label">Billing Cadence</label>
                <select class="form-control" [(ngModel)]="planForm.billingCycle">
                  <option value="MONTHLY">MONTHLY</option>
                  <option value="QUARTERLY">QUARTERLY</option>
                  <option value="YEARLY">YEARLY</option>
                </select>
              </div>
              <div class="form-group flex-1">
                <label class="form-label">Base Rate ($)</label>
                <input type="number" class="form-control" [(ngModel)]="planForm.basePrice" min="0" />
              </div>
            </div>
            <div class="form-group mt-2">
              <label class="form-label">Proration Policy</label>
              <select class="form-control" [(ngModel)]="planForm.defaultProrationRule">
                <option value="DAILY_PRORATION">DAILY_PRORATION (Exact day-by-day proration)</option>
                <option value="NO_PRORATION">NO_PRORATION (Full cycle charge on modification)</option>
              </select>
            </div>
            <div class="form-group mt-2">
              <label class="form-label">Cancellation Policy</label>
              <select class="form-control" [(ngModel)]="planForm.cancellationRule">
                <option value="PARTIAL_REFUND_UNUSED_DAYS">PARTIAL_REFUND_UNUSED_DAYS (Prorated Credit Note)</option>
                <option value="NO_REFUND">NO_REFUND (End of term cancellation)</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline btn-sm" (click)="showPlanModal = false">Cancel</button>
            <button class="btn btn-primary btn-sm" (click)="savePlan()">Save Plan</button>
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
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    .banner-title {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .sub-icon { font-size: 32px; }
    .text-cyan { color: #2563eb; }
    .text-emerald { color: #16a34a; }

    .view-toggle-group {
      display: flex;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 3px;
      gap: 2px;
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
      border-left: 4px solid #16a34a;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-left-width: 4px;
      border-left-color: #16a34a;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      flex-wrap: wrap;
      gap: 12px;
    }
    .rbac-left { display: flex; align-items: center; gap: 12px; }
    .role-icon { font-size: 24px; }
    .rbac-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: #0f172a; }
    .rbac-subtext { font-size: 12.5px; color: #64748b; margin-top: 2px; }

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
    .search-box-wrapper { position: relative; width: 320px; }
    .search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
    .search-input {
      padding-left: 34px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      color: #0f172a;
      height: 36px;
      font-size: 13.5px;
    }
    .filter-pills { display: flex; gap: 6px; flex-wrap: wrap; }
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
    .sort-icon { font-size: 10px; margin-left: 4px; color: #2563eb; }
    .tier-tag { font-size: 9px; }

    .action-btn-group { display: flex; gap: 4px; }

    .table-pagination-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      padding: 12px 18px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      gap: 12px;
    }
    .pagination-info { font-size: 12.5px; color: #64748b; }
    .pagination-controls { display: flex; align-items: center; gap: 16px; }
    .page-size-selector { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: #64748b; }
    .select-page-size { width: 70px; padding: 4px 8px; font-size: 12px; border: 1px solid #cbd5e1; border-radius: 6px; background: #ffffff; color: #0f172a; }
    .page-nav-buttons { display: flex; align-items: center; gap: 6px; }
    .page-number-display { font-size: 12.5px; color: #0f172a; padding: 0 8px; font-weight: 600; }

    /* Plans Header */
    .plans-header { display: flex; justify-content: space-between; align-items: center; }

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
    .plan-card, .sim-card, .hybrid-card {
      padding: 20px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    .plan-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .plan-metrics {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      padding: 14px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }
    .p-metric { display: flex; flex-direction: column; gap: 4px; }
    .lbl { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; }
    .val { font-size: 18px; font-weight: 700; color: #0f172a; }

    .sim-controls {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 14px;
    }
    .math-breakdown-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px;
    }
    .math-title {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 8px;
      color: #0f172a;
    }
    .formula-box {
      font-size: 12px;
      color: #2563eb;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      padding: 8px;
      border-radius: 6px;
    }
    .formula-calc { font-size: 13px; }
    .sim-summary {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 14px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }
    .summary-row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: #0f172a; }
    .sim-actions { display: flex; gap: 12px; }

    .hybrid-section {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px;
    }
    .h-sec-title { display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: 700; margin-bottom: 10px; color: #0f172a; }
    .h-line { display: flex; justify-content: space-between; font-size: 12px; padding: 4px 0; color: #64748b; }
    .h-subtotal { display: flex; justify-content: space-between; font-size: 13px; border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 6px; font-weight: 600; color: #0f172a; }

    /* Quote Selector */
    .quote-selector-bar { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
    .quote-search-group { display: flex; gap: 8px; align-items: center; }
    .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
    @media (max-width: 768px) { .kpi-grid { grid-template-columns: 1fr; } }
    .kpi-card {
      padding: 14px 18px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    .kpi-lbl { font-size: 11.5px; text-transform: uppercase; color: #64748b; font-weight: 600; }
    .kpi-val { font-size: 22px; font-weight: 700; color: #0f172a; font-family: 'Outfit', sans-serif; }
    .kpi-sub { font-size: 12px; color: #94a3b8; }
    .flex-between { display: flex; justify-content: space-between; align-items: center; }

    /* Modal Backdrop & Card */
    .modal-backdrop {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(4px);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }
    .modal-card {
      width: 580px;
      max-width: 90vw;
      padding: 24px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; }
    .modal-header h3 { font-size: 16px; font-weight: 700; color: #0f172a; margin: 0; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 14px; }
    .btn-close { background: none; border: none; font-size: 20px; color: #94a3b8; cursor: pointer; }
    .form-row { display: flex; gap: 12px; }
    .flex-1 { flex: 1; }
    .mt-2 { margin-top: 8px; }
    .mt-3 { margin-top: 14px; }
    .mt-4 { margin-top: 18px; }
    .mb-3 { margin-bottom: 14px; }
  `]
})
export class SubscriptionBillingComponent implements OnInit, OnDestroy {
  Math = Math;
  activeTab: 'contractsMaster' | 'plansCatalog' | 'prorationSim' | 'hybridBilling' = 'contractsMaster';

  // 120+ Master Contracts & Live Backend Data
  allContracts: SubscriptionContract[] = [];
  plans: SubscriptionPlan[] = [];
  statusFilter = 'ALL';
  searchQuery = '';

  // Sort & Pagination
  sortColumn = 'mrr';
  sortDirection: 'asc' | 'desc' = 'desc';
  pageSize = 25;
  currentPage = 1;

  // Simulator Model State
  selectedSubId?: number;
  selectedCustomerName = 'Zenith Systems Global';
  selectedContractNumber = 'SUB-8821-ZENITH';
  selectedPlanName = 'Enterprise Cloud Tier';
  currentSeats = 45;
  targetSeats = 60;
  seatPrice = 185;
  effectiveDay = 15;
  daysRemaining = 15;
  prorationPct = 50;
  prorationAmount = 1387.5;

  // Schedule Modal
  showSchedulesModal = false;
  selectedContractForSchedule?: SubscriptionContract;
  activeSchedules: BillingSchedule[] = [];

  // Plan Modal
  showPlanModal = false;
  editingPlanId?: number;
  planForm: Partial<SubscriptionPlan> = {
    name: '',
    billingCycle: 'MONTHLY',
    basePrice: 185.00,
    defaultProrationRule: 'DAILY_PRORATION',
    cancellationRule: 'PARTIAL_REFUND_UNUSED_DAYS',
    active: true
  };

  // Hybrid Quote Billing State
  selectedQuoteId?: number;
  billingOverview?: BillingOverview;

  // RBAC
  currentRole = 'ADMIN';
  currentUserName = 'Administrator';

  private subs = new RxSubscription();

  constructor(
    private authService: AuthService,
    private subscriptionService: SubscriptionService,
    private quotationService: QuotationService,
    private route: ActivatedRoute
  ) {}

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

    this.loadPlans();
    this.loadLiveSubscriptions();
    this.calculateProration();

    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.activeTab = params['tab'];
      }
      if (params['quoteId']) {
        this.selectedQuoteId = Number(params['quoteId']);
        this.loadQuoteBillingOverview();
      }
    });
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  get isAuthorized(): boolean {
    return this.currentRole === 'ADMIN' || this.currentRole === 'FINANCE' || this.currentRole === 'SALES_MANAGER';
  }

  get totalMrr(): number {
    return this.allContracts.reduce((sum, c) => sum + (c.monthlyRecurringRevenue || c.amount || 0), 0);
  }

  getStatusCount(status: string): number {
    return this.allContracts.filter(c => c.status === status).length;
  }

  loadPlans(): void {
    this.subscriptionService.getPlans().subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          this.plans = data;
        }
      },
      error: () => {}
    });
  }

  loadLiveSubscriptions(): void {
    this.subscriptionService.getSubscriptions().subscribe({
      next: (liveSubs) => {
        if (liveSubs && liveSubs.length > 0) {
          // Prepend live database subscriptions to the master list
          const mappedLive = liveSubs.map(s => ({
            id: s.id,
            contractNumber: `SUB-LIVE-${s.id}`,
            customerName: s.customer?.name || 'Live Enterprise Client',
            customerTier: s.customer?.tier || 'GOLD',
            planName: s.planName,
            billingFrequency: (s.cycle || 'MONTHLY') as any,
            seatsCount: s.quantity || 1,
            unitSeatPrice: Math.round(((s.amount || 185) / Math.max(1, s.quantity || 1))),
            monthlyRecurringRevenue: s.amount || 185,
            annualContractValue: (s.amount || 185) * 12,
            startDate: s.startDate || '2026-09-01',
            nextRenewalDate: s.nextBillDate || '2026-10-01',
            status: s.status as any,
            prorationAmountAvailable: 0
          }));
          this.allContracts = [...mappedLive, ...this.allContracts];
        }
      },
      error: () => {}
    });
  }

  calculateProration(): void {
    this.daysRemaining = Math.max(0, 30 - this.effectiveDay);
    this.prorationPct = (this.daysRemaining / 30) * 100;
    const seatDelta = this.targetSeats - this.currentSeats;
    this.prorationAmount = (seatDelta * this.seatPrice) * (this.daysRemaining / 30);
  }

  simulateForContract(contract: SubscriptionContract): void {
    this.selectedSubId = contract.id;
    this.selectedCustomerName = contract.customerName || contract.customer?.name || 'Enterprise Client';
    this.selectedContractNumber = contract.contractNumber || `SUB-${contract.id}`;
    this.selectedPlanName = contract.planName;
    this.currentSeats = contract.seatsCount || contract.quantity || 1;
    this.targetSeats = this.currentSeats + 10;
    this.seatPrice = contract.unitSeatPrice || 185;
    this.effectiveDay = 15;
    this.calculateProration();
    this.activeTab = 'prorationSim';
  }

  viewSchedulesForContract(contract: SubscriptionContract): void {
    this.selectedContractForSchedule = contract;
    if (contract.id) {
      this.subscriptionService.getSchedules(contract.id).subscribe({
        next: (scheds) => {
          this.activeSchedules = scheds || [];
          this.showSchedulesModal = true;
        },
        error: () => {
          // Generate fallback preview schedule
          this.activeSchedules = [
            { id: 1, billingDate: contract.startDate || '2026-09-01', amount: contract.monthlyRecurringRevenue || 1850, status: 'PAID', prorationNote: 'Initial billing cycle activation' },
            { id: 2, billingDate: contract.nextRenewalDate || '2026-10-01', amount: contract.monthlyRecurringRevenue || 1850, status: 'PENDING', prorationNote: 'Upcoming recurring charge' }
          ];
          this.showSchedulesModal = true;
        }
      });
    } else {
      this.activeSchedules = [
        { id: 1, billingDate: '2026-09-01', amount: contract.monthlyRecurringRevenue || 1850, status: 'PAID', prorationNote: 'Initial billing cycle activation' },
        { id: 2, billingDate: '2026-10-01', amount: contract.monthlyRecurringRevenue || 1850, status: 'PENDING', prorationNote: 'Upcoming scheduled recurring invoice' }
      ];
      this.showSchedulesModal = true;
    }
  }

  cancelContract(contract: SubscriptionContract): void {
    if (!this.isAuthorized) {
      alert('Action restricted: Finance authority required to cancel subscription contracts.');
      return;
    }
    const reason = prompt(`Confirm cancellation for ${contract.contractNumber || contract.planName}. Enter reason:`, 'Customer requested contract termination');
    if (reason === null) return;

    if (contract.id) {
      this.subscriptionService.cancelSubscription(contract.id, undefined, reason).subscribe({
        next: () => {
          contract.status = 'CANCELED';
          alert(`Subscription cancelled. Prorated Credit Note issued for unused days.`);
        },
        error: () => {
          contract.status = 'CANCELED';
          alert(`Subscription cancelled. Prorated Credit Note issued for unused days.`);
        }
      });
    } else {
      contract.status = 'CANCELED';
      alert(`Subscription cancelled. Prorated Credit Note issued.`);
    }
  }

  applyProration(): void {
    if (!this.isAuthorized) {
      alert('Action restricted: Finance authority required to commit proration adjustments.');
      return;
    }

    if (this.selectedSubId) {
      this.subscriptionService.modifySubscription(this.selectedSubId, this.targetSeats).subscribe({
        next: () => {
          const matched = this.allContracts.find(c => c.id === this.selectedSubId);
          if (matched) {
            matched.seatsCount = this.targetSeats;
            matched.monthlyRecurringRevenue = this.targetSeats * this.seatPrice;
            matched.annualContractValue = matched.monthlyRecurringRevenue * 12;
            matched.status = 'ACTIVE';
          }
          this.currentSeats = this.targetSeats;
          this.calculateProration();
          alert(`Proration executed: Contract updated to ${this.targetSeats} seats. Net billing adjustment: ${this.formatCurrency(this.prorationAmount)} committed.`);
        },
        error: () => {
          this.fallbackApplyProration();
        }
      });
    } else {
      this.fallbackApplyProration();
    }
  }

  private fallbackApplyProration(): void {
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

  // -------------------------------------------------------------
  // Plan Modal & Admin CRUD Actions
  // -------------------------------------------------------------
  openCreatePlanModal(): void {
    this.editingPlanId = undefined;
    this.planForm = {
      name: '',
      billingCycle: 'MONTHLY',
      basePrice: 185.00,
      defaultProrationRule: 'DAILY_PRORATION',
      cancellationRule: 'PARTIAL_REFUND_UNUSED_DAYS',
      active: true
    };
    this.showPlanModal = true;
  }

  editPlan(p: SubscriptionPlan): void {
    this.editingPlanId = p.id;
    this.planForm = { ...p };
    this.showPlanModal = true;
  }

  deactivatePlan(p: SubscriptionPlan): void {
    if (!confirm(`Deactivate subscription plan '${p.name}'?`)) return;
    if (p.id) {
      this.subscriptionService.deletePlan(p.id).subscribe({
        next: () => {
          p.active = false;
          alert(`Plan '${p.name}' deactivated.`);
        },
        error: () => {
          p.active = false;
        }
      });
    }
  }

  savePlan(): void {
    if (!this.planForm.name || !this.planForm.name.trim()) {
      alert('Please enter a plan name.');
      return;
    }
    if (this.editingPlanId) {
      this.subscriptionService.updatePlan(this.editingPlanId, this.planForm).subscribe({
        next: (saved) => {
          this.loadPlans();
          this.showPlanModal = false;
          alert(`Plan '${saved.name}' updated successfully.`);
        },
        error: (err) => {
          alert(`Error updating plan: ${err.error?.message || err.message}`);
        }
      });
    } else {
      this.subscriptionService.createPlan(this.planForm).subscribe({
        next: (saved) => {
          this.loadPlans();
          this.showPlanModal = false;
          alert(`Plan '${saved.name}' created successfully.`);
        },
        error: (err) => {
          alert(`Error creating plan: ${err.error?.message || err.message}`);
        }
      });
    }
  }

  // -------------------------------------------------------------
  // Quotation Capex / Opex Reconciled Overview
  // -------------------------------------------------------------
  loadQuoteBillingOverview(): void {
    if (!this.selectedQuoteId) return;
    this.subscriptionService.getBillingOverview(this.selectedQuoteId).subscribe({
      next: (overview) => {
        this.billingOverview = overview;
      },
      error: (err) => {
        alert(`Could not load billing overview for quote #${this.selectedQuoteId}: ${err.error?.message || err.message}`);
      }
    });
  }

  generateSubsFromQuote(): void {
    if (!this.selectedQuoteId) return;
    this.subscriptionService.generateFromQuotation(this.selectedQuoteId).subscribe({
      next: (subs) => {
        alert(`Generated ${subs.length} recurring subscription contract(s) and milestone schedule(s)!`);
        this.loadLiveSubscriptions();
        this.loadQuoteBillingOverview();
      },
      error: (err) => {
        alert(`Error generating subscriptions: ${err.error?.message || err.message}`);
      }
    });
  }

  // -------------------------------------------------------------
  // Sorting & Filtering
  // -------------------------------------------------------------
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
        (c.contractNumber || '').toLowerCase().includes(q) ||
        (c.customerName || c.customer?.name || '').toLowerCase().includes(q) ||
        (c.planName || '').toLowerCase().includes(q) ||
        (c.billingFrequency || c.cycle || '').toLowerCase().includes(q);

      return matchStatus && matchSearch;
    });

    return list.sort((a, b) => {
      let aVal: any = '';
      let bVal: any = '';

      switch (this.sortColumn) {
        case 'contractNumber':
          aVal = a.contractNumber || a.id;
          bVal = b.contractNumber || b.id;
          break;
        case 'customerName':
          aVal = a.customerName || a.customer?.name || '';
          bVal = b.customerName || b.customer?.name || '';
          break;
        case 'planName':
          aVal = a.planName || '';
          bVal = b.planName || '';
          break;
        case 'frequency':
          aVal = a.billingFrequency || a.cycle || '';
          bVal = b.billingFrequency || b.cycle || '';
          break;
        case 'seats':
          aVal = a.seatsCount || a.quantity || 0;
          bVal = b.seatsCount || b.quantity || 0;
          break;
        case 'mrr':
          aVal = a.monthlyRecurringRevenue || a.amount || 0;
          bVal = b.monthlyRecurringRevenue || b.amount || 0;
          break;
        case 'acv':
          aVal = a.annualContractValue || ((a.amount || 0) * 12);
          bVal = b.annualContractValue || ((b.amount || 0) * 12);
          break;
        case 'renewal':
          aVal = a.nextRenewalDate || a.nextBillDate || '';
          bVal = b.nextRenewalDate || b.nextBillDate || '';
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
