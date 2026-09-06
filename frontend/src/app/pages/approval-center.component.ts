import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { ApprovalService } from '../services/approval.service';
import { QuotationService } from '../services/quotation.service';
import { AuthService } from '../services/auth.service';
import { ApprovalRequest, ApprovalStep, Quotation, LineOverageDetail } from '../models/dealflow.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-approval-center',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="approval-container">
      <!-- Breadcrumb & Top Bar -->
      <div class="nav-header glass-panel">
        <div class="header-left">
          <a routerLink="/dashboard/pipeline" class="back-link">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"></path></svg>
            Pipeline
          </a>
          <span class="divider">/</span>
          <span class="mono title-id">Multi-Tier Discount Governance Center</span>
          <span class="badge badge-warning">{{ pendingCount }} Pending Review</span>
        </div>

        <div class="header-actions">
          <div class="view-toggle-group">
            <button
              class="toggle-btn"
              [class.active]="activeTab === 'queue'"
              (click)="activeTab = 'queue'"
            >
              <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
              Approval Queue (120+)
            </button>
            <button
              class="toggle-btn"
              [class.active]="activeTab === 'detail'"
              (click)="activeTab = 'detail'"
              [disabled]="!selectedApproval"
            >
              <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              Audit & Decision: {{ selectedApproval ? selectedApproval.quotation.quoteNumber : 'None Selected' }}
            </button>
          </div>
        </div>
      </div>

      <!-- RBAC Authority Banner -->
      <div class="glass-panel rbac-authority-banner">
        <div class="rbac-left">
          <span class="shield-icon">🛡️</span>
          <div>
            <div class="rbac-user-line">
              <span>Acting Persona:</span>
              <strong class="text-cyan">{{ currentUserName }}</strong>
              <span
                class="badge ml-2"
                [class.badge-primary]="currentRole==='ADMIN'"
                [class.badge-warning]="currentRole==='SALES_MANAGER'"
                [class.badge-success]="currentRole==='FINANCE'"
                [class.badge-danger]="currentRole==='SALES_REP'"
              >
                {{ currentRole }}
              </span>
            </div>
            <p class="rbac-authority-text">{{ rbacAuthorityDescription }}</p>
          </div>
        </div>
        <div class="rbac-right">
          <span class="badge" [class.badge-success]="canSign" [class.badge-danger]="!canSign">
            {{ canSign ? '✓ Signing Authority Active' : '✕ Read-Only Observation Mode' }}
          </span>
        </div>
      </div>

      <!-- TAB 1: 120+ APPROVAL QUEUE DATA GRID -->
      <div class="queue-view" *ngIf="activeTab === 'queue'">
        <!-- Filter Bar -->
        <div class="glass-panel filter-bar">
          <div class="search-box-wrapper">
            <svg class="search-icon" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><path d="M21 21l-4.35-4.35"></path></svg>
            <input
              type="text"
              class="form-control search-input"
              placeholder="Filter queue by quote #, client, or rep..."
              [(ngModel)]="searchQuery"
              (input)="currentPage = 1"
            />
          </div>

          <div class="filter-pills">
            <button
              class="pill-btn"
              [class.active]="statusFilter === 'ALL'"
              (click)="statusFilter = 'ALL'; currentPage = 1"
            >
              All Requests ({{ approvals.length }})
            </button>
            <button
              class="pill-btn"
              [class.active]="statusFilter === 'PENDING'"
              (click)="statusFilter = 'PENDING'; currentPage = 1"
            >
              Pending ({{ getStatusCount('PENDING') }})
            </button>
            <button
              class="pill-btn"
              [class.active]="statusFilter === 'LEVEL_1'"
              (click)="statusFilter = 'LEVEL_1'; currentPage = 1"
            >
              Level 1 Manager ({{ getLevelCount('LEVEL_1_MANAGER') }})
            </button>
            <button
              class="pill-btn"
              [class.active]="statusFilter === 'LEVEL_2'"
              (click)="statusFilter = 'LEVEL_2'; currentPage = 1"
            >
              Level 2 Finance ({{ getLevelCount('LEVEL_2_FINANCE') }})
            </button>
          </div>
        </div>

        <!-- 120+ Table Card -->
        <div class="glass-panel table-card">
          <div class="table-container">
            <table class="table-custom">
              <thead>
                <tr>
                  <th (click)="setSort('quoteNumber')" class="sortable-th">
                    Quote # <span class="sort-icon">{{ getSortIcon('quoteNumber') }}</span>
                  </th>
                  <th (click)="setSort('client')" class="sortable-th">
                    Enterprise Client <span class="sort-icon">{{ getSortIcon('client') }}</span>
                  </th>
                  <th (click)="setSort('level')" class="sortable-th">
                    Required Authority <span class="sort-icon">{{ getSortIcon('level') }}</span>
                  </th>
                  <th (click)="setSort('subtotal')" class="sortable-th">
                    Total Value <span class="sort-icon">{{ getSortIcon('subtotal') }}</span>
                  </th>
                  <th (click)="setSort('discount')" class="sortable-th">
                    Blended Disc % <span class="sort-icon">{{ getSortIcon('discount') }}</span>
                  </th>
                  <th (click)="setSort('margin')" class="sortable-th">
                    Deal Margin % <span class="sort-icon">{{ getSortIcon('margin') }}</span>
                  </th>
                  <th (click)="setSort('riskScore')" class="sortable-th">
                    Risk Score <span class="sort-icon">{{ getSortIcon('riskScore') }}</span>
                  </th>
                  <th (click)="setSort('status')" class="sortable-th">
                    Governance Status <span class="sort-icon">{{ getSortIcon('status') }}</span>
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of paginatedApprovals" [class.row-selected]="selectedApproval?.id === item.id">
                  <td>
                    <span class="mono text-cyan font-bold">{{ item.quotation.quoteNumber }}</span>
                  </td>
                  <td>
                    <strong>{{ item.quotation.customer.name }}</strong>
                    <div class="text-muted" style="font-size: 11px;">Rep: {{ item.quotation.salesRep.name }}</div>
                  </td>
                  <td>
                    <span
                      class="badge"
                      [class.badge-warning]="item.currentLevel === 'LEVEL_1_MANAGER'"
                      [class.badge-danger]="item.currentLevel === 'LEVEL_2_FINANCE'"
                    >
                      {{ item.requiredTier }}
                    </span>
                  </td>
                  <td class="mono font-semibold">{{ formatCurrency(item.quotation.totalAmount) }}</td>
                  <td>
                    <span class="mono font-bold" [class.text-danger]="item.quotation.blendedDiscountPct > 15">
                      {{ item.quotation.blendedDiscountPct | number:'1.1-1' }}%
                    </span>
                  </td>
                  <td>
                    <span
                      class="badge"
                      [class.badge-success]="item.quotation.marginPct >= 30"
                      [class.badge-warning]="item.quotation.marginPct >= 18 && item.quotation.marginPct < 30"
                      [class.badge-danger]="item.quotation.marginPct < 18"
                    >
                      {{ item.quotation.marginPct | number:'1.1-1' }}%
                    </span>
                  </td>
                  <td>
                    <span
                      class="badge"
                      [class.badge-danger]="item.quotation.riskScore >= 60"
                      [class.badge-warning]="item.quotation.riskScore >= 30 && item.quotation.riskScore < 60"
                      [class.badge-success]="item.quotation.riskScore < 30"
                    >
                      {{ item.quotation.riskScore | number:'1.1-1' }}
                    </span>
                  </td>
                  <td>
                    <span
                      class="badge"
                      [class.badge-warning]="item.status === 'PENDING'"
                      [class.badge-success]="item.status === 'APPROVED'"
                      [class.badge-danger]="item.status === 'REJECTED'"
                    >
                      {{ item.status }}
                    </span>
                  </td>
                  <td>
                    <button class="btn btn-outline btn-sm" (click)="selectApproval(item)">
                      Inspect & Review
                    </button>
                  </td>
                </tr>
                <tr *ngIf="paginatedApprovals.length === 0">
                  <td colspan="9" class="text-center py-4 text-muted">
                    No matching approvals found.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination Bar -->
          <div class="table-pagination-bar">
            <div class="pagination-info">
              Showing <strong>{{ paginationStartRecord }}</strong> to <strong>{{ paginationEndRecord }}</strong> of <strong>{{ filteredApprovals.length }}</strong> approvals
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

      <!-- TAB 2: DEEP AUDIT & DECISION VIEW (When selected) -->
      <div class="detail-view" *ngIf="activeTab === 'detail' && selectedApproval">
        <!-- Main Review Grid -->
        <div class="review-grid">
          <!-- Left: Culprit Breakdown & Quote Lines -->
          <div class="main-column">
            <!-- Explainable Culprit Line Breakdown Card -->
            <div class="glass-panel culprit-panel">
              <div class="culprit-header">
                <span class="shield-icon">🛡️</span>
                <div>
                  <h3>Explainable Risk & Culprit Line Analysis</h3>
                  <p class="sub">Pinpoints exact line items exceeding allowed category ceilings and diluting company margins</p>
                </div>
              </div>

              <div class="risk-metrics-bar">
                <div class="risk-metric">
                  <span class="rm-lbl">Blended Discount</span>
                  <span class="rm-val text-danger font-bold mono">{{ getQuoteDiscount(selectedApproval.quotation) | number:'1.1-2' }}%</span>
                </div>
                <div class="risk-metric">
                  <span class="rm-lbl">Deal Margin</span>
                  <span class="rm-val font-bold mono" [class.text-danger]="getQuoteMargin(selectedApproval.quotation) < 18">
                    {{ getQuoteMargin(selectedApproval.quotation) | number:'1.1-2' }}%
                  </span>
                </div>
                <div class="risk-metric">
                  <span class="rm-lbl">Risk Score</span>
                  <span class="badge badge-danger">{{ getQuoteRisk(selectedApproval.quotation, selectedApproval) | number:'1.1-1' }} pts</span>
                </div>
                <div class="risk-metric">
                  <span class="rm-lbl">Required SLA</span>
                  <span class="badge badge-warning">2h Executive Window</span>
                </div>
              </div>

              <!-- Culprit Lines Table -->
              <div class="culprit-table-wrap">
                <table class="table-custom">
                  <thead>
                    <tr>
                      <th>Flagged Line Item</th>
                      <th>Revenue Weight</th>
                      <th>Applied Discount</th>
                      <th>Policy Ceiling</th>
                      <th>Discount Overage</th>
                      <th>Risk Contribution</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let c of culpritDetails">
                      <td>
                        <strong>{{ c.productName }}</strong>
                      </td>
                      <td class="mono">{{ c.revenueWeightPct | number:'1.1-1' }}%</td>
                      <td class="mono font-bold text-danger">{{ c.appliedDiscountPct | number:'1.1-1' }}%</td>
                      <td class="mono">{{ c.allowedThresholdPct | number:'1.1-1' }}%</td>
                      <td>
                        <span class="badge badge-danger">+{{ c.overagePct | number:'1.1-1' }}% Overage</span>
                      </td>
                      <td class="mono font-semibold">{{ c.weightedContribution | number:'1.2-2' }} pts</td>
                    </tr>
                    <tr *ngIf="culpritDetails.length === 0">
                      <td colspan="6" class="text-center py-3 text-muted">
                        No policy overage lines detected for this quotation.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Complete Order Items Table -->
            <div class="glass-panel items-panel">
              <div class="panel-header">
                <h4>Quotation Structure ({{ (selectedApproval.quotation?.lines?.length) || 1 }} Line Items)</h4>
                <span class="mono total-badge">Order Value: {{ formatCurrency(selectedApproval.quotation?.totalAmount) }}</span>
              </div>

              <div class="table-container">
                <table class="table-custom">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Qty</th>
                      <th>List Price</th>
                      <th>Discount %</th>
                      <th>Line Total</th>
                      <th>Line Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let line of selectedApproval.quotation?.lines">
                      <td>
                        <strong>{{ line.product?.name || 'Line Item' }}</strong>
                        <div class="mono sku">{{ line.product?.sku || ('PRD-' + (line.product?.id || line.id)) }} | {{ line.lineType || 'ONE_TIME' }}</div>
                      </td>
                      <td>{{ line.quantity }}</td>
                      <td>{{ formatCurrency(getLineListPrice(line)) }}</td>
                      <td>
                        <span [class.text-danger]="getLineDiscountPct(line) > 15" class="mono font-semibold">
                          {{ getLineDiscountPct(line) | number:'1.1-1' }}%
                        </span>
                      </td>
                      <td class="mono font-bold">{{ formatCurrency(line.lineTotal) }}</td>
                      <td>
                        <span class="badge" [class.badge-success]="getLineMarginPct(line) >= 30" [class.badge-warning]="getLineMarginPct(line) >= 18 && getLineMarginPct(line) < 30" [class.badge-danger]="getLineMarginPct(line) < 18">
                          {{ getLineMarginPct(line) | number:'1.1-1' }}%
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Right: Sequential Multi-Tier Approval Stepper & Decision Box -->
          <div class="side-column">
            <!-- Stepper Card -->
            <div class="glass-panel stepper-card">
              <h4 class="card-title">Approval Routing Workflow</h4>

              <div class="stepper">
                <div
                  class="step-item"
                  *ngFor="let step of selectedApproval.steps; let i = index"
                  [class.step-completed]="step.status === 'APPROVED'"
                  [class.step-active]="step.status === 'PENDING'"
                  [class.step-rejected]="step.status === 'REJECTED'"
                >
                  <div class="step-indicator">
                    <span *ngIf="step.status === 'APPROVED'">✓</span>
                    <span *ngIf="step.status === 'PENDING'">{{ i + 1 }}</span>
                    <span *ngIf="step.status === 'REJECTED'">✕</span>
                  </div>
                  <div class="step-content">
                    <div class="step-header">
                      <strong>{{ step.level.replace('_', ' ') }}</strong>
                      <span
                        class="badge"
                        [class.badge-success]="step.status === 'APPROVED'"
                        [class.badge-warning]="step.status === 'PENDING'"
                        [class.badge-danger]="step.status === 'REJECTED'"
                      >
                        {{ step.status }}
                      </span>
                    </div>
                    <div class="step-role text-muted">{{ step.approverRole }}</div>
                    <div class="step-sla" *ngIf="step.status === 'PENDING'">
                      <span class="clock-icon">⏱</span> SLA: 2h Remaining
                    </div>
                    <div class="step-notes text-muted" *ngIf="step.comments">
                      "{{ step.comments }}"
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Decision Action Card -->
            <div class="glass-panel decision-card">
              <h4 class="card-title">Executive Action Desk</h4>
              
              <div *ngIf="!canSign" class="alert-box-warning">
                <span>⚠️ Your current role ({{ currentRole }}) has read-only access. Switch to Sales Manager, Finance, or Admin to execute approvals.</span>
              </div>

              <div class="form-group mt-3">
                <label class="form-label">Reviewer Audit Justification</label>
                <textarea
                  class="form-control"
                  rows="3"
                  placeholder="Enter audit rationale for approval or required changes..."
                  [(ngModel)]="decisionComments"
                  [disabled]="!canSign"
                ></textarea>
              </div>

              <div class="decision-buttons mt-3" *ngIf="selectedApproval.status === 'PENDING'">
                <button class="btn btn-success btn-block" (click)="submitDecision('APPROVE')" [disabled]="!canSign">
                  <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"></path></svg>
                  Approve Quotation
                </button>
                <button class="btn btn-outline btn-block" (click)="submitDecision('REQUEST_MODIFICATION')" [disabled]="!canSign">
                  Request Margin Rebalance
                </button>
                <button class="btn btn-danger btn-block" (click)="submitDecision('REJECT')" [disabled]="!canSign">
                  Reject Deal
                </button>
              </div>

              <div *ngIf="selectedApproval.status !== 'PENDING'" class="mt-3">
                <span class="badge badge-success btn-block py-2 text-center" *ngIf="selectedApproval.status === 'APPROVED'">
                  ✓ Deal Approved & Recorded in Immutable Audit Trail
                </span>
                <span class="badge badge-danger btn-block py-2 text-center" *ngIf="selectedApproval.status === 'REJECTED'">
                  ✕ Deal Rejected & Escalation Closed
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .approval-container {
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
    .header-left {
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

    /* View Toggle */
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
    .toggle-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* RBAC Authority Banner */
    .rbac-authority-banner {
      padding: 14px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-left: 4px solid #d97706;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-left-width: 4px;
      border-left-color: #d97706;
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
    .shield-icon { font-size: 24px; }
    .rbac-user-line {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 600;
      color: #0f172a;
    }
    .rbac-authority-text {
      font-size: 12.5px;
      color: #64748b;
      margin-top: 2px;
    }

    /* Queue Filter Bar */
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
      width: 280px;
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
    .sort-icon { font-size: 10px; margin-left: 4px; color: #2563eb; }
    .row-selected { background: #eff6ff !important; border-left: 3px solid #2563eb; }

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

    /* Detail Grid Layout */
    .review-grid {
      display: grid;
      grid-template-columns: 1fr 340px;
      gap: 16px;
    }
    @media (max-width: 1024px) {
      .review-grid { grid-template-columns: 1fr; }
    }
    .main-column, .side-column {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .culprit-panel, .items-panel, .stepper-card, .decision-card {
      padding: 20px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    .culprit-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 14px;
    }
    .risk-metrics-bar {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      padding: 14px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      margin-bottom: 16px;
    }
    .risk-metric {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .rm-lbl { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; }
    .rm-val { font-size: 18px; font-weight: 700; color: #0f172a; }

    .stepper {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-top: 14px;
    }
    .step-item {
      display: flex;
      gap: 12px;
    }
    .step-indicator {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      color: #64748b;
    }
    .step-completed .step-indicator { background: #16a34a; color: #ffffff; }
    .step-active .step-indicator { background: #d97706; color: #ffffff; box-shadow: 0 0 8px rgba(217, 119, 6, 0.4); }
    .step-content { flex: 1; }
    .step-header { display: flex; justify-content: space-between; font-weight: 600; color: #0f172a; }
    .step-role { font-size: 11.5px; margin-top: 2px; color: #64748b; }
    .step-sla { font-size: 11.5px; color: #d97706; margin-top: 4px; font-weight: 600; }
    .step-notes { font-size: 12px; margin-top: 4px; font-style: italic; color: #475569; }

    .decision-buttons { display: flex; flex-direction: column; gap: 8px; }
    .btn-block { width: 100%; }
    .alert-box-warning {
      background: #fffbeb;
      border: 1px solid #fde68a;
      padding: 12px;
      border-radius: 8px;
      color: #b45309;
      font-size: 12.5px;
      line-height: 1.4;
    }
    .sku { font-size: 11px; color: #64748b; font-family: 'JetBrains Mono', monospace; }
    .total-badge { font-size: 15px; font-weight: 700; color: #2563eb; }
    .panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
  `]
})
export class ApprovalCenterComponent implements OnInit, OnDestroy {
  approvals: ApprovalRequest[] = [];
  selectedApproval: ApprovalRequest | null = null;
  culpritDetails: LineOverageDetail[] = [];
  decisionComments = '';

  activeTab: 'queue' | 'detail' = 'queue';
  statusFilter = 'ALL';
  searchQuery = '';

  // Sort & Pagination state
  sortColumn = 'riskScore';
  sortDirection: 'asc' | 'desc' = 'desc';
  pageSize = 10;
  currentPage = 1;

  // RBAC
  currentRole = 'ADMIN';
  currentUserName = '';
  private subs = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private approvalService: ApprovalService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.subs.add(
      this.authService.currentRole$.subscribe(role => {
        this.currentRole = role;
        this.cdr.detectChanges();
      })
    );

    this.subs.add(
      this.authService.currentUser$.subscribe(user => {
        this.currentUserName = user.name;
        this.cdr.detectChanges();
      })
    );

    this.loadApprovals();
  }

  loadApprovals(): void {
    this.approvalService.getPendingRequests().subscribe({
      next: (data) => {
        // Always use real backend data — empty array = no pending approvals (correct state)
        this.approvals = data || [];
        this.initSelectedApproval();
        this.cdr.detectChanges();
      },
      error: (_err) => {
        this.approvals = [];
        this.initSelectedApproval();
        this.cdr.detectChanges();
      }
    });
  }

  initSelectedApproval(): void {
    const routeId = this.route.snapshot.paramMap.get('id');
    if (routeId && routeId !== 'new') {
      const numericId = parseInt(routeId, 10);
      const matched = this.approvals.find(a => a.id === numericId || a.quotation?.id === numericId);
      if (matched) {
        this.selectApproval(matched);
      } else if (this.approvals.length > 0) {
        this.selectApproval(this.approvals[0]);
      }
    } else if (this.approvals.length > 0) {
      this.selectedApproval = this.approvals[0];
      this.parseCulprits(this.selectedApproval);
    }
    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  selectApproval(app: ApprovalRequest): void {
    this.selectedApproval = app;
    this.parseCulprits(app);
    this.activeTab = 'detail';
    this.cdr.detectChanges();
  }

  parseCulprits(app: ApprovalRequest): void {
    let parsed: LineOverageDetail[] = [];
    try {
      if (app.culpritLineBreakdownJson && app.culpritLineBreakdownJson.trim().length > 2) {
        const raw = JSON.parse(app.culpritLineBreakdownJson);
        if (Array.isArray(raw)) {
          parsed = raw.filter((item: any) => item.isCulprit || item.overagePoints > 0 || item.overagePct > 0);
        }
      }
    } catch (e) {
      parsed = [];
    }

    // Dynamic database fallback: compute culprits directly from quotation.lines if JSON breakdown was empty
    if (parsed.length === 0 && app.quotation?.lines && app.quotation.lines.length > 0) {
      const q = app.quotation;
      const orderTotal = Number(q.totalAmount || q.subtotalAmount || 1);
      parsed = q.lines.map((line: any) => {
        const prodName = line.product?.name || 'Line Item';
        const appliedDisc = Number(line.discountPercent ?? line.unitDiscountPct ?? 0);
        const categoryCap = Number(line.product?.category?.maxDiscountPercent ?? line.product?.category?.maxDiscountCeilingPct ?? 10.0);
        const overage = appliedDisc > categoryCap ? (appliedDisc - categoryCap) : Number(line.overagePoints || 0);
        const lineVal = Number(line.lineTotal || 0);
        const revWeight = orderTotal > 0 ? (lineVal / orderTotal) * 100 : 0;
        const gamma = Number(line.product?.category?.sensitivityGamma ?? 1.5);
        const contrib = (overage * revWeight * gamma) / 10;

        return {
          productName: prodName,
          revenueWeightPct: Number(revWeight.toFixed(1)),
          appliedDiscountPct: Number(appliedDisc.toFixed(1)),
          allowedThresholdPct: Number(categoryCap.toFixed(1)),
          overagePct: Number(overage.toFixed(1)),
          weightedContribution: Number(contrib.toFixed(2)),
          isCulprit: overage > 0 || line.status === 'OVER'
        } as LineOverageDetail;
      }).filter((c: any) => c.overagePct > 0 || c.isCulprit);
    }

    this.culpritDetails = parsed;
    this.cdr.detectChanges();
  }

  getQuoteDiscount(q?: Quotation | any): number {
    if (!q) return 0;
    if (q.blendedDiscountPct != null && Number(q.blendedDiscountPct) > 0) return Number(q.blendedDiscountPct);
    const sub = Number(q.subtotalAmount || 0);
    const disc = Number(q.totalDiscountAmount || 0);
    if (sub > 0 && disc > 0) {
      return (disc / sub) * 100;
    }
    return 0;
  }

  getQuoteMargin(q?: Quotation | any): number {
    if (!q) return 0;
    if (q.marginPercentage != null && Number(q.marginPercentage) > 0) return Number(q.marginPercentage);
    if (q.marginPct != null && Number(q.marginPct) > 0) return Number(q.marginPct);
    const total = Number(q.totalAmount || 0);
    const margin = Number(q.totalMarginAmount || 0);
    if (total > 0 && margin > 0) {
      return (margin / total) * 100;
    }
    const cost = Number(q.totalCost || 0);
    if (total > 0 && cost > 0) {
      return ((total - cost) / total) * 100;
    }
    return 0;
  }

  getQuoteRisk(q?: Quotation | any, app?: ApprovalRequest | any): number {
    if (app?.blendedRiskScore != null && Number(app.blendedRiskScore) > 0) return Number(app.blendedRiskScore);
    if (app?.riskScore != null && Number(app.riskScore) > 0) return Number(app.riskScore);
    if (q?.blendedRiskScore != null && Number(q.blendedRiskScore) > 0) return Number(q.blendedRiskScore);
    if (q?.riskScore != null && Number(q.riskScore) > 0) return Number(q.riskScore);
    return 0;
  }

  getLineListPrice(line: any): number {
    if (!line) return 0;
    if (line.unitListPrice != null && Number(line.unitListPrice) > 0) return Number(line.unitListPrice);
    if (line.unitPrice != null && Number(line.unitPrice) > 0) return Number(line.unitPrice);
    if (line.product?.basePrice != null && Number(line.product.basePrice) > 0) return Number(line.product.basePrice);
    return 0;
  }

  getLineDiscountPct(line: any): number {
    if (!line) return 0;
    if (line.discountPercent != null && Number(line.discountPercent) > 0) return Number(line.discountPercent);
    if (line.unitDiscountPct != null && Number(line.unitDiscountPct) > 0) return Number(line.unitDiscountPct);
    const list = this.getLineListPrice(line);
    const qty = Number(line.quantity || 1);
    const total = Number(line.lineTotal || 0);
    if (list > 0 && qty > 0 && total > 0) {
      const fullList = list * qty;
      if (fullList > total) {
        return ((fullList - total) / fullList) * 100;
      }
    }
    return 0;
  }

  getLineMarginPct(line: any): number {
    if (!line) return 0;
    if (line.lineMarginPct != null && Number(line.lineMarginPct) > 0) return Number(line.lineMarginPct);
    const total = Number(line.lineTotal || 0);
    const margin = Number(line.marginAmount || 0);
    if (total > 0 && margin > 0) {
      return (margin / total) * 100;
    }
    const cost = Number(line.costPrice ?? line.product?.costPrice ?? 0) * Number(line.quantity || 1);
    if (total > 0 && cost > 0) {
      return ((total - cost) / total) * 100;
    }
    return 0;
  }

  get canSign(): boolean {
    if (this.currentRole === 'ADMIN') return true;
    if (this.currentRole === 'SALES_MANAGER') return true;
    if (this.currentRole === 'FINANCE') return true;
    return false; // Sales reps and customers do not have executive sign-off authority
  }

  get rbacAuthorityDescription(): string {
    if (this.currentRole === 'ADMIN') {
      return 'Full Executive Authority: You can approve, rebalance, or reject any quote level (Level 1 & Level 2).';
    }
    if (this.currentRole === 'SALES_MANAGER') {
      return 'Sales Manager Authority: Authorized to approve Level 1 discounts up to policy ceiling.';
    }
    if (this.currentRole === 'FINANCE') {
      return 'Finance Authority: Authorized to review high-risk Tier 2 discount exceptions and margin breaches.';
    }
    if (this.currentRole === 'SALES_REP') {
      return 'Representative View: Signing authority is restricted to Sales Managers and Finance Officers.';
    }
    return 'Observation session.';
  }

  get pendingCount(): number {
    return this.approvals.filter(a => a.status === 'PENDING').length;
  }

  getStatusCount(status: string): number {
    return this.approvals.filter(a => a.status === status).length;
  }

  getLevelCount(level: string): number {
    return this.approvals.filter(a => (a.currentLevel || a.currentStage) === level).length;
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

  get filteredApprovals(): ApprovalRequest[] {
    const list = this.approvals.filter(a => {
      let matchFilter = true;
      if (this.statusFilter === 'PENDING') matchFilter = a.status === 'PENDING';
      if (this.statusFilter === 'LEVEL_1') matchFilter = (a.currentLevel === 'LEVEL_1_MANAGER' || a.currentStage === 'SALES_MANAGER');
      if (this.statusFilter === 'LEVEL_2') matchFilter = (a.currentLevel === 'LEVEL_2_FINANCE' || a.currentStage === 'FINANCE');

      const q = this.searchQuery.toLowerCase().trim();
      const matchSearch = !q ||
        a.quotation?.quoteNumber?.toLowerCase().includes(q) ||
        a.quotation?.customer?.name?.toLowerCase().includes(q) ||
        a.quotation?.salesRep?.name?.toLowerCase().includes(q);

      return matchFilter && matchSearch;
    });

    return list.sort((a, b) => {
      let aVal: any = '';
      let bVal: any = '';

      switch (this.sortColumn) {
        case 'quoteNumber':
          aVal = a.quotation?.quoteNumber || '';
          bVal = b.quotation?.quoteNumber || '';
          break;
        case 'client':
          aVal = a.quotation?.customer?.name || '';
          bVal = b.quotation?.customer?.name || '';
          break;
        case 'level':
          aVal = a.currentLevel || a.currentStage || '';
          bVal = b.currentLevel || b.currentStage || '';
          break;
        case 'subtotal':
          aVal = a.quotation?.totalAmount || 0;
          bVal = b.quotation?.totalAmount || 0;
          break;
        case 'discount':
          aVal = a.quotation?.blendedDiscountPct || a.quotation?.totalDiscountAmount || 0;
          bVal = b.quotation?.blendedDiscountPct || b.quotation?.totalDiscountAmount || 0;
          break;
        case 'margin':
          aVal = a.quotation?.marginPercentage || a.quotation?.marginPct || 0;
          bVal = b.quotation?.marginPercentage || b.quotation?.marginPct || 0;
          break;
        case 'riskScore':
          aVal = a.blendedRiskScore || a.quotation?.riskScore || 0;
          bVal = b.blendedRiskScore || b.quotation?.riskScore || 0;
          break;
        case 'status':
          aVal = a.status || '';
          bVal = b.status || '';
          break;
        default:
          aVal = a.id || 0;
          bVal = b.id || 0;
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
    return Math.ceil(this.filteredApprovals.length / this.pageSize) || 1;
  }

  get paginatedApprovals(): ApprovalRequest[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredApprovals.slice(start, start + this.pageSize);
  }

  get paginationStartRecord(): number {
    if (this.filteredApprovals.length === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get paginationEndRecord(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredApprovals.length);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  submitDecision(action: 'APPROVE' | 'REJECT' | 'REQUEST_MODIFICATION'): void {
    if (!this.selectedApproval) return;

    if (!this.canSign) {
      alert('Only Sales Managers, Finance Officers, and Administrators have signing authority.');
      return;
    }

    if (!this.decisionComments || !this.decisionComments.trim()) {
      alert('Decision comments are required for all governance actions.');
      return;
    }

    const quoteId = this.selectedApproval.quotation?.id || this.selectedApproval.id;
    const comments = this.decisionComments.trim();

    this.approvalService.processDecision(quoteId, action, comments).subscribe({
      next: (res) => {
        if (action === 'APPROVE') {
          const reqStatus = res?.status || 'APPROVED';
          const stage = res?.currentStage;

          this.selectedApproval!.status = reqStatus;
          if (this.selectedApproval!.quotation) {
            this.selectedApproval!.quotation.status = reqStatus === 'APPROVED' ? 'APPROVED' : 'PENDING_APPROVAL';
          }

          if (reqStatus === 'PENDING' && (stage === 'FINANCE' || stage === 'LEVEL_2_FINANCE')) {
            alert(`✅ Stage 1 (Sales Manager) Approved!\nProposal escalated to Stage 2 (Finance Operations) for final sign-off.`);
          } else {
            alert(`🎉 Quotation ${this.selectedApproval!.quotation?.quoteNumber || quoteId} fully APPROVED across all governance tiers!\nAction logged to immutable audit trail.`);
          }
        } else if (action === 'REJECT') {
          this.selectedApproval!.status = 'REJECTED';
          if (this.selectedApproval!.quotation) {
            this.selectedApproval!.quotation.status = 'REJECTED';
          }
          alert(`Quotation ${this.selectedApproval!.quotation?.quoteNumber || quoteId} REJECTED.`);
        } else {
          this.selectedApproval!.status = 'RETURNED';
          if (this.selectedApproval!.quotation) {
            this.selectedApproval!.quotation.status = 'RETURNED';
          }
          alert(`Quotation ${this.selectedApproval!.quotation?.quoteNumber || quoteId} returned to Sales Representative for margin rebalance.`);
        }
        this.decisionComments = '';
        this.loadApprovals();
      },
      error: (err) => {
        alert(`Approval action failed: ${err.error?.message || err.message || 'Server error'}`);
      }
    });
  }

  formatCurrency(val?: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val || 0);
  }
}
