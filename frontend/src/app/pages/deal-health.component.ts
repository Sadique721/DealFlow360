import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DealHealthService } from '../services/dealhealth.service';
import { DealHealthFlag } from '../models/dealflow.model';

@Component({
  selector: 'app-deal-health',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="health-container">
      <div class="header-banner glass-panel">
        <div class="banner-title">
          <span class="radar-pulse">📡</span>
          <div>
            <h2>Deal Health & Anomaly Radar</h2>
            <p class="sub">Continuous background scanning for statistical discount outliers (Z-score &ge; 2.0), stalled pipelines (>7 days), and SLA escalations</p>
          </div>
        </div>
        <div class="stat-pills">
          <span class="badge badge-danger">{{ flags.length }} Active Anomalies</span>
          <span class="badge badge-warning">2h SLA Auto-Escalation</span>
        </div>
      </div>

      <!-- Flags Grid -->
      <div class="flags-grid">
        <div
          class="glass-panel flag-card"
          *ngFor="let f of flags"
          [class.card-critical]="f.severity === 'CRITICAL'"
        >
          <div class="flag-top">
            <div class="flag-type-badge">
              <span class="badge" [class.badge-danger]="f.severity === 'CRITICAL'" [class.badge-warning]="f.severity === 'HIGH'">
                {{ f.flagType.replace('_', ' ') }}
              </span>
              <span class="badge badge-neutral mono">{{ f.quotation.quoteNumber }}</span>
            </div>
            <span class="detected-at mono">{{ f.detectedAt | date:'short' }}</span>
          </div>

          <div class="flag-body">
            <h4>{{ f.quotation.customer.name }}</h4>
            <p class="flag-desc">{{ f.description }}</p>
            <div class="flag-meta">
              <span>Sales Rep: <strong>{{ f.quotation.salesRep.name }}</strong></span>
              <span>Total Value: <strong>{{ formatCurrency(f.quotation.totalAmount) }}</strong></span>
            </div>
          </div>

          <div class="flag-actions">
            <button class="btn btn-outline btn-sm" (click)="nudgeRep(f.id)">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
              Nudge Rep
            </button>
            <button class="btn btn-danger btn-sm" (click)="escalate(f.id)">
              Escalate to VP
            </button>
            <a [routerLink]="['/quote', f.quotation.id]" class="btn btn-primary btn-sm">
              Review Deal
            </a>
          </div>
        </div>

        <div class="glass-panel empty-card" *ngIf="flags.length === 0">
          <span>✨ No active anomalies. All deal metrics within normal standard deviations.</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .health-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .header-banner {
      padding: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
      border-left: 4px solid var(--danger);
    }
    .banner-title {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .radar-pulse { font-size: 32px; }
    .flags-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 16px;
    }
    .flag-card {
      padding: 18px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 14px;
      border: 1px solid var(--border-subtle);
    }
    .card-critical {
      border-color: rgba(239, 68, 68, 0.4);
      background: rgba(239, 68, 68, 0.05);
    }
    .flag-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .flag-type-badge {
      display: flex;
      gap: 6px;
      align-items: center;
    }
    .detected-at {
      font-size: 11px;
      color: var(--text-muted);
    }
    .flag-desc {
      font-size: 13px;
      color: var(--text-sub);
      margin: 8px 0;
      line-height: 1.4;
    }
    .flag-meta {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: var(--text-muted);
      border-top: 1px solid var(--border-subtle);
      padding-top: 8px;
    }
    .flag-actions {
      display: flex;
      gap: 8px;
    }
    .empty-card {
      grid-column: 1 / -1;
      padding: 40px;
      text-align: center;
      color: var(--text-muted);
    }
  `]
})
export class DealHealthComponent implements OnInit {
  flags: DealHealthFlag[] = [];

  constructor(private healthService: DealHealthService) {}

  ngOnInit(): void {
    this.loadFlags();
  }

  loadFlags(): void {
    this.healthService.getActiveFlags().subscribe({
      next: (f) => this.flags = f,
      error: (err) => console.error('Error fetching flags', err)
    });
  }

  nudgeRep(id: number): void {
    this.healthService.nudgeRep(id).subscribe({
      next: (res) => alert(res.message || 'Rep notification dispatched!'),
      error: (err) => alert('Error: ' + err.message)
    });
  }

  escalate(id: number): void {
    this.healthService.escalateFlag(id).subscribe({
      next: (res) => {
        alert(res.message || 'Deal escalated to executive leadership!');
        this.loadFlags();
      },
      error: (err) => alert('Error: ' + err.message)
    });
  }

  formatCurrency(val: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  }
}
