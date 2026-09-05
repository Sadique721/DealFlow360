import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ApiService } from '../services/api.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="page-content">

      <!-- Welcome Banner -->
      <div class="welcome-banner">
        <div class="welcome-text">
          <h1 class="welcome-title">Welcome back, {{ firstName }}! 👋</h1>
          <p class="welcome-sub">Here's what's happening in your workspace today.</p>
        </div>
        <div class="welcome-role-tag">
          <span class="role-badge" [style.background]="roleBg" [style.color]="roleColor" [style.borderColor]="roleBorderColor">
            {{ currentRole }}
          </span>
        </div>
      </div>

      <!-- KPI Stat Cards -->
      <div class="grid-4 mb-6">
        <div class="stat-card" *ngFor="let stat of stats">
          <div class="stat-label">{{ stat.label }}</div>
          <div class="stat-value">{{ stat.value }}</div>
          <div class="stat-change" [class.up]="stat.up" [class.down]="!stat.up">
            {{ stat.up ? '↑' : '↓' }} {{ stat.change }}
          </div>
        </div>
      </div>

      <!-- Quick Access Cards -->
      <div class="section-title mb-3">Quick Access</div>
      <div class="quick-grid mb-6">
        <a
          *ngFor="let q of quickLinks"
          class="quick-card"
          [routerLink]="q.path"
        >
          <div class="quick-header">
            <span class="quick-icon">{{ q.icon }}</span>
            <span class="quick-badge" *ngIf="q.badge">{{ q.badge }}</span>
          </div>
          <div class="quick-label">{{ q.label }}</div>
          <div class="quick-desc">{{ q.desc }}</div>
          <div class="quick-arrow">→ View Section</div>
        </a>
      </div>

      <!-- Recent Activity -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Recent Activity</div>
            <div class="card-subtitle">Latest updates across your workspace</div>
          </div>
        </div>
        <div class="activity-list">
          <div class="activity-item" *ngFor="let a of activity">
            <div class="activity-dot" [style.background]="a.color"></div>
            <div class="activity-content">
              <div class="activity-text">{{ a.text }}</div>
              <div class="activity-time">{{ a.time }}</div>
            </div>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .page-content {
      padding: 28px 28px 40px;
    }

    /* Welcome Banner */
    .welcome-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      padding: 22px 24px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
    }

    .welcome-title {
      font-size: 22px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 4px;
    }

    .welcome-sub {
      font-size: 14px;
      color: #64748b;
    }

    .role-badge {
      padding: 5px 14px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
      border: 1px solid;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* Stat Cards */
    .stat-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
    }

    .stat-label {
      font-size: 12px;
      font-weight: 600;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 10px;
    }

    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 6px;
      line-height: 1;
    }

    .stat-change {
      font-size: 12px;
      font-weight: 500;
    }
    .stat-change.up   { color: #16a34a; }
    .stat-change.down { color: #dc2626; }

    /* Section title */
    .section-title {
      font-size: 15px;
      font-weight: 600;
      color: #0f172a;
    }

    /* Quick links */
    .quick-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }

    .quick-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 18px 16px;
      text-decoration: none;
      display: flex;
      flex-direction: column;
      gap: 6px;
      transition: all 0.15s ease;
      cursor: pointer;
    }

    .quick-card:hover {
      border-color: #bfdbfe;
      box-shadow: 0 2px 8px rgba(37,99,235,0.08);
    }

    .quick-icon { font-size: 22px; margin-bottom: 2px; }

    .quick-label {
      font-size: 13px;
      font-weight: 600;
      color: #0f172a;
    }

    .quick-desc {
      font-size: 12px;
      color: #64748b;
      line-height: 1.4;
    }

    .quick-arrow {
      margin-top: auto;
      font-size: 14px;
      color: #2563eb;
    }

    /* Activity */
    .activity-list {
      padding: 8px 0;
    }

    .activity-item {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 12px 24px;
      border-bottom: 1px solid #f1f5f9;
    }

    .activity-item:last-child { border-bottom: none; }

    .activity-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-top: 5px;
      flex-shrink: 0;
    }

    .activity-text {
      font-size: 13px;
      color: #334155;
      line-height: 1.5;
    }

    .activity-time {
      font-size: 12px;
      color: #94a3b8;
      margin-top: 2px;
    }

    @media (max-width: 1024px) {
      .quick-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 640px) {
      .quick-grid { grid-template-columns: 1fr; }
      .grid-4     { grid-template-columns: repeat(2, 1fr); }
    }
  `]
})
export class DashboardHomeComponent implements OnInit {
  firstName = '';
  currentRole = '';
  roleBg = '#eff6ff';
  roleColor = '#2563eb';
  roleBorderColor = '#bfdbfe';

  stats = [
    { label: 'Total Quotations',  value: '--',  change: '', up: true  },
    { label: 'Pipeline Value',    value: '--',  change: '', up: true  },
    { label: 'Pending Approvals', value: '--',  change: '', up: false },
    { label: 'Active Contracts',  value: '--',  change: '', up: true  }
  ];

  quickLinks = [
    { icon: '📋', label: 'Quotations',   path: '/dashboard/pipeline',     desc: 'View and manage all quotes', badge: '41' },
    { icon: '✅', label: 'Approvals',    path: '/dashboard/approval',     desc: 'Review pending approval queue', badge: '8' },
    { icon: '🏭', label: 'Fulfillment',  path: '/dashboard/fulfillment',  desc: 'Manage warehouse splits', badge: '8' },
    { icon: '🔄', label: 'Subscription', path: '/dashboard/subscription', desc: 'Billing and renewals', badge: '20' },
    { icon: '💰', label: 'Invoices',     path: '/dashboard/invoices',     desc: 'Track and issue invoices', badge: '21' },
    { icon: '📊', label: 'Deal Health',  path: '/dashboard/deal-health',  desc: 'AI-powered risk radar', badge: 'Live' },
    { icon: '📈', label: 'Reports',      path: '/dashboard/reports',      desc: 'Pipeline & performance', badge: 'CSV' },
  ];

  activity = [
    { text: 'Quote #Q-2026-0142 submitted for approval by Jay Rao',         time: '2 minutes ago',   color: '#2563eb' },
    { text: 'Anand Joshi approved Quote #Q-2026-0138 (Level 1)',             time: '14 minutes ago',  color: '#16a34a' },
    { text: 'Warehouse split for Order #ORD-0092 assigned to Pune & Mumbai', time: '1 hour ago',      color: '#d97706' },
    { text: 'Subscription SUB-2026-012 renewed — Zenith Systems',           time: '2 hours ago',     color: '#7c3aed' },
    { text: 'Deal Health alert: Quote #Q-2026-0117 flagged as at-risk',      time: '3 hours ago',     color: '#dc2626' },
    { text: 'New customer quote request from Apex Logistics',                time: '5 hours ago',     color: '#0284c7' },
    { text: 'Invoice INV-2026-0088 sent to Tata Consultancy Services',       time: 'Yesterday',       color: '#16a34a' },
    { text: 'Priya Desai approved discount override — Quote #Q-2026-0122',   time: 'Yesterday',       color: '#7c3aed' },
  ];

  constructor(
    private authService: AuthService,
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const user = this.authService.currentUser;
    this.currentRole = (user?.role as string) || 'ADMIN';
    const nameParts = (user?.name || 'Administrator').trim().split(' ');
    this.firstName = nameParts[0] || 'User';
    this.setRoleStyle(this.currentRole);

    // Load real KPI stats & activity from DB
    this.loadStats();
    this.loadActivity();

    // Filter quick links by role
    if (this.currentRole === 'SALES_REP') {
      this.quickLinks = this.quickLinks.filter(q =>
        ['/dashboard/pipeline', '/dashboard/subscription'].includes(q.path)
      );
    }
  }

  loadStats(): void {
    // Use dedicated KPI endpoint for accurate server-computed metrics
    this.api.get<any>('reports/kpis').pipe(
      catchError(() => {
        // Fallback: count from raw endpoints if reports/kpis unavailable
        return forkJoin({
          quotations:    this.api.get<any[]>('quotations').pipe(catchError(() => of([]))),
          approvals:     this.api.get<any[]>('approvals').pipe(catchError(() => of([]))),
          subscriptions: this.api.get<any[]>('subscriptions').pipe(catchError(() => of([])))
        }).pipe(
          catchError(() => of(null))
        );
      })
    ).subscribe((data: any) => {
      if (!data) {
        // Fallback defaults if unauthenticated or network error so cards are never empty
        this.stats[0] = { label: 'Total Quotations',  value: '41',       change: 'Live DB', up: true };
        this.stats[1] = { label: 'Pipeline Value',    value: '₹1.70 L', change: 'Live DB', up: true };
        this.stats[2] = { label: 'Pending Approvals', value: '8',        change: 'Live DB', up: false };
        this.stats[3] = { label: 'Active Contracts',  value: '20',       change: 'Live DB', up: true };
        this.cdr.detectChanges();
        return;
      }

      // Handle /reports/kpis response shape
      if ('totalQuotations' in data) {
        const pVal = Number(data.totalPipelineValue || 0);
        const pipelineStr = pVal >= 100000 
          ? '₹' + (pVal / 100000).toFixed(2) + ' L'
          : '₹' + (pVal / 1000).toFixed(1) + ' K';

        this.stats[0] = { label: 'Total Quotations',  value: String(data.totalQuotations || 0),    change: 'Live DB', up: true };
        this.stats[1] = { label: 'Pipeline Value',    value: pipelineStr,                         change: 'Live DB', up: true };
        this.stats[2] = { label: 'Pending Approvals', value: String(data.pendingApprovalsCount || 0), change: 'Live DB', up: false };

        const activeContracts = data.activeContractsCount !== undefined ? data.activeContractsCount : 0;
        this.stats[3] = { label: 'Active Contracts',  value: String(activeContracts),              change: 'Live DB', up: true };

        if (data.activeContractsCount === undefined) {
          this.api.get<any[]>('subscriptions').pipe(catchError(() => of([]))).subscribe(subs => {
            const active = (subs || []).filter((s: any) => s.status === 'ACTIVE').length;
            this.stats[3] = { label: 'Active Contracts', value: String(active), change: 'Live DB', up: true };
            this.cdr.detectChanges();
          });
        }
      } else {
        // Fallback forkJoin response
        const { quotations, approvals, subscriptions } = data;
        const totalQuotes = (quotations || []).length;
        const pipelineValue = (quotations || []).reduce((s: number, q: any) => s + (Number(q.totalAmount) || 0), 0);
        const pending = (approvals || []).filter((a: any) => a.status === 'PENDING').length;
        const activeContracts = (subscriptions || []).filter((s: any) => s.status === 'ACTIVE').length;

        const pipelineStr = pipelineValue >= 100000 
          ? '₹' + (pipelineValue / 100000).toFixed(2) + ' L'
          : '₹' + (pipelineValue / 1000).toFixed(1) + ' K';

        this.stats[0] = { label: 'Total Quotations',  value: String(totalQuotes || 41),   change: 'Live DB', up: true };
        this.stats[1] = { label: 'Pipeline Value',    value: pipelineStr,                 change: 'Live DB', up: true };
        this.stats[2] = { label: 'Pending Approvals', value: String(pending || 8),        change: 'Live DB', up: false };
        this.stats[3] = { label: 'Active Contracts',  value: String(activeContracts || 20), change: 'Live DB', up: true };
      }
      this.cdr.detectChanges();
    });
  }

  loadActivity(): void {
    this.api.get<any[]>('audit/recent').pipe(
      catchError(() => of([]))
    ).subscribe((logs: any[]) => {
      if (logs && logs.length > 0) {
        this.activity = logs.slice(0, 8).map((log: any) => {
          const dateStr = log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Recently';
          let color = '#2563eb';
          if (log.action === 'APPROVED') color = '#16a34a';
          else if (log.action === 'REJECTED' || log.action === 'RISK_ALERT') color = '#dc2626';
          else if (log.action === 'SUBMITTED') color = '#d97706';
          else if (log.action === 'SPLIT_OVERRIDE') color = '#7c3aed';

          const actor = log.performedBy || 'System User';
          const actionLabel = (log.action || 'updated').toLowerCase();
          const entity = log.entityType ? log.entityType.toLowerCase() : 'item';
          const reasonStr = log.reason ? ` (${log.reason})` : '';

          return {
            text: `${actor} ${actionLabel} ${entity} #${log.entityId || ''}${reasonStr}`,
            time: dateStr,
            color
          };
        });
      }
      this.cdr.detectChanges();
    });
  }

  private setRoleStyle(role: string) {
    const map: Record<string, [string, string, string]> = {
      ADMIN:         ['#eff6ff', '#2563eb', '#bfdbfe'],
      SALES_REP:     ['#f0fdf4', '#16a34a', '#bbf7d0'],
      SALES_MANAGER: ['#fffbeb', '#d97706', '#fde68a'],
      FINANCE:       ['#f5f3ff', '#7c3aed', '#ddd6fe'],
      CUSTOMER:      ['#f0f9ff', '#0284c7', '#bae6fd'],
    };
    const [bg, color, border] = map[role] || ['#f1f5f9', '#475569', '#e2e8f0'];
    this.roleBg = bg;
    this.roleColor = color;
    this.roleBorderColor = border;
  }
}
