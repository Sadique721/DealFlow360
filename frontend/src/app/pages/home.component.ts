import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="home-page">
      <!-- Top bar -->
      <header class="home-header">
        <div class="home-logo">
          <div class="logo-mark">D</div>
          <span class="logo-text">DealFlow<strong>360</strong></span>
        </div>
        <button class="btn btn-primary" (click)="goLogin()">Sign In</button>
      </header>

      <!-- Hero section -->
      <main class="home-hero">
        <div class="hero-content">
          <div class="hero-tag">CPQ &amp; Sales Operations Platform</div>
          <h1 class="hero-title">Manage Deals,<br>Close Faster.</h1>
          <p class="hero-desc">
            DealFlow360 is a modern CPQ and sales operations platform that helps
            your team manage quotations, approvals, fulfillment, and subscriptions —
            all in one place.
          </p>
          <div class="hero-actions">
            <button class="btn btn-primary btn-lg" (click)="goLogin()">
              Get Started
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Feature cards -->
        <div class="hero-features">
          <div class="feature-card" *ngFor="let f of features">
            <div class="feature-icon">{{ f.icon }}</div>
            <div class="feature-title">{{ f.title }}</div>
            <div class="feature-desc">{{ f.desc }}</div>
          </div>
        </div>
      </main>

      <footer class="home-footer">
        <span>© 2026 DealFlow360 · All rights reserved.</span>
      </footer>
    </div>
  `,
  styles: [`
    .home-page {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: #ffffff;
    }

    /* Header */
    .home-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 48px;
      border-bottom: 1px solid #e2e8f0;
    }

    .home-logo {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .logo-mark {
      width: 34px;
      height: 34px;
      background: #2563eb;
      color: #fff;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 16px;
    }

    .logo-text {
      font-size: 18px;
      font-weight: 600;
      color: #0f172a;
    }

    .logo-text strong {
      color: #2563eb;
      font-weight: 800;
    }

    /* Hero */
    .home-hero {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 80px 48px 48px;
      gap: 64px;
    }

    .hero-content {
      text-align: center;
      max-width: 600px;
    }

    .hero-tag {
      display: inline-block;
      background: #eff6ff;
      color: #2563eb;
      border: 1px solid #bfdbfe;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 600;
      padding: 4px 14px;
      margin-bottom: 20px;
    }

    .hero-title {
      font-size: 52px;
      font-weight: 800;
      line-height: 1.1;
      color: #0f172a;
      margin-bottom: 20px;
      letter-spacing: -0.03em;
    }

    .hero-desc {
      font-size: 16px;
      color: #64748b;
      line-height: 1.7;
      margin-bottom: 32px;
    }

    .hero-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
    }

    /* Feature Cards */
    .hero-features {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      max-width: 960px;
      width: 100%;
    }

    .feature-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 24px;
      transition: box-shadow 0.15s ease, border-color 0.15s ease;
    }

    .feature-card:hover {
      border-color: #bfdbfe;
      box-shadow: 0 4px 12px rgba(37,99,235,0.08);
    }

    .feature-icon {
      font-size: 28px;
      margin-bottom: 12px;
    }

    .feature-title {
      font-size: 15px;
      font-weight: 600;
      color: #0f172a;
      margin-bottom: 6px;
    }

    .feature-desc {
      font-size: 13px;
      color: #64748b;
      line-height: 1.6;
    }

    /* Footer */
    .home-footer {
      padding: 20px 48px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
      font-size: 13px;
      color: #94a3b8;
    }

    @media (max-width: 768px) {
      .home-header { padding: 14px 20px; }
      .home-hero   { padding: 48px 20px 32px; gap: 40px; }
      .hero-title  { font-size: 36px; }
      .hero-features { grid-template-columns: 1fr; }
    }
  `]
})
export class HomeComponent {
  features = [
    {
      icon: '📋',
      title: 'Smart Quotations',
      desc: 'Build accurate CPQ quotes with multi-line items, discount tiers, and auto-approval routing.'
    },
    {
      icon: '✅',
      title: 'Approval Workflows',
      desc: 'Structured multi-level approval queues with deal risk scoring and one-click decisions.'
    },
    {
      icon: '🏭',
      title: 'Fulfillment & Warehouse',
      desc: 'Split orders across multiple warehouses with real-time inventory tracking.'
    },
    {
      icon: '🔄',
      title: 'Subscriptions & Billing',
      desc: 'Manage recurring subscriptions, proration calculations, and billing cycles effortlessly.'
    },
    {
      icon: '📊',
      title: 'Deal Health Radar',
      desc: 'AI-assisted anomaly detection to surface at-risk deals before they slip.'
    },
    {
      icon: '📈',
      title: 'Pipeline Reports',
      desc: 'Live pipeline dashboards with role-filtered views for your entire sales team.'
    }
  ];

  constructor(private router: Router) {}

  goLogin() {
    this.router.navigate(['/login']);
  }
}
