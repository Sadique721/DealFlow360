import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';

type TabMode = 'login' | 'signup';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-page">

      <!-- LEFT BRAND HERO PANEL -->
      <div class="login-left">
        <div class="login-brand">
          <div class="logo-mark">D</div>
          <span class="logo-text">DealFlow<strong>360</strong></span>
        </div>

        <div class="login-tagline">
          <h2>Enterprise CPQ & Sales Operations Platform</h2>
          <p>
            Unified workflow for quotations, automated multi-tier approval escalations, split-warehouse logistics, subscription billing, and contract governance.
          </p>
        </div>

        <div class="security-highlights">
          <div class="highlight-item">
            <div class="highlight-icon">🔒</div>
            <div>
              <div class="highlight-title">Strict Role-Based Security</div>
              <div class="highlight-desc">Access control enforced across Administrator, Sales Rep, Sales Manager, and Finance Operations.</div>
            </div>
          </div>
          <div class="highlight-item">
            <div class="highlight-icon">✉️</div>
            <div>
              <div class="highlight-title">Centralized Staff Provisioning</div>
              <div class="highlight-desc">Admin provisions internal staff accounts; credentials are automatically delivered to user email.</div>
            </div>
          </div>
          <div class="highlight-item">
            <div class="highlight-icon">🌐</div>
            <div>
              <div class="highlight-title">Dedicated Customer Portal</div>
              <div class="highlight-desc">External clients can self-register to review quotations and negotiate terms.</div>
            </div>
          </div>
        </div>
      </div>

      <!-- RIGHT AUTH FORM PANEL -->
      <div class="login-right">
        <div class="login-card">

          <!-- Auth Mode Tabs -->
          <div class="auth-tabs">
            <button class="auth-tab" [class.active]="tab==='login'" (click)="setTab('login')">Sign In</button>
            <button class="auth-tab" [class.active]="tab==='signup'" (click)="setTab('signup')">Customer Sign Up</button>
          </div>

          <!-- ─── SIGN IN ─── -->
          <ng-container *ngIf="tab==='login'">
            <div class="tab-heading">
              <h1 class="login-title">Sign In</h1>
              <p class="login-subtitle">Enter your email and password to access DealFlow360</p>
            </div>

            <!-- Error Banner -->
            <div class="alert-error" *ngIf="loginError" id="loginErrorBanner">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
              </svg>
              <span>{{ loginError }}</span>
            </div>

            <form (ngSubmit)="handleLogin()" class="auth-form">
              <div class="form-group">
                <label class="form-label" for="loginEmail">Email Address</label>
                <input
                  id="loginEmail"
                  type="email"
                  class="form-control"
                  [class.input-error]="loginError"
                  [(ngModel)]="loginEmail"
                  name="loginEmail"
                  placeholder="name@company.com"
                  autocomplete="email"
                  (ngModelChange)="clearLoginError()"
                  required
                />
              </div>

              <div class="form-group">
                <label class="form-label" for="loginPassword">Password</label>
                <div class="password-wrapper">
                  <input
                    id="loginPassword"
                    [type]="showLoginPw ? 'text' : 'password'"
                    class="form-control"
                    [class.input-error]="loginError"
                    [(ngModel)]="loginPassword"
                    name="loginPassword"
                    placeholder="Enter your password"
                    autocomplete="current-password"
                    (ngModelChange)="clearLoginError()"
                    required
                  />
                  <button type="button" class="eye-btn" (click)="showLoginPw=!showLoginPw" [attr.aria-label]="showLoginPw ? 'Hide password' : 'Show password'">
                    <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path *ngIf="!showLoginPw" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle *ngIf="!showLoginPw" cx="12" cy="12" r="3"/>
                      <path *ngIf="showLoginPw" d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                      <line *ngIf="showLoginPw" x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  </button>
                </div>
              </div>

              <button type="submit" class="btn btn-primary btn-lg btn-block" [class.btn-error-state]="loginError && !loginLoading" [disabled]="loginLoading">
                <span *ngIf="loginLoading" class="btn-spinner"></span>
                {{ loginLoading ? 'Signing in…' : loginError ? 'Try Again' : 'Sign In' }}
              </button>
            </form>

            <div class="bottom-helper">
              <p class="text-sm text-muted text-center mt-4">
                Internal staff members receive login credentials via email when provisioned by the Administrator.
              </p>
            </div>
          </ng-container>

          <!-- ─── CUSTOMER SIGN UP ─── -->
          <ng-container *ngIf="tab==='signup'">
            <div class="tab-heading">
              <h1 class="login-title">Create Customer Account</h1>
              <p class="login-subtitle">Register to review quotations and collaborate with your sales team</p>
            </div>

            <!-- Error / Success Banners -->
            <div class="alert-error" *ngIf="signupError">
              <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
              </svg>
              <span>{{ signupError }}</span>
            </div>
            <div class="alert-success" *ngIf="signupSuccess">
              <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span>{{ signupSuccess }}</span>
            </div>

            <form (ngSubmit)="handleSignup()" class="auth-form">
              <div class="form-group">
                <label class="form-label">Full Name</label>
                <input type="text" class="form-control" [(ngModel)]="signup.name" name="signupName" placeholder="e.g. Alex Mercer" required/>
              </div>

              <div class="form-group">
                <label class="form-label">Work Email</label>
                <input type="email" class="form-control" [(ngModel)]="signup.email" name="signupEmail" placeholder="e.g. buyer@company.com" required/>
              </div>

              <div class="form-group">
                <label class="form-label">Company / Organization</label>
                <input type="text" class="form-control" [(ngModel)]="signup.company" name="signupCompany" placeholder="e.g. Acme Corp" required/>
              </div>

              <div class="form-group">
                <label class="form-label">Password</label>
                <div class="password-wrapper">
                  <input
                    [type]="showSignupPw ? 'text' : 'password'"
                    class="form-control"
                    [(ngModel)]="signup.password"
                    name="signupPassword"
                    placeholder="Min 6 characters"
                    required
                  />
                  <button type="button" class="eye-btn" (click)="showSignupPw=!showSignupPw" [attr.aria-label]="showSignupPw ? 'Hide password' : 'Show password'">
                    <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path *ngIf="!showSignupPw" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle *ngIf="!showSignupPw" cx="12" cy="12" r="3"/>
                      <path *ngIf="showSignupPw" d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                      <line *ngIf="showSignupPw" x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  </button>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Confirm Password</label>
                <input
                  [type]="showSignupPw ? 'text' : 'password'"
                  class="form-control"
                  [(ngModel)]="signup.confirmPassword"
                  name="signupConfirm"
                  placeholder="Re-enter password"
                  required
                />
              </div>

              <button type="submit" class="btn btn-primary btn-lg btn-block" [disabled]="signupLoading">
                {{ signupLoading ? 'Creating account...' : 'Create Customer Account' }}
              </button>

              <p class="switch-tab">
                Already have an account?
                <button type="button" class="link-btn" (click)="setTab('login')">Sign In</button>
              </p>
            </form>
          </ng-container>

        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      min-height: 100vh;
      display: grid;
      grid-template-columns: 1.1fr 1fr;
      background: #ffffff;
      font-family: inherit;
    }

    /* ── Left Hero Panel ── */
    .login-left {
      background: #f8fafc;
      border-right: 1px solid var(--border-light, #e2e8f0);
      padding: 60px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 36px;
    }

    .login-brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .logo-mark {
      width: 40px;
      height: 40px;
      background: var(--color-primary, #2563eb);
      color: #fff;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 20px;
    }

    .logo-text {
      font-size: 22px;
      font-weight: 600;
      color: var(--text-primary, #0f172a);
    }
    .logo-text strong {
      color: var(--color-primary, #2563eb);
      font-weight: 800;
    }

    .login-tagline h2 {
      font-size: 28px;
      font-weight: 700;
      color: var(--text-primary, #0f172a);
      line-height: 1.25;
      margin-bottom: 12px;
    }
    .login-tagline p {
      font-size: 14.5px;
      color: var(--text-secondary, #475569);
      line-height: 1.65;
    }

    .security-highlights {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .highlight-item {
      display: flex;
      gap: 14px;
      align-items: flex-start;
    }

    .highlight-icon {
      font-size: 20px;
      line-height: 1.2;
    }

    .highlight-title {
      font-size: 13.5px;
      font-weight: 600;
      color: var(--text-primary, #0f172a);
      margin-bottom: 2px;
    }

    .highlight-desc {
      font-size: 12.5px;
      color: var(--text-muted, #64748b);
      line-height: 1.5;
    }

    /* ── Right Form Panel ── */
    .login-right {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 48px 36px;
      overflow-y: auto;
    }

    .login-card {
      width: 100%;
      max-width: 420px;
    }

    /* Tabs */
    .auth-tabs {
      display: flex;
      border: 1px solid var(--border-light, #e2e8f0);
      border-radius: 10px;
      background: #f8fafc;
      padding: 3px;
      gap: 3px;
      margin-bottom: 28px;
    }
    .auth-tab {
      flex: 1;
      padding: 9px;
      border: none;
      background: none;
      border-radius: 7px;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-secondary, #64748b);
      cursor: pointer;
      transition: all 0.15s;
    }
    .auth-tab.active {
      background: #ffffff;
      color: var(--text-primary, #0f172a);
      font-weight: 600;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    }

    .tab-heading {
      margin-bottom: 24px;
    }
    .login-title {
      font-size: 24px;
      font-weight: 700;
      color: var(--text-primary, #0f172a);
      margin-bottom: 6px;
    }
    .login-subtitle {
      font-size: 13.5px;
      color: var(--text-muted, #64748b);
    }

    /* Alerts */
    .alert-error, .alert-success {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 14px;
      border-radius: 8px;
      font-size: 13px;
      margin-bottom: 18px;
      line-height: 1.45;
      animation: shake 0.35s ease;
    }
    @keyframes shake {
      0%,100% { transform: translateX(0); }
      20%      { transform: translateX(-6px); }
      40%      { transform: translateX(6px); }
      60%      { transform: translateX(-4px); }
      80%      { transform: translateX(4px); }
    }
    .alert-error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #b91c1c;
    }
    .alert-success {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #15803d;
    }

    /* Input error highlight */
    .form-control.input-error {
      border-color: #fca5a5 !important;
      background: #fff5f5;
    }
    .form-control.input-error:focus {
      border-color: #ef4444 !important;
      box-shadow: 0 0 0 3px rgba(239,68,68,0.12);
    }

    /* Button spinner */
    .btn-spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255,255,255,0.4);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.65s linear infinite;
      vertical-align: middle;
      margin-right: 6px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Error state button */
    .btn-error-state {
      background: #dc2626 !important;
      border-color: #dc2626 !important;
    }
    .btn-error-state:hover {
      background: #b91c1c !important;
    }

    /* Form */
    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-label {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-secondary, #334155);
    }

    .password-wrapper {
      position: relative;
    }
    .password-wrapper .form-control {
      padding-right: 40px;
    }
    .eye-btn {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: var(--text-muted, #94a3b8);
      cursor: pointer;
      display: flex;
      align-items: center;
      padding: 4px;
    }
    .eye-btn:hover {
      color: var(--text-secondary, #475569);
    }

    .btn-block {
      width: 100%;
      margin-top: 8px;
      padding: 11px;
      font-size: 14px;
    }

    .bottom-helper {
      margin-top: 24px;
      border-top: 1px solid var(--border-light, #e2e8f0);
      padding-top: 16px;
    }

    .switch-tab {
      text-align: center;
      font-size: 13px;
      color: var(--text-muted, #64748b);
      margin-top: 16px;
    }
    .link-btn {
      background: none;
      border: none;
      color: var(--color-primary, #2563eb);
      font-weight: 600;
      cursor: pointer;
      font-size: 13px;
      padding: 0;
    }
    .link-btn:hover {
      text-decoration: underline;
    }

    @media (max-width: 860px) {
      .login-page {
        grid-template-columns: 1fr;
      }
      .login-left {
        display: none;
      }
      .login-right {
        padding: 40px 24px;
      }
    }
  `]
})
export class LoginComponent implements OnInit {
  tab: TabMode = 'login';

  // Login
  loginEmail = '';
  loginPassword = '';
  showLoginPw = false;
  loginLoading = false;
  loginError = '';

  // Signup
  signup = { name: '', email: '', company: '', password: '', confirmPassword: '' };
  showSignupPw = false;
  signupLoading = false;
  signupError = '';
  signupSuccess = '';

  returnUrl = '/dashboard/home';

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard/home';
  }

  setTab(mode: TabMode) {
    this.tab = mode;
    this.loginError = '';
    this.signupError = '';
    this.signupSuccess = '';
  }

  clearLoginError() {
    if (this.loginError) this.loginError = '';
  }

  async handleLogin() {
    this.loginError = '';
    if (!this.loginEmail.trim() || !this.loginPassword) {
      this.loginError = 'Please enter both your email address and password.';
      return;
    }

    this.loginLoading = true;
    try {
      const result = await this.authService.loginWithCredentials(this.loginEmail.trim(), this.loginPassword);
      if (!result.success) {
        this.loginLoading = false;
        this.loginError = result.error || 'Authentication failed. Please verify your credentials.';
        return;
      }
      await this.redirectAfterLogin();
    } catch {
      this.loginLoading = false;
      this.loginError = 'Unable to connect to authentication service. Please check server status.';
    } finally {
      this.loginLoading = false;
    }
  }

  async handleSignup() {
    this.signupError = '';
    this.signupSuccess = '';
    const { name, email, company, password, confirmPassword } = this.signup;

    if (!name.trim() || !email.trim() || !company.trim()) {
      this.signupError = 'Name, email and company are required.';
      return;
    }
    if (!password || password.length < 6) {
      this.signupError = 'Password must be at least 6 characters.';
      return;
    }
    if (password !== confirmPassword) {
      this.signupError = 'Passwords do not match.';
      return;
    }

    this.signupLoading = true;
    try {
      const result = await this.authService.customerSignup(name.trim(), email.trim(), company.trim(), password);
      this.signupLoading = false;
      if (!result.success) {
        this.signupError = result.error || 'Registration failed. Email may already be in use.';
        return;
      }
      this.signupSuccess = 'Customer account registered successfully! Redirecting to your dashboard...';
      setTimeout(() => this.router.navigate(['/dashboard/customer']), 1000);
    } catch {
      this.signupLoading = false;
      this.signupError = 'Registration failed. Please try again.';
    } finally {
      this.signupLoading = false;
    }
  }

  private async redirectAfterLogin() {
    const role = this.authService.currentRole;
    if (role === 'CUSTOMER') {
      await this.router.navigate(['/dashboard/customer']);
    } else {
      const target = (this.returnUrl && !this.returnUrl.includes('/login') && !this.returnUrl.includes('/unauthorized'))
        ? this.returnUrl
        : '/dashboard/home';
      await this.router.navigateByUrl(target);
    }
  }
}
