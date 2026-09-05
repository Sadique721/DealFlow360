import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { ApprovalService } from '../services/approval.service';
import { QuotationService } from '../services/quotation.service';
import { ApprovalRequest, ApprovalStep, Quotation, RiskCalculationResult } from '../models/dealflow.model';

@Component({
  selector: 'app-approval-center',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="approval-container" *ngIf="approval">
      <!-- Breadcrumb -->
      <div class="nav-header">
        <a routerLink="/pipeline" class="back-link">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"></path></svg>
          Pipeline
        </a>
        <span class="divider">/</span>
        <span class="mono title-id">Approval Review: {{ approval.quotation.quoteNumber }}</span>
        <span class="badge badge-warning">{{ approval.status.replace('_', ' ') }}</span>
      </div>

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
                <p class="sub">Identifies the exact product lines causing margin erosion beyond allowed tier & category ceilings</p>
              </div>
            </div>

            <div class="risk-metrics-bar">
              <div class="risk-metric">
                <span class="rm-lbl">Blended Discount</span>
                <span class="rm-val text-danger font-bold mono">{{ approval.quotation.blendedDiscountPct | number:'1.1-2' }}%</span>
              </div>
              <div class="risk-metric">
                <span class="rm-lbl">Deal Margin</span>
                <span class="rm-val font-bold mono" [class.text-danger]="approval.quotation.marginPct < 18">
                  {{ approval.quotation.marginPct | number:'1.1-2' }}%
                </span>
              </div>
              <div class="risk-metric">
                <span class="rm-lbl">Risk Score</span>
                <span class="badge badge-danger">{{ approval.quotation.riskScore | number:'1.1-2' }} / 10.0</span>
              </div>
              <div class="risk-metric">
                <span class="rm-lbl">Required SLA</span>
                <span class="badge badge-warning">2 Hours Max</span>
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
                    <td colspan="6" class="text-center text-muted py-4">
                      No culprit overages detected. Deal satisfies standard thresholds.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Quotation Details Table -->
          <div class="glass-panel items-panel">
            <div class="panel-header">
              <h4>Complete Order Structure ({{ approval.quotation.lines?.length || 0 }} items)</h4>
              <span class="mono total-badge">Order Value: {{ formatCurrency(approval.quotation.totalAmount) }}</span>
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
                  <tr *ngFor="let line of approval.quotation.lines">
                    <td>
                      <strong>{{ line.product.name }}</strong>
                      <div class="mono sku">{{ line.product.sku }} | {{ line.product.type }}</div>
                    </td>
                    <td>{{ line.quantity }}</td>
                    <td>{{ formatCurrency(line.unitListPrice) }}</td>
                    <td>
                      <span [class.text-danger]="line.unitDiscountPct > 20" class="mono font-semibold">
                        {{ line.unitDiscountPct | number:'1.1-1' }}%
                      </span>
                    </td>
                    <td class="mono font-bold">{{ formatCurrency(line.lineTotal) }}</td>
                    <td>
                      <span class="badge" [class.badge-success]="line.lineMarginPct >= 30" [class.badge-warning]="line.lineMarginPct >= 18 && line.lineMarginPct < 30" [class.badge-danger]="line.lineMarginPct < 18">
                        {{ line.lineMarginPct | number:'1.1-1' }}%
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
          <!-- Sequential Stepper Card -->
          <div class="glass-panel stepper-card">
            <h4 class="card-title">Approval Routing Workflow</h4>

            <div class="stepper">
              <div
                class="step-item"
                *ngFor="let step of approval.steps; let i = index"
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
          <div class="glass-panel decision-card" *ngIf="approval.status === 'PENDING'">
            <h4 class="card-title">Executive Action</h4>
            
            <div class="form-group">
              <label class="form-label">Reviewer Comments / Audit Justification</label>
              <textarea
                class="form-control"
                rows="3"
                placeholder="Enter justification or reason for modification..."
                [(ngModel)]="decisionComments"
              ></textarea>
            </div>

            <div class="decision-buttons">
              <button class="btn btn-success btn-block" (click)="submitDecision('APPROVE')">
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"></path></svg>
                Approve Quotation
              </button>
              <button class="btn btn-outline btn-block" (click)="submitDecision('REQUEST_MODIFICATION')">
                Request Margin Rebalance
              </button>
              <button class="btn btn-danger btn-block" (click)="submitDecision('REJECT')">
                Reject Deal
              </button>
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
      gap: 16px;
    }
    .nav-header {
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
    .title-id { font-size: 18px; font-weight: 700; color: var(--text-main); }
    .review-grid {
      display: grid;
      grid-template-columns: 1fr 340px;
      gap: 16px;
    }
    @media (max-width: 1024px) {
      .review-grid { grid-template-columns: 1fr; }
    }
    .main-column {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .culprit-panel {
      padding: 18px;
      border-left: 3px solid var(--danger);
    }
    .culprit-header {
      display: flex;
      gap: 12px;
      align-items: center;
      margin-bottom: 16px;
    }
    .shield-icon { font-size: 24px; }
    .risk-metrics-bar {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 12px;
      margin-bottom: 16px;
    }
    .risk-metric {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .rm-lbl {
      font-size: 11px;
      color: var(--text-muted);
      text-transform: uppercase;
    }
    .rm-val { font-size: 18px; }
    .text-danger { color: var(--danger); }
    .items-panel {
      padding: 18px;
    }
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
    }
    .total-badge {
      font-size: 15px;
      font-weight: 700;
      color: #38bdf8;
    }
    .sku { font-size: 10px; color: var(--text-muted); }
    .side-column {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .stepper-card, .decision-card {
      padding: 18px;
    }
    .card-title {
      font-size: 12px;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 16px;
    }
    .stepper {
      display: flex;
      flex-direction: column;
      gap: 18px;
      position: relative;
    }
    .step-item {
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }
    .step-indicator {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.1);
      border: 2px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 12px;
      color: var(--text-sub);
    }
    .step-completed .step-indicator {
      background: var(--success);
      border-color: var(--success);
      color: #fff;
    }
    .step-active .step-indicator {
      background: var(--warning);
      border-color: var(--warning);
      color: #000;
    }
    .step-rejected .step-indicator {
      background: var(--danger);
      border-color: var(--danger);
      color: #fff;
    }
    .step-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .step-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
    }
    .step-role { font-size: 11px; }
    .step-sla {
      font-size: 11px;
      color: var(--warning);
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 2px;
    }
    .decision-buttons {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .btn-block { width: 100%; }
  `]
})
export class ApprovalCenterComponent implements OnInit {
  approval?: ApprovalRequest;
  culpritDetails: any[] = [];
  decisionComments = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private approvalService: ApprovalService,
    private quoteService: QuotationService
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const quoteId = idParam ? parseInt(idParam, 10) : 1;
    this.loadApproval(quoteId);
  }

  loadApproval(quoteId: number): void {
    this.approvalService.getRequestForQuotation(quoteId).subscribe({
      next: (req) => {
        this.approval = req;
        if (req.culpritLineBreakdownJson) {
          try {
            this.culpritDetails = JSON.parse(req.culpritLineBreakdownJson);
          } catch (e) {
            this.culpritDetails = [];
          }
        }
      },
      error: (err) => console.error('Error fetching approval', err)
    });
  }

  submitDecision(action: 'APPROVE' | 'REJECT' | 'REQUEST_MODIFICATION'): void {
    if (!this.approval) return;
    this.approvalService.processDecision(this.approval.id, action, this.decisionComments).subscribe({
      next: () => {
        alert(`Decision recorded: ${action}!`);
        this.router.navigate(['/pipeline']);
      },
      error: (err) => alert('Error processing decision: ' + (err.error?.message || err.message))
    });
  }

  formatCurrency(val: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  }
}
