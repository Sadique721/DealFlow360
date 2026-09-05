import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-subscription-billing',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="sub-container">
      <div class="header-banner glass-panel">
        <div class="banner-title">
          <span class="sub-icon">🔄</span>
          <div>
            <h2>Subscription Proration & Hybrid Billing Engine</h2>
            <p class="sub">Dynamic mid-cycle seat/plan adjustments with transparent day-based proration math and automated credit notes</p>
          </div>
        </div>
      </div>

      <!-- Main Grid -->
      <div class="sub-grid">
        <!-- Left Column: Active Subscription & Simulator -->
        <div class="main-col">
          <!-- Active Plan Card -->
          <div class="glass-panel plan-card">
            <div class="plan-header">
              <div>
                <span class="badge badge-purple">Enterprise Cloud Tier</span>
                <h3 class="mt-2">Zenith Systems Global SaaS Contract</h3>
                <span class="sub mono">Contract ID: SUB-8821-ZENITH</span>
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
                <span class="val mono text-info">{{ formatCurrency(currentSeats * seatPrice) }}</span>
              </div>
              <div class="p-metric">
                <span class="lbl">Billing Frequency</span>
                <span class="badge badge-neutral">Monthly (1st of month)</span>
              </div>
            </div>
          </div>

          <!-- Mid-Cycle Proration Calculator Simulator -->
          <div class="glass-panel sim-card">
            <h3>Mid-Cycle Seat / Plan Modification Simulator</h3>
            <p class="sub">Simulate adding seats or changing plans halfway through the 30-day billing cycle</p>

            <div class="sim-controls mt-4">
              <div class="form-group">
                <label class="form-label">New Seat Count</label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  class="form-control"
                  [(ngModel)]="targetSeats"
                  (change)="calculateProration()"
                />
              </div>

              <div class="form-group">
                <label class="form-label">Effective Change Day</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  class="form-control"
                  [(ngModel)]="effectiveDay"
                  (change)="calculateProration()"
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

            <div class="action-bar mt-4">
              <button class="btn btn-primary" (click)="executeUpgrade()">
                Execute Mid-Cycle Contract Amendment
              </button>
            </div>
          </div>
        </div>

        <!-- Right Column: Billing Schedule & Credit Notes -->
        <div class="side-col">
          <!-- Upcoming Schedule Card -->
          <div class="glass-panel schedule-card">
            <h4>Billing Milestone Schedule</h4>
            <div class="schedule-list mt-3">
              <div class="sched-item" *ngFor="let s of schedules">
                <div class="sched-left">
                  <span class="mono sched-date">{{ s.date }}</span>
                  <span class="sched-desc">{{ s.description }}</span>
                </div>
                <div class="sched-right">
                  <span class="mono font-bold" [class.text-danger]="s.type === 'CREDIT'">{{ formatCurrency(s.amount) }}</span>
                  <span class="badge" [class.badge-success]="s.status === 'PAID'" [class.badge-neutral]="s.status === 'UPCOMING'" [class.badge-warning]="s.status === 'AMENDMENT'">
                    {{ s.status }}
                  </span>
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
      gap: 20px;
    }
    .header-banner {
      padding: 20px;
      display: flex;
      align-items: center;
      border-left: 4px solid var(--purple);
    }
    .banner-title {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .sub-icon { font-size: 30px; }
    .sub-grid {
      display: grid;
      grid-template-columns: 1fr 340px;
      gap: 20px;
    }
    @media (max-width: 1024px) {
      .sub-grid { grid-template-columns: 1fr; }
    }
    .main-col, .side-col {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .plan-card, .sim-card, .schedule-card {
      padding: 20px;
    }
    .plan-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .plan-metrics {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 14px;
    }
    .p-metric {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .lbl {
      font-size: 11px;
      color: var(--text-muted);
      text-transform: uppercase;
    }
    .val { font-size: 18px; font-weight: 700; }
    .sim-controls {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    .math-breakdown-card {
      background: rgba(59, 130, 246, 0.08);
      border: 1px solid rgba(59, 130, 246, 0.25);
      border-radius: var(--radius-sm);
      padding: 14px;
    }
    .math-title {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      font-size: 12px;
      font-weight: 700;
    }
    .formula-box {
      font-size: 13px;
      color: #93c5fd;
    }
    .formula-calc {
      font-size: 14px;
    }
    .schedule-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .sched-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
    }
    .sched-left {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .sched-date { font-size: 12px; color: var(--text-muted); }
    .sched-desc { font-size: 13px; }
    .sched-right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
    }
    .mt-2 { margin-top: 8px; }
    .mt-3 { margin-top: 12px; }
    .mt-4 { margin-top: 16px; }
  `]
})
export class SubscriptionBillingComponent implements OnInit {
  currentSeats = 50;
  seatPrice = 45;
  targetSeats = 65;
  effectiveDay = 16;
  daysRemaining = 14;
  prorationPct = 46.7;
  prorationAmount = 315;

  schedules = [
    { date: '2026-09-01', description: 'Base Monthly Invoicing (50 seats)', amount: 2250, status: 'PAID', type: 'INVOICE' },
    { date: '2026-09-16', description: 'Mid-Cycle Proration Adjustment (+15 seats)', amount: 315, status: 'AMENDMENT', type: 'PRORATION' },
    { date: '2026-10-01', description: 'Upcoming Monthly Renewal (65 seats)', amount: 2925, status: 'UPCOMING', type: 'INVOICE' }
  ];

  ngOnInit(): void {
    this.calculateProration();
  }

  calculateProration(): void {
    const totalDays = 30;
    this.daysRemaining = Math.max(0, totalDays - this.effectiveDay);
    this.prorationPct = (this.daysRemaining / totalDays) * 100;
    const seatDelta = this.targetSeats - this.currentSeats;
    this.prorationAmount = seatDelta * this.seatPrice * (this.daysRemaining / totalDays);
  }

  executeUpgrade(): void {
    alert(`Contract amendment executed! Additional invoice line generated for ${this.formatCurrency(this.prorationAmount)}.`);
    this.currentSeats = this.targetSeats;
    this.calculateProration();
  }

  formatCurrency(val: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  }
}
