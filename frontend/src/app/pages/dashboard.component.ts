import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterOutlet, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AuthService, UserRole } from '../services/auth.service';

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: string;
  section: 'MAIN' | 'SALES' | 'FINANCE' | 'INTELLIGENCE' | 'ADMIN';
  roles: UserRole[];
  badge?: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule],
  template: `
    <div class="dashboard-shell">

      <!-- SIDEBAR -->
      <aside class="sidebar" [class.collapsed]="sidebarCollapsed">

        <!-- Brand Header -->
        <div class="sidebar-brand">
          <div class="brand-icon">D</div>
          <div class="brand-info" *ngIf="!sidebarCollapsed">
            <span class="brand-name">DealFlow<strong>360</strong></span>
            <span class="role-pill" [style.background]="roleColor(currentRole) + '18'" [style.color]="roleColor(currentRole)">
              {{ roleDisplayName(currentRole) }}
            </span>
          </div>
        </div>

        <!-- Navigation Groups -->
        <nav class="sidebar-nav">
          <ng-container *ngFor="let section of visibleSections">
            <div class="nav-section-header" *ngIf="!sidebarCollapsed && section.title">
              {{ section.title }}
            </div>
            <div class="nav-section-divider" *ngIf="sidebarCollapsed && section.title"></div>

            <a
              *ngFor="let item of section.items"
              class="nav-link"
              [routerLink]="item.path"
              routerLinkActive="active"
              [title]="sidebarCollapsed ? item.label : ''"
            >
              <span class="nav-icon" [innerHTML]="item.icon"></span>
              <span class="nav-label" *ngIf="!sidebarCollapsed">{{ item.label }}</span>
              <span class="nav-badge" *ngIf="!sidebarCollapsed && item.badge">{{ item.badge }}</span>
            </a>
          </ng-container>
        </nav>

        <!-- Sidebar Footer / Collapse Toggle -->
        <div class="sidebar-footer">
          <button class="sidebar-toggle" (click)="toggleSidebar()" [title]="sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'">
            <svg *ngIf="!sidebarCollapsed" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
            <svg *ngIf="sidebarCollapsed" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M9 18l6-6-6-6"/>
            </svg>
            <span class="toggle-label" *ngIf="!sidebarCollapsed">Collapse</span>
          </button>
        </div>
      </aside>

      <!-- RIGHT MAIN CONTENT -->
      <div class="dashboard-right">

        <!-- HEADER -->
        <header class="dashboard-header">
          <div class="header-left">
            <!-- Mobile hamburger toggle -->
            <button class="mobile-menu-btn" (click)="mobileSidebarOpen = !mobileSidebarOpen" aria-label="Toggle Navigation">
              <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>
            <div class="header-page-title">{{ currentPageTitle }}</div>
          </div>

          <div class="header-right">
            <!-- Role Badge -->
            <div class="header-role-badge" [style.background]="roleColor(currentRole) + '15'" [style.color]="roleColor(currentRole)">
              <span class="role-dot" [style.background]="roleColor(currentRole)"></span>
              {{ roleDisplayName(currentRole) }}
            </div>

            <!-- User info -->
            <div class="header-user">
              <div class="user-avatar-sm" [style.background]="avatarColor">
                {{ userInitials }}
              </div>
              <div class="user-meta">
                <div class="user-name-sm">{{ currentUser }}</div>
                <div class="user-team-sm">{{ userTeam }}</div>
              </div>
            </div>

            <!-- Logout -->
            <button class="logout-btn" (click)="logout()" title="Sign out of DealFlow360">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
            </button>
          </div>
        </header>

        <!-- PAGE CONTENT CONTAINER -->
        <main class="dashboard-content">
          <router-outlet></router-outlet>
        </main>
      </div>

      <!-- Mobile sidebar backdrop -->
      <div class="mobile-backdrop" *ngIf="mobileSidebarOpen" (click)="mobileSidebarOpen = false"></div>
      <aside class="sidebar mobile-sidebar" [class.open]="mobileSidebarOpen">
        <div class="sidebar-brand">
          <div class="brand-icon">D</div>
          <div class="brand-info">
            <span class="brand-name">DealFlow<strong>360</strong></span>
            <span class="role-pill" [style.background]="roleColor(currentRole) + '18'" [style.color]="roleColor(currentRole)">
              {{ roleDisplayName(currentRole) }}
            </span>
          </div>
        </div>
        <nav class="sidebar-nav">
          <ng-container *ngFor="let section of visibleSections">
            <div class="nav-section-header" *ngIf="section.title">{{ section.title }}</div>
            <a
              *ngFor="let item of section.items"
              class="nav-link"
              [routerLink]="item.path"
              routerLinkActive="active"
              (click)="mobileSidebarOpen = false"
            >
              <span class="nav-icon" [innerHTML]="item.icon"></span>
              <span class="nav-label">{{ item.label }}</span>
            </a>
          </ng-container>
        </nav>
      </aside>
    </div>
  `,
  styles: [`
    /* === Layout Shell === */
    .dashboard-shell {
      display: flex;
      height: 100vh;
      overflow: hidden;
      background: var(--bg-page, #f8fafc);
    }

    /* === SIDEBAR === */
    .sidebar {
      width: 240px;
      min-width: 240px;
      background: #ffffff;
      border-right: 1px solid var(--border-light, #e2e8f0);
      display: flex;
      flex-direction: column;
      transition: width 0.2s ease, min-width 0.2s ease;
      overflow: hidden;
      z-index: 20;
    }

    .sidebar.collapsed {
      width: 64px;
      min-width: 64px;
    }

    /* Brand Header */
    .sidebar-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 16px;
      border-bottom: 1px solid var(--border-light, #e2e8f0);
      min-height: 60px;
    }

    .brand-icon {
      width: 32px;
      height: 32px;
      min-width: 32px;
      background: var(--color-primary, #2563eb);
      color: #fff;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 15px;
    }

    .brand-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow: hidden;
    }

    .brand-name {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-primary, #0f172a);
      white-space: nowrap;
    }

    .brand-name strong {
      color: var(--color-primary, #2563eb);
      font-weight: 800;
    }

    .role-pill {
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 1px 6px;
      border-radius: 4px;
      width: fit-content;
      white-space: nowrap;
    }

    /* Nav items & Section headers */
    .sidebar-nav {
      flex: 1;
      padding: 12px 8px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow-y: auto;
      overflow-x: hidden;
    }

    .nav-section-header {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--text-muted, #94a3b8);
      padding: 10px 10px 4px;
      white-space: nowrap;
    }

    .nav-section-divider {
      height: 1px;
      background: var(--border-light, #e2e8f0);
      margin: 6px 4px;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 10px;
      border-radius: 8px;
      color: var(--text-secondary, #475569);
      text-decoration: none;
      font-size: 13.5px;
      font-weight: 500;
      transition: all 0.15s ease;
      white-space: nowrap;
      overflow: hidden;
    }

    .nav-link:hover {
      background: var(--bg-hover, #f1f5f9);
      color: var(--text-primary, #0f172a);
    }

    .nav-link.active {
      background: var(--bg-active, #eff6ff);
      color: var(--color-primary, #2563eb);
      font-weight: 600;
    }

    .nav-icon {
      width: 18px;
      min-width: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .nav-label {
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
    }

    .nav-badge {
      font-size: 10px;
      font-weight: 700;
      background: #eff6ff;
      color: #2563eb;
      border: 1px solid #bfdbfe;
      padding: 1px 6px;
      border-radius: 9999px;
    }

    /* Sidebar Footer / Collapse */
    .sidebar-footer {
      padding: 8px;
      border-top: 1px solid var(--border-light, #e2e8f0);
    }

    .sidebar-toggle {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 8px 10px;
      background: none;
      border: 1px solid transparent;
      border-radius: 8px;
      color: var(--text-muted, #64748b);
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      transition: all 0.15s;
    }

    .sidebar.collapsed .sidebar-toggle {
      justify-content: center;
      padding: 8px;
    }

    .sidebar-toggle:hover {
      background: var(--bg-hover, #f1f5f9);
      color: var(--text-primary, #0f172a);
      border-color: var(--border-light, #e2e8f0);
    }

    /* === RIGHT SIDE === */
    .dashboard-right {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      overflow: hidden;
    }

    /* === HEADER === */
    .dashboard-header {
      height: 60px;
      min-height: 60px;
      background: #ffffff;
      border-bottom: 1px solid var(--border-light, #e2e8f0);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      z-index: 10;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .mobile-menu-btn {
      display: none;
      background: none;
      border: 1px solid var(--border-light, #e2e8f0);
      border-radius: 6px;
      padding: 6px;
      color: var(--text-secondary, #475569);
      cursor: pointer;
    }

    .header-page-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-primary, #0f172a);
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .header-role-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 20px;
    }

    .role-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }

    .header-user {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .user-avatar-sm {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      flex-shrink: 0;
    }

    .user-meta {
      display: flex;
      flex-direction: column;
    }

    .user-name-sm {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary, #0f172a);
      line-height: 1.2;
    }

    .user-team-sm {
      font-size: 11px;
      color: var(--text-muted, #94a3b8);
      font-weight: 500;
    }

    .logout-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      background: none;
      border: 1px solid var(--border-light, #e2e8f0);
      border-radius: 8px;
      color: var(--text-muted, #64748b);
      cursor: pointer;
      transition: all 0.15s;
    }

    .logout-btn:hover {
      background: var(--color-danger-bg, #fef2f2);
      border-color: var(--color-danger-border, #fecaca);
      color: var(--color-danger, #dc2626);
    }

    /* === CONTENT === */
    .dashboard-content {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 0;
    }

    /* === MOBILE === */
    .mobile-backdrop {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.3);
      z-index: 30;
    }

    .mobile-sidebar {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      transform: translateX(-100%);
      transition: transform 0.25s ease;
      z-index: 40;
      box-shadow: 4px 0 16px rgba(0,0,0,0.1);
    }

    .mobile-sidebar.open {
      transform: translateX(0);
    }

    @media (max-width: 1024px) {
      .sidebar:not(.mobile-sidebar) { display: none; }
      .mobile-menu-btn { display: flex; }
      .mobile-backdrop { display: block; }
      .mobile-sidebar  { display: flex; }
    }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
  sidebarCollapsed = false;
  mobileSidebarOpen = false;
  currentRole: UserRole = 'ADMIN';
  currentUser = '';
  userTeam = '';
  userInitials = '';
  avatarColor = '#2563eb';
  private subs = new Subscription();

  /**
   * Defined strictly around DealFlow360 problem statement and 5 roles:
   * ADMIN, SALES_REP, SALES_MANAGER, FINANCE (FINANCE_OPERATIONS), CUSTOMER
   *
   * For ADMIN, sidebar contains the exact 9 modules:
   * 1. Dashboard
   * 2. Quotations
   * 3. Approvals
   * 4. Fulfillment
   * 5. Subscription
   * 6. Invoices
   * 7. Deal Health
   * 8. Reports
   * 9. Users
   */
  readonly allNav: NavItem[] = [
    // 1. Dashboard
    {
      id: 'dashboard',
      label: 'Dashboard',
      path: '/dashboard/home',
      section: 'MAIN',
      icon: `<svg width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
      roles: ['ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE']
    },
    // 2. Quotations
    {
      id: 'quotations',
      label: 'Quotations',
      path: '/dashboard/pipeline',
      section: 'SALES',
      icon: `<svg width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>`,
      roles: ['ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE']
    },
    // 3. Approvals
    {
      id: 'approvals',
      label: 'Approvals',
      path: '/dashboard/approval',
      section: 'SALES',
      icon: `<svg width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
      roles: ['ADMIN', 'SALES_MANAGER', 'FINANCE']
    },
    // 4. Fulfillment
    {
      id: 'fulfillment',
      label: 'Fulfillment',
      path: '/dashboard/fulfillment',
      section: 'SALES',
      icon: `<svg width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>`,
      roles: ['ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE']
    },
    // 5. Subscription
    {
      id: 'subscription',
      label: 'Subscription',
      path: '/dashboard/subscription',
      section: 'FINANCE',
      icon: `<svg width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>`,
      roles: ['ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE']
    },
    // 6. Invoices
    {
      id: 'invoices',
      label: 'Invoices',
      path: '/dashboard/invoices',
      section: 'FINANCE',
      icon: `<svg width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 10h18M3 14h18M7 3v18M17 3v18"/><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`,
      roles: ['ADMIN', 'FINANCE']
    },
    // 7. Deal Health
    {
      id: 'deal-health',
      label: 'Deal Health',
      path: '/dashboard/deal-health',
      section: 'INTELLIGENCE',
      icon: `<svg width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
      roles: ['ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE']
    },
    // 8. Reports
    {
      id: 'reports',
      label: 'Reports',
      path: '/dashboard/reports',
      section: 'INTELLIGENCE',
      icon: `<svg width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>`,
      roles: ['ADMIN', 'SALES_MANAGER', 'FINANCE']
    },
    // 9. Users
    {
      id: 'users',
      label: 'Users',
      path: '/dashboard/users',
      section: 'ADMIN',
      icon: `<svg width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>`,
      roles: ['ADMIN']
    }
  ];

  get visibleSections(): { title: string; items: NavItem[] }[] {
    const role = this.currentRole;
    const allowed = role === 'ADMIN'
      ? this.allNav
      : this.allNav.filter(n => n.roles.includes(role));

    // Group into structured sections
    const sections: { title: string; items: NavItem[] }[] = [];

    const main = allowed.filter(i => i.section === 'MAIN');
    if (main.length > 0) sections.push({ title: '', items: main });

    const sales = allowed.filter(i => i.section === 'SALES');
    if (sales.length > 0) sections.push({ title: 'Sales & Fulfillment', items: sales });

    const finance = allowed.filter(i => i.section === 'FINANCE');
    if (finance.length > 0) sections.push({ title: 'Billing & Finance', items: finance });

    const intel = allowed.filter(i => i.section === 'INTELLIGENCE');
    if (intel.length > 0) sections.push({ title: 'Intelligence', items: intel });

    const admin = allowed.filter(i => i.section === 'ADMIN');
    if (admin.length > 0) sections.push({ title: 'Administration', items: admin });

    return sections;
  }

  get currentPageTitle(): string {
    const url = this.router.url;
    for (const n of this.allNav) {
      if (url.includes(n.path.replace('/dashboard/', ''))) return n.label;
    }
    return 'Dashboard';
  }

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    if (!this.authService.isAuthenticated) {
      this.router.navigate(['/login']);
      return;
    }

    this.subs.add(
      this.authService.currentRole$.subscribe(role => {
        this.currentRole = role;
        if (!role || role === 'GUEST') {
          this.router.navigate(['/login']);
        } else if (role === 'CUSTOMER') {
          // Customers go directly to portal
          this.router.navigate(['/portal/CUST-TOKEN-ACME']);
        }
      })
    );

    this.subs.add(
      this.authService.currentUser$.subscribe(user => {
        if (user) {
          this.currentUser = user.name || 'User';
          this.userTeam = user.team || this.roleDisplayName(user.role);
          const parts = (user.name || '').split(' ');
          this.userInitials = ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || 'U';
          this.avatarColor = this.roleColor(user.role as UserRole);
        }
      })
    );
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  roleDisplayName(role: UserRole): string {
    switch (role) {
      case 'ADMIN':         return 'Admin';
      case 'SALES_REP':     return 'Sales Rep';
      case 'SALES_MANAGER': return 'Sales Manager';
      case 'FINANCE':       return 'Finance Operations';
      case 'CUSTOMER':      return 'Customer';
      default:              return 'User';
    }
  }

  roleColor(role: UserRole): string {
    switch (role) {
      case 'ADMIN':         return '#2563eb';
      case 'SALES_REP':     return '#16a34a';
      case 'SALES_MANAGER': return '#d97706';
      case 'FINANCE':       return '#7c3aed';
      case 'CUSTOMER':      return '#0284c7';
      default:              return '#475569';
    }
  }
}
