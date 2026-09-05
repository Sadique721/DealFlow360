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
            <span class="role-pill" [style.background]="roleColor(currentRole) + '22'" [style.color]="roleColor(currentRole)">
              {{ roleDisplayName(currentRole) }}
            </span>
          </div>
        </div>

        <!-- Navigation Links -->
        <nav class="sidebar-nav">
          <a
            *ngFor="let item of visibleNavItems; trackBy: trackItem"
            class="nav-link"
            [routerLink]="item.path"
            routerLinkActive="active"
            [title]="sidebarCollapsed ? item.label : ''"
          >
            <span class="nav-icon" [innerHTML]="item.icon"></span>
            <span class="nav-label" *ngIf="!sidebarCollapsed">{{ item.label }}</span>
            <span class="nav-badge" *ngIf="!sidebarCollapsed && item.badge">{{ item.badge }}</span>
          </a>
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
            <span class="role-pill" [style.background]="roleColor(currentRole) + '22'" [style.color]="roleColor(currentRole)">
              {{ roleDisplayName(currentRole) }}
            </span>
          </div>
        </div>
        <nav class="sidebar-nav">
          <a
            *ngFor="let item of visibleNavItems; trackBy: trackItem"
            class="nav-link"
            [routerLink]="item.path"
            routerLinkActive="active"
            (click)="mobileSidebarOpen = false"
          >
            <span class="nav-icon" [innerHTML]="item.icon"></span>
            <span class="nav-label">{{ item.label }}</span>
          </a>
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
      width: 250px;
      min-width: 250px;
      background: #0f172a;
      border-right: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      overflow: hidden;
      z-index: 20;
    }

    .sidebar.collapsed {
      width: 68px;
      min-width: 68px;
    }

    /* Brand Header */
    .sidebar-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 18px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      min-height: 64px;
    }

    .brand-icon {
      width: 34px;
      height: 34px;
      min-width: 34px;
      background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
      color: #fff;
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 16px;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
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
      color: #f8fafc;
      white-space: nowrap;
      letter-spacing: -0.01em;
    }

    .brand-name strong {
      color: #60a5fa;
      font-weight: 800;
    }

    .role-pill {
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 2px 7px;
      border-radius: 4px;
      width: fit-content;
      white-space: nowrap;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    /* Nav items */
    .sidebar-nav {
      flex: 1;
      padding: 12px 10px;
      display: flex;
      flex-direction: column;
      gap: 3px;
      overflow-y: auto;
      overflow-x: hidden;
    }

    .sidebar-nav::-webkit-scrollbar {
      width: 4px;
    }
    .sidebar-nav::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.12);
      border-radius: 4px;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 9.5px 12px;
      border-radius: 8px;
      color: #94a3b8;
      text-decoration: none;
      font-size: 13.5px;
      font-weight: 500;
      transition: all 0.18s ease;
      white-space: nowrap;
      overflow: hidden;
      border: 1px solid transparent;
    }

    .nav-link:hover {
      background: rgba(255, 255, 255, 0.06);
      color: #f1f5f9;
      transform: translateX(2px);
    }

    .nav-link.active {
      background: linear-gradient(90deg, rgba(37, 99, 235, 0.24) 0%, rgba(37, 99, 235, 0.08) 100%);
      color: #93c5fd;
      font-weight: 600;
      border-color: rgba(96, 165, 250, 0.25);
      border-left: 3px solid #3b82f6;
    }

    .nav-icon {
      width: 18px;
      min-width: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      opacity: 0.85;
    }

    .nav-link.active .nav-icon {
      opacity: 1;
      color: #60a5fa;
    }

    .nav-label {
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
    }

    .nav-badge {
      font-size: 10px;
      font-weight: 700;
      background: rgba(37, 99, 235, 0.25);
      color: #93c5fd;
      border: 1px solid rgba(96, 165, 250, 0.3);
      padding: 1px 6px;
      border-radius: 9999px;
    }

    /* Sidebar Footer / Collapse */
    .sidebar-footer {
      padding: 10px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(0, 0, 0, 0.15);
    }

    .sidebar-toggle {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 8px 12px;
      background: none;
      border: 1px solid transparent;
      border-radius: 8px;
      color: #64748b;
      cursor: pointer;
      font-size: 12.5px;
      font-weight: 500;
      transition: all 0.18s;
    }

    .sidebar.collapsed .sidebar-toggle {
      justify-content: center;
      padding: 8px;
    }

    .sidebar-toggle:hover {
      background: rgba(255, 255, 255, 0.06);
      color: #e2e8f0;
      border-color: rgba(255, 255, 255, 0.08);
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
      height: 64px;
      min-height: 64px;
      background: #ffffff;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 28px;
      z-index: 10;
      box-shadow: 0 1px 2px rgba(0,0,0,0.03);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .mobile-menu-btn {
      display: none;
      background: none;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 7px;
      color: #475569;
      cursor: pointer;
    }

    .header-page-title {
      font-size: 17px;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -0.01em;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .header-role-badge {
      display: flex;
      align-items: center;
      gap: 7px;
      font-size: 12px;
      font-weight: 600;
      padding: 4px 12px;
      border-radius: 20px;
    }

    .role-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
    }

    .header-user {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 4px 8px;
      border-radius: 8px;
    }

    .user-avatar-sm {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12.5px;
      font-weight: 700;
      flex-shrink: 0;
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
    }

    .user-meta {
      display: flex;
      flex-direction: column;
    }

    .user-name-sm {
      font-size: 13.5px;
      font-weight: 600;
      color: #0f172a;
      line-height: 1.2;
    }

    .user-team-sm {
      font-size: 11px;
      color: #64748b;
      font-weight: 500;
    }

    .logout-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      background: none;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      color: #64748b;
      cursor: pointer;
      transition: all 0.18s;
    }

    .logout-btn:hover {
      background: #fef2f2;
      border-color: #fecaca;
      color: #dc2626;
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
      background: rgba(0,0,0,0.45);
      backdrop-filter: blur(2px);
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
      box-shadow: 4px 0 24px rgba(0,0,0,0.25);
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
   */
  readonly allNav: NavItem[] = [
    // 1. Dashboard
    {
      id: 'dashboard',
      label: 'Dashboard',
      path: '/dashboard/home',
      icon: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>`,
      roles: ['ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE']
    },
    // 2. Quotations
    {
      id: 'quotations',
      label: 'Quotations',
      path: '/dashboard/pipeline',
      icon: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>`,
      roles: ['ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE']
    },
    // 3. Catalog & Pricing Architecture
    {
      id: 'catalog',
      label: 'Catalog & Pricing',
      path: '/dashboard/catalog',
      icon: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/><path d="M12 12v9"/></svg>`,
      roles: ['ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE']
    },
    // 4. Customers & Governance
    {
      id: 'customers',
      label: 'Customers & Governance',
      path: '/dashboard/customers',
      icon: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>`,
      roles: ['ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE']
    },
    // 5. Approvals
    {
      id: 'approvals',
      label: 'Approvals',
      path: '/dashboard/approval',
      icon: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
      roles: ['ADMIN', 'SALES_MANAGER', 'FINANCE']
    },
    // 6. Fulfillment
    {
      id: 'fulfillment',
      label: 'Fulfillment',
      path: '/dashboard/fulfillment',
      icon: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>`,
      roles: ['ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE']
    },
    // 7. Subscription
    {
      id: 'subscription',
      label: 'Subscription',
      path: '/dashboard/subscription',
      icon: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>`,
      roles: ['ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE']
    },
    // 8. Invoices
    {
      id: 'invoices',
      label: 'Invoices',
      path: '/dashboard/invoices',
      icon: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 10h18M3 14h18M7 3v18M17 3v18"/><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`,
      roles: ['ADMIN', 'FINANCE']
    },
    // 9. Deal Health
    {
      id: 'deal-health',
      label: 'Deal Health',
      path: '/dashboard/deal-health',
      icon: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
      roles: ['ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE']
    },
    // 10. Reports
    {
      id: 'reports',
      label: 'Reports',
      path: '/dashboard/reports',
      icon: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>`,
      roles: ['ADMIN', 'SALES_MANAGER', 'FINANCE']
    },
    // 11. Customer Dashboard (Customer-only nav item)
    {
      id: 'customer-portal',
      label: 'My Quotations',
      path: '/dashboard/customer',
      icon: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>`,
      roles: ['CUSTOMER']
    },
    // 12. Users (Admin Only)
    {
      id: 'users',
      label: 'Users',
      path: '/dashboard/users',
      icon: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>`,
      roles: ['ADMIN']
    }
  ];

  visibleNavItems: NavItem[] = [];

  trackItem = (_: number, item: NavItem): string => item.id;

  private updateVisibleNavItems(role: UserRole) {
    this.visibleNavItems = role === 'ADMIN'
      ? this.allNav
      : this.allNav.filter(n => n.roles.includes(role));
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
    this.currentRole = this.authService.currentRole || 'ADMIN';
    this.updateVisibleNavItems(this.currentRole);

    this.subs.add(
      this.authService.currentRole$.subscribe(role => {
        if (role && role !== 'GUEST') {
          this.currentRole = role;
          this.updateVisibleNavItems(role);
          if (role === 'CUSTOMER') {
            this.router.navigate(['/dashboard/customer']);
          }
        }
      })
    );

    this.subs.add(
      this.authService.currentUser$.subscribe(user => {
        if (user && user.id > 0) {
          this.currentUser = user.name || 'User';
          this.userTeam = user.team || this.roleDisplayName(user.role);
          const parts = (user.name || '').trim().split(' ');
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
