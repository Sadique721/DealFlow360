import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="unauth-page">
      <div class="unauth-card">
        <div class="icon-circle">
          <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>

        <div class="status-tag">HTTP 403 Forbidden</div>

        <h1 class="title">Access Restricted</h1>

        <p class="desc">
          Your current role (<strong class="role-highlight">{{ currentRole }}</strong>) is not authorized
          to access this module. In DealFlow360, access to operations, financial approvals, and system
          configuration is strictly governed by your assigned role.
        </p>

        <div class="details-box" *ngIf="deniedPath">
          <div class="detail-row">
            <span class="label">Attempted Module:</span>
            <code class="val">{{ deniedPath }}</code>
          </div>
          <div class="detail-row">
            <span class="label">Logged in as:</span>
            <span class="val">{{ userName }} ({{ currentRole }})</span>
          </div>
        </div>

        <div class="actions">
          <button class="btn btn-primary" (click)="goToDashboard()">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            Return to Dashboard
          </button>

          <button class="btn btn-secondary" (click)="switchAccount()">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            Sign in as Different User
          </button>
        </div>

        <div class="footer-note">
          Need access to this module? Contact your DealFlow360 System Administrator to request role permission adjustment.
        </div>
      </div>
    </div>
  `,
  styles: [`
    .unauth-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-page, #f8fafc);
      padding: 24px;
      font-family: inherit;
    }
    .unauth-card {
      background: #ffffff;
      border: 1px solid var(--border-light, #e2e8f0);
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
      max-width: 520px;
      width: 100%;
      padding: 40px 36px;
      text-align: center;
    }
    .icon-circle {
      width: 72px;
      height: 72px;
      background: #fee2e2;
      border: 2px solid #fecaca;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
      color: #dc2626;
    }
    .status-tag {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #b91c1c;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 20px;
      padding: 3px 12px;
      margin-bottom: 12px;
    }
    .title {
      font-size: 24px;
      font-weight: 700;
      color: var(--text-primary, #0f172a);
      margin: 0 0 12px;
    }
    .desc {
      font-size: 14px;
      line-height: 1.6;
      color: var(--text-secondary, #475569);
      margin: 0 0 20px;
    }
    .role-highlight {
      color: #dc2626;
      font-weight: 600;
    }
    .details-box {
      background: var(--bg-hover, #f1f5f9);
      border: 1px solid var(--border-light, #e2e8f0);
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 24px;
      text-align: left;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      padding: 4px 0;
    }
    .detail-row:not(:last-child) {
      border-bottom: 1px solid #e2e8f0;
    }
    .detail-row .label {
      color: var(--text-muted, #64748b);
      font-weight: 500;
    }
    .detail-row .val {
      color: var(--text-primary, #0f172a);
      font-weight: 600;
    }
    code.val {
      background: #e2e8f0;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 11px;
    }
    .actions {
      display: flex;
      gap: 12px;
      justify-content: center;
      margin-bottom: 20px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.15s ease;
    }
    .btn-primary {
      background: var(--color-primary, #2563eb);
      color: #ffffff;
    }
    .btn-primary:hover {
      background: var(--color-primary-hover, #1d4ed8);
    }
    .btn-secondary {
      background: #ffffff;
      border-color: var(--border-light, #e2e8f0);
      color: var(--text-secondary, #475569);
    }
    .btn-secondary:hover {
      background: var(--bg-hover, #f1f5f9);
    }
    .footer-note {
      font-size: 11px;
      color: var(--text-muted, #94a3b8);
      line-height: 1.5;
    }
  `]
})
export class UnauthorizedComponent implements OnInit {
  currentRole = 'GUEST';
  userName = 'User';
  deniedPath = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.currentRole = this.authService.currentRole;
    this.userName = this.authService.currentUser.name || 'User';
    this.deniedPath = this.route.snapshot.queryParams['deniedPath'] || '';
  }

  goToDashboard(): void {
    if (this.currentRole === 'CUSTOMER') {
      this.router.navigate(['/portal/magic-token-acme-1042-demo']);
    } else {
      this.router.navigate(['/dashboard/home']);
    }
  }

  switchAccount(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
