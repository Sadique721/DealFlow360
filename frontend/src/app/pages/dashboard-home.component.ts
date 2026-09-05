import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';

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
            {{ stat.up ? '↑' : '↓' }} {{ stat.change }} vs last month
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
          <div class="quick-icon">{{ q.icon }}</div>
          <div class="quick-label">{{ q.label }}</div>
          <div class="quick-desc">{{ q.desc }}</div>
          <div class="quick-arrow">→</div>
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
    { label: 'Total Quotations',  value: '142',    change: '12%', up: true  },
    { label: 'Pipeline Value',    value: '$4.2M',   change: '8%',  up: true  },
    { label: 'Pending Approvals', value: '18',      change: '3',   up: false },
    { label: 'Active Contracts',  value: '67',      change: '5%',  up: true  }
  ];

  quickLinks = [
    { icon: '📋', label: 'Quotations',   path: '/dashboard/pipeline',     desc: 'View and manage all quotes' },
    { icon: '✅', label: 'Approvals',    path: '/dashboard/approval',     desc: 'Review pending approval queue' },
    { icon: '🏭', label: 'Fulfillment',  path: '/dashboard/fulfillment',  desc: 'Manage warehouse splits' },
    { icon: '🔄', label: 'Subscription', path: '/dashboard/subscription', desc: 'Billing and renewals' },
    { icon: '💰', label: 'Invoices',     path: '/dashboard/invoices',     desc: 'Track and issue invoices' },
    { icon: '📊', label: 'Deal Health',  path: '/dashboard/deal-health',  desc: 'AI-powered risk radar' },
    { icon: '📈', label: 'Reports',      path: '/dashboard/reports',      desc: 'Pipeline & performance' },
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

  constructor(private authService: AuthService) {}

  ngOnInit() {
    const user = this.authService.currentUser;
    this.currentRole = (user?.role as string) || 'ADMIN';
    const nameParts = (user?.name || 'Administrator').trim().split(' ');
    this.firstName = nameParts[0] || 'User';
    this.setRoleStyle(this.currentRole);

    // Filter quick links by role
    if (this.currentRole === 'SALES_REP') {
      this.quickLinks = this.quickLinks.filter(q =>
        ['/dashboard/pipeline', '/dashboard/subscription'].includes(q.path)
      );
      this.stats[2] = { label: 'My Deals',       value: '24', change: '3', up: true };
      this.stats[3] = { label: 'Won This Month',  value: '6',  change: '2', up: true };
    }
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
