import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AuthService, ManagedUser, UserRole, CreateUserResponse } from '../services/auth.service';

interface StaffUserForm {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  team: string;
  autoGeneratePassword: boolean;
}

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-content">

      <!-- Page Header -->
      <div class="header-banner flex items-center justify-between mb-6">
        <div>
          <div class="header-eyebrow">ADMINISTRATION & RBAC</div>
          <h1 class="text-xl font-bold text-primary">User & Staff Management</h1>
          <p class="text-sm text-muted mt-1">
            Provision staff accounts (Sales Rep, Sales Manager, Finance Operations) and manage access credentials
          </p>
        </div>
        <button class="btn btn-primary" (click)="openCreate()">
          <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Create Staff User
        </button>
      </div>

      <!-- Summary stats -->
      <div class="grid-4 mb-6">
        <div class="stat-card" *ngFor="let s of summaryStatsList; trackBy: trackStat">
          <div class="stat-icon" [style.background]="s.bg" [style.color]="s.color">{{ s.icon }}</div>
          <div class="stat-value" style="font-size:22px;margin:8px 0 4px">{{ s.value }}</div>
          <div class="stat-label">{{ s.label }}</div>
        </div>
      </div>

      <!-- Filter bar & User Table -->
      <div class="card mb-4">
        <div class="table-toolbar">
          <div class="search-input-wrapper">
            <svg class="search-icon" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input class="search-input" placeholder="Search by name or email..." [(ngModel)]="search" (ngModelChange)="applyFilter()"/>
          </div>
          <select class="form-control" style="width:auto" [(ngModel)]="roleFilter" (ngModelChange)="applyFilter()">
            <option value="">All Roles</option>
            <option value="SALES_REP">Sales Rep</option>
            <option value="SALES_MANAGER">Sales Manager</option>
            <option value="FINANCE">Finance Operations</option>
            <option value="CUSTOMER">Customer</option>
            <option value="ADMIN">Admin</option>
          </select>
          <select class="form-control" style="width:auto" [(ngModel)]="statusFilter" (ngModelChange)="applyFilter()">
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <button class="btn btn-secondary btn-sm" (click)="refreshUsers()" [disabled]="loading">
            <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
            Refresh
          </button>
        </div>

        <div class="table-container" style="border:none;border-radius:0">
          <table class="table-custom">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role & Permissions</th>
                <th>Team / Department</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let u of pagedUsers; let i = index; trackBy: trackUser">
                <td class="text-muted text-sm">{{ (page - 1) * perPage + i + 1 }}</td>
                <td>
                  <div class="user-cell">
                    <div class="user-avatar-cell" [style.background]="roleColor(u.role)">
                      {{ initials(u.name) }}
                    </div>
                    <div>
                      <div class="font-semibold text-sm">{{ u.name }}</div>
                      <div class="text-xs text-muted" *ngIf="u.id === currentUserId">(Current User)</div>
                    </div>
                  </div>
                </td>
                <td class="text-sm font-mono">{{ u.email }}</td>
                <td>
                  <span class="badge" [ngClass]="roleBadge(u.role)">{{ roleLabel(u.role) }}</span>
                </td>
                <td class="text-sm text-secondary">{{ u.team || '—' }}</td>
                <td>
                  <span class="badge" [class.badge-success]="u.active" [class.badge-neutral]="!u.active">
                    {{ u.active ? 'ACTIVE' : 'INACTIVE' }}
                  </span>
                </td>
                <td>
                  <div class="action-btns">
                    <button class="btn-action edit" (click)="openEdit(u)" title="Edit user">
                      <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button class="btn-action reset" (click)="resetPassword(u)" title="Reset & Send New Password">
                      <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0110 0v4"/>
                      </svg>
                    </button>
                    <button class="btn-action" [class.deactivate]="u.active" [class.activate]="!u.active"
                      (click)="toggleStatus(u)" [disabled]="u.id === currentUserId"
                      [title]="u.active ? 'Deactivate User' : 'Activate User'">
                      <svg *ngIf="u.active" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10"/><path d="M10 15l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"/>
                      </svg>
                      <svg *ngIf="!u.active" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="filtered.length === 0">
                <td colspan="7" style="text-align:center;padding:32px;color:#94a3b8">
                  {{ loading ? 'Loading users...' : 'No users found.' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination" *ngIf="filtered.length > 0">
          <span class="pagination-info">
            Showing {{ minVal((page-1)*perPage+1, filtered.length) }}–{{ minVal(page*perPage, filtered.length) }} of {{ filtered.length }} users
          </span>
          <button class="page-btn" [disabled]="page===1" (click)="setPage(page-1)">‹</button>
          <button class="page-btn" *ngFor="let p of pageNumbers; trackBy: trackPage" [class.active]="p===page" (click)="setPage(p)">{{ p }}</button>
          <button class="page-btn" [disabled]="page===totalPages" (click)="setPage(page+1)">›</button>
        </div>
      </div>

      <!-- Instruction note -->
      <div class="rbac-notice">
        <div class="notice-icon">💡</div>
        <div class="notice-body">
          <div class="notice-title">DealFlow360 Staff Onboarding & Security Architecture</div>
          <div class="notice-text">
            Staff members created here are stored securely in the PostgreSQL database with BCrypt hashed passwords.
            A login credential notification is automatically dispatched to the recipient's email address.
            When staff members log in at <code>/login</code>, their role dynamically determines their sidebar modules and backend capabilities.
          </div>
        </div>
      </div>
    </div>

    <!-- ─── Create / Edit Staff Modal ─── -->
    <div class="modal-backdrop" *ngIf="modalOpen" (click)="closeModal()">
      <div class="modal-dialog" (click)="$event.stopPropagation()">

        <!-- Modal header -->
        <div class="modal-header">
          <div>
            <h2 class="modal-title">{{ editMode ? 'Edit User Details' : 'Provision New Staff Member' }}</h2>
            <p class="modal-sub">
              {{ editMode ? 'Update role or department affiliation' : 'Create an internal staff account with role-based access' }}
            </p>
          </div>
          <button class="modal-close" (click)="closeModal()">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Error Banner -->
        <div class="form-error-banner" *ngIf="formError">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
          </svg>
          {{ formError }}
        </div>

        <!-- Form Body -->
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label required">Full Name</label>
              <input class="form-control" [(ngModel)]="form.name" placeholder="e.g. Vikram Verma"/>
            </div>
            <div class="form-group">
              <label class="form-label required">Email Address</label>
              <input class="form-control" type="email" [(ngModel)]="form.email" placeholder="e.g. v.verma@dealflow360.com" [disabled]="editMode"/>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label required">Role & Permissions</label>
              <select class="form-control" [(ngModel)]="form.role" (ngModelChange)="onRoleChange($event)">
                <option value="SALES_REP">Sales Representative (Quotes, Customers, Health)</option>
                <option value="SALES_MANAGER">Sales Manager / Approver (Approvals L1, Analytics, Health)</option>
                <option value="FINANCE">Finance Operations (Approvals L2, Invoices, Warehouses)</option>
                <option value="CUSTOMER">Customer (Portal Only)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Team / Department</label>
              <input class="form-control" [(ngModel)]="form.team" placeholder="e.g. North America Enterprise"/>
            </div>
          </div>

          <div class="password-section" *ngIf="!editMode">
            <div class="checkbox-row mb-2">
              <label class="checkbox-label">
                <input type="checkbox" [(ngModel)]="form.autoGeneratePassword"/>
                <span>Auto-generate secure temporary password & send via email</span>
              </label>
            </div>

            <div class="form-group" *ngIf="!form.autoGeneratePassword">
              <label class="form-label required">Initial Password</label>
              <div class="password-wrapper">
                <input [type]="showPw ? 'text' : 'password'" class="form-control" [(ngModel)]="form.password" placeholder="Min 6 characters"/>
                <button type="button" class="eye-btn" (click)="showPw=!showPw">
                  <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path *ngIf="!showPw" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle *ngIf="!showPw" cx="12" cy="12" r="3"/>
                    <path *ngIf="showPw" d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line *ngIf="showPw" x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Role Access Matrix Preview -->
          <div class="role-preview-box">
            <div class="role-preview-title">Accessible Modules for {{ roleLabel(form.role) }}:</div>
            <div class="role-preview-list">
              <span class="access-item" *ngFor="let a of currentRoleAccess; trackBy: trackAccess" [class.yes]="a.has" [class.no]="!a.has">
                {{ a.has ? '✓' : '✕' }} {{ a.label }}
              </span>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="closeModal()" [disabled]="submitting">Cancel</button>
          <button class="btn btn-primary" (click)="submitForm()" [disabled]="submitting">
            {{ submitting ? 'Saving...' : (editMode ? 'Save Changes' : 'Provision Staff Account') }}
          </button>
        </div>
      </div>
    </div>

    <!-- ─── Credentials Dispatched Modal ─── -->
    <div class="modal-backdrop" *ngIf="credentialsModalOpen" (click)="credentialsModalOpen = false">
      <div class="modal-dialog credentials-dialog" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div class="flex items-center gap-3">
            <div class="success-icon-badge">✓</div>
            <div>
              <h2 class="modal-title">Staff Account Provisioned!</h2>
              <p class="modal-sub">Login credentials generated and dispatched to staff email</p>
            </div>
          </div>
          <button class="modal-close" (click)="credentialsModalOpen = false">✕</button>
        </div>

        <div class="modal-body">
          <div class="email-dispatch-banner">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            <div>
              <strong>Email Dispatched:</strong> A welcome email containing initial login instructions and access credentials has been queued for delivery to
              <span class="font-mono text-primary font-bold">{{ createdUserCreds?.email }}</span>.
            </div>
          </div>

          <div class="cred-card">
            <div class="cred-row">
              <span class="cred-label">Staff Name:</span>
              <span class="cred-value">{{ createdUserCreds?.name }}</span>
            </div>
            <div class="cred-row">
              <span class="cred-label">Email / Login ID:</span>
              <span class="cred-value font-mono">{{ createdUserCreds?.email }}</span>
            </div>
            <div class="cred-row">
              <span class="cred-label">Assigned Role:</span>
              <span class="badge badge-primary">{{ roleLabel(createdUserCreds?.role || '') }}</span>
            </div>
            <div class="cred-row password-row">
              <span class="cred-label">Temporary Password:</span>
              <div class="flex items-center gap-2">
                <code class="temp-pw-box">{{ createdUserCreds?.tempPassword }}</code>
                <button class="btn btn-secondary btn-sm copy-btn" (click)="copyPassword(createdUserCreds?.tempPassword || '')">
                  {{ copied ? 'Copied!' : 'Copy' }}
                </button>
              </div>
            </div>
          </div>

          <div class="text-xs text-muted mt-2">
            Please share or note this password now. For security reasons, the raw temporary password will not be shown again in the admin console.
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-primary" (click)="credentialsModalOpen = false">Done</button>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <div class="um-toast" *ngIf="toast" [class.success]="toastType==='success'" [class.error]="toastType==='error'">
      {{ toast }}
    </div>
  `,
  styles: [`
    .page-content { padding: 28px; }

    .header-eyebrow {
      font-size: 11px;
      font-weight: 700;
      color: var(--color-primary, #2563eb);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 2px;
    }

    /* Stat cards */
    .stat-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 18px;
    }
    .stat-icon {
      width: 36px; height: 36px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px;
    }
    .stat-value { font-size: 22px; font-weight: 700; color: #0f172a; }
    .stat-label { font-size: 12px; color: #94a3b8; font-weight: 500; text-transform: uppercase; letter-spacing: .04em; }

    /* User cell */
    .user-cell { display: flex; align-items: center; gap: 10px; }
    .user-avatar-cell {
      width: 32px; height: 32px; border-radius: 50%;
      color: #fff; display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 700; flex-shrink: 0;
    }

    /* Action buttons */
    .action-btns { display: flex; gap: 4px; }
    .btn-action {
      width: 28px; height: 28px; border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      border: 1px solid #e2e8f0; background: #fff;
      cursor: pointer; transition: all .15s;
    }
    .btn-action.edit:hover        { background: #eff6ff; border-color: #bfdbfe; color: #2563eb; }
    .btn-action.reset:hover       { background: #f5f3ff; border-color: #ddd6fe; color: #7c3aed; }
    .btn-action.deactivate:hover  { background: #fffbeb; border-color: #fde68a; color: #d97706; }
    .btn-action.activate:hover    { background: #f0fdf4; border-color: #bbf7d0; color: #16a34a; }
    .btn-action:disabled          { opacity: .4; cursor: not-allowed; }

    /* Notice box */
    .rbac-notice {
      display: flex;
      gap: 14px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 10px;
      padding: 16px;
      margin-top: 16px;
    }
    .notice-icon { font-size: 20px; }
    .notice-title { font-size: 13px; font-weight: 700; color: #1e40af; margin-bottom: 4px; }
    .notice-text  { font-size: 12px; color: #3b82f6; line-height: 1.5; }
    .notice-text code { background: #dbeafe; padding: 1px 5px; border-radius: 4px; font-family: monospace; }

    /* ─── Modal ─── */
    .modal-backdrop {
      position: fixed; inset: 0;
      background: rgba(15,23,42,.4);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000;
      animation: fadeIn .15s ease;
    }
    @keyframes fadeIn { from{opacity:0} to{opacity:1} }

    .modal-dialog {
      background: #fff; border-radius: 14px;
      box-shadow: 0 20px 50px rgba(0,0,0,.15);
      width: 100%; max-width: 580px;
      margin: 16px;
      animation: slideUp .2s ease;
    }
    @keyframes slideUp { from{transform:translateY(12px);opacity:0} to{transform:translateY(0);opacity:1} }

    .modal-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      padding: 22px 24px 18px;
      border-bottom: 1px solid #e2e8f0;
    }
    .modal-title  { font-size: 17px; font-weight: 700; color: #0f172a; }
    .modal-sub    { font-size: 13px; color: #64748b; margin-top: 2px; }
    .modal-close  { background: none; border: none; color: #94a3b8; cursor: pointer; padding: 2px; font-size: 16px; }
    .modal-close:hover { color: #0f172a; }

    .form-error-banner {
      display: flex; align-items: center; gap: 8px;
      margin: 12px 24px 0;
      padding: 10px 14px;
      background: #fef2f2; border: 1px solid #fecaca;
      border-radius: 8px; color: #b91c1c; font-size: 13px;
    }

    .modal-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 8px; }

    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media (max-width: 540px) { .form-row { grid-template-columns: 1fr; } }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #334155;
      cursor: pointer;
    }

    .password-wrapper { position: relative; }
    .password-wrapper .form-control { padding-right: 36px; }
    .eye-btn {
      position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
      background: none; border: none; color: #94a3b8; cursor: pointer;
    }

    /* Role access preview */
    .role-preview-box {
      background: #f8fafc; border: 1px solid #e2e8f0;
      border-radius: 8px; padding: 12px 14px; margin-top: 4px;
    }
    .role-preview-title { font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 8px; text-transform: uppercase; letter-spacing: .04em; }
    .role-preview-list  { display: flex; flex-wrap: wrap; gap: 6px; }
    .access-item {
      font-size: 11px; padding: 2px 8px; border-radius: 9999px; font-weight: 500; border: 1px solid;
    }
    .access-item.yes { background: #f0fdf4; color: #16a34a; border-color: #bbf7d0; }
    .access-item.no  { background: #f8fafc; color: #94a3b8; border-color: #e2e8f0; }

    .modal-footer {
      display: flex; justify-content: flex-end; gap: 10px;
      padding: 16px 24px;
      border-top: 1px solid #e2e8f0;
    }

    /* Credentials Modal */
    .credentials-dialog { max-width: 540px; }
    .success-icon-badge {
      width: 32px; height: 32px; border-radius: 50%;
      background: #16a34a; color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; font-weight: 800;
    }
    .email-dispatch-banner {
      display: flex; gap: 10px; align-items: flex-start;
      background: #f0fdf4; border: 1px solid #bbf7d0;
      border-radius: 8px; padding: 12px 14px;
      font-size: 12px; color: #166534; line-height: 1.5;
      margin-bottom: 12px;
    }
    .cred-card {
      background: #f8fafc; border: 1px solid #e2e8f0;
      border-radius: 8px; padding: 14px 16px;
      display: flex; flex-direction: column; gap: 10px;
    }
    .cred-row {
      display: flex; justify-content: space-between; align-items: center;
      font-size: 13px;
    }
    .cred-label { color: #64748b; font-weight: 500; }
    .cred-value { font-weight: 600; color: #0f172a; }
    .temp-pw-box {
      background: #e2e8f0; padding: 4px 10px; border-radius: 6px;
      font-weight: 700; font-size: 14px; color: #0f172a; letter-spacing: 0.05em;
    }
    .copy-btn { padding: 4px 10px; font-size: 11px; }

    /* Toast */
    .um-toast {
      position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
      background: #0f172a; color: #fff;
      padding: 11px 20px; border-radius: 10px;
      font-size: 13px; font-weight: 500;
      z-index: 9999;
      animation: slideUp .2s ease;
      border-left: 3px solid #2563eb;
      box-shadow: 0 8px 24px rgba(0,0,0,.15);
    }
    .um-toast.success { border-left-color: #16a34a; }
    .um-toast.error   { border-left-color: #dc2626; }
  `]
})
export class UserManagementComponent implements OnInit, OnDestroy {
  users: ManagedUser[] = [];
  filtered: ManagedUser[] = [];
  search = '';
  roleFilter = '';
  statusFilter = '';
  page = 1;
  perPage = 10;
  currentUserId = 0;
  loading = false;
  submitting = false;

  modalOpen = false;
  editMode = false;
  editingId: number | null = null;
  showPw = false;
  formError = '';

  credentialsModalOpen = false;
  createdUserCreds: CreateUserResponse | null = null;
  copied = false;

  toast: string | null = null;
  toastType: 'success' | 'error' = 'success';
  private toastTimer: any;

  form: StaffUserForm = this.blankForm();
  private subs = new Subscription();

  summaryStatsList: any[] = [];
  pagedUsers: ManagedUser[] = [];
  pageNumbers: number[] = [];
  currentRoleAccess: { label: string; has: boolean }[] = [];

  trackUser = (_: number, u: ManagedUser): number => u.id;
  trackPage = (_: number, p: number): number => p;
  trackStat = (_: number, s: { label: string }): string => s.label;
  trackAccess = (_: number, a: { label: string }): string => a.label;

  constructor(private authService: AuthService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.currentUserId = this.authService.currentUser?.id || 0;
    this.currentRoleAccess = this.computeRoleAccess(this.form.role);
    this.subs.add(
      this.authService.managedUsers$.subscribe(users => {
        this.users = users || [];
        this.applyFilter();
        this.updateStats();
        this.cdr.markForCheck();
      })
    );
    this.refreshUsers();
  }

  ngOnDestroy() { this.subs.unsubscribe(); }

  refreshUsers() {
    this.loading = true;
    this.authService.loadManagedUsers().subscribe({
      next: (users) => {
        this.loading = false;
        this.users = users || [];
        this.applyFilter();
        this.updateStats();
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ─── Filter & Pagination ────────────────────────────────────────────────────

  applyFilter() {
    const q = (this.search || '').toLowerCase().trim();
    this.filtered = (this.users || []).filter(u => {
      if (!u) return false;
      const name = (u.name || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const roleMatch = !this.roleFilter || u.role === this.roleFilter;
      const statusMatch = !this.statusFilter || (this.statusFilter === 'ACTIVE' ? u.active : !u.active);
      const searchMatch = !q || name.includes(q) || email.includes(q);
      return roleMatch && statusMatch && searchMatch;
    });
    this.page = 1;
    this.updatePagination();
  }

  setPage(p: number) {
    if (p >= 1 && p <= this.totalPages) {
      this.page = p;
      this.updatePagination();
    }
  }

  updatePagination() {
    this.pagedUsers = this.filtered.slice((this.page - 1) * this.perPage, this.page * this.perPage);
    const pages: number[] = [];
    for (let i = Math.max(1, this.page - 2); i <= Math.min(this.totalPages, this.page + 2); i++) {
      pages.push(i);
    }
    this.pageNumbers = pages;
  }

  get totalPages(): number { return Math.max(1, Math.ceil(this.filtered.length / this.perPage)); }

  minVal(a: number, b: number): number { return Math.min(a, b); }

  // ─── Stats ──────────────────────────────────────────────────────────────────

  updateStats() {
    const list = this.users || [];
    this.summaryStatsList = [
      { label: 'Total Users',      value: list.length,                                          icon: '👥', bg: '#eff6ff', color: '#2563eb' },
      { label: 'Sales Reps',       value: list.filter(u => u.role === 'SALES_REP').length,      icon: '💼', bg: '#f0fdf4', color: '#16a34a' },
      { label: 'Sales Managers',   value: list.filter(u => u.role === 'SALES_MANAGER').length,  icon: '🛡️', bg: '#fffbeb', color: '#d97706' },
      { label: 'Finance / RevOps', value: list.filter(u => u.role === 'FINANCE').length,        icon: '💰', bg: '#f5f3ff', color: '#7c3aed' },
    ];
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

  onRoleChange(role: string) {
    this.currentRoleAccess = this.computeRoleAccess(role);
  }

  openCreate() {
    this.editMode = false;
    this.editingId = null;
    this.form = this.blankForm();
    this.formError = '';
    this.currentRoleAccess = this.computeRoleAccess(this.form.role);
    this.modalOpen = true;
  }

  openEdit(u: ManagedUser) {
    this.editMode = true;
    this.editingId = u.id;
    this.form = {
      name: u.name,
      email: u.email,
      password: '',
      role: u.role,
      team: u.team || '',
      autoGeneratePassword: false
    };
    this.formError = '';
    this.currentRoleAccess = this.computeRoleAccess(this.form.role);
    this.modalOpen = true;
  }

  closeModal() {
    this.modalOpen = false;
    this.submitting = false;
  }

  submitForm() {
    this.formError = '';

    if (!this.form.name.trim() || !this.form.email.trim()) {
      this.formError = 'Name and email are required.';
      return;
    }

    if (!this.editMode && !this.form.autoGeneratePassword) {
      if (!this.form.password || this.form.password.length < 6) {
        this.formError = 'Password must be at least 6 characters.';
        return;
      }
    }

    this.submitting = true;

    if (this.editMode && this.editingId !== null) {
      this.authService.updateUser(this.editingId, {
        name: this.form.name.trim(),
        role: this.form.role,
        team: this.form.team.trim()
      }).subscribe({
        next: () => {
          this.submitting = false;
          this.modalOpen = false;
          this.showToast('User updated successfully.', 'success');
          this.refreshUsers();
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.submitting = false;
          this.formError = err?.error?.error || 'Failed to update user.';
          this.cdr.detectChanges();
        }
      });
    } else {
      const payload = {
        name: this.form.name.trim(),
        email: this.form.email.trim(),
        role: this.form.role,
        team: this.form.team.trim(),
        password: this.form.autoGeneratePassword ? undefined : this.form.password
      };

      this.authService.createStaffUser(payload).subscribe({
        next: (resp) => {
          this.submitting = false;
          this.modalOpen = false;
          this.createdUserCreds = resp;
          this.credentialsModalOpen = true;
          this.copied = false;
          this.showToast('Staff user created & credentials dispatched.', 'success');
          this.refreshUsers();
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.submitting = false;
          this.formError = err?.error?.error || 'Failed to create user. Email may already be registered.';
          this.cdr.detectChanges();
        }
      });
    }
  }

  toggleStatus(u: ManagedUser) {
    if (u.id === this.currentUserId) return;
    const action = u.active ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} user "${u.name}"?`)) return;

    this.authService.updateUser(u.id, { active: !u.active }).subscribe({
      next: () => {
        this.refreshUsers();
        this.showToast(`${u.name} has been ${action}d.`, 'success');
        this.cdr.detectChanges();
      },
      error: () => {
        this.showToast('Failed to update user status.', 'error');
        this.cdr.detectChanges();
      }
    });
  }

  resetPassword(u: ManagedUser) {
    if (!confirm(`Reset password for "${u.name}"? A new secure password will be generated and dispatched.`)) return;

    this.authService.resetPassword(u.id).subscribe({
      next: (resp) => {
        this.createdUserCreds = {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          team: u.team,
          tempPassword: resp.tempPassword,
          message: 'Password has been reset.'
        };
        this.credentialsModalOpen = true;
        this.copied = false;
        this.showToast(`Password reset for ${u.name}.`, 'success');
        this.cdr.detectChanges();
      },
      error: () => {
        this.showToast('Failed to reset password.', 'error');
        this.cdr.detectChanges();
      }
    });
  }

  copyPassword(pw: string) {
    if (!pw) return;
    navigator.clipboard.writeText(pw);
    this.copied = true;
    setTimeout(() => {
      this.copied = false;
      this.cdr.detectChanges();
    }, 2000);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  blankForm(): StaffUserForm {
    return {
      name: '',
      email: '',
      password: '',
      role: 'SALES_REP',
      team: '',
      autoGeneratePassword: true
    };
  }

  initials(name: string): string {
    const p = (name || '').trim().split(/\s+/);
    return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase() || 'U';
  }

  roleLabel(role: string): string {
    const map: Record<string, string> = {
      ADMIN: 'Admin',
      SALES_REP: 'Sales Rep',
      SALES_MANAGER: 'Sales Manager',
      FINANCE: 'Finance Operations',
      CUSTOMER: 'Customer'
    };
    return map[role] || role || 'User';
  }

  roleBadge(role: string): string {
    const map: Record<string, string> = {
      ADMIN: 'badge-primary',
      SALES_REP: 'badge-success',
      SALES_MANAGER: 'badge-warning',
      FINANCE: 'badge-purple',
      CUSTOMER: 'badge-info'
    };
    return map[role] || 'badge-neutral';
  }

  roleColor(role: string): string {
    const map: Record<string, string> = {
      ADMIN: '#2563eb',
      SALES_REP: '#16a34a',
      SALES_MANAGER: '#d97706',
      FINANCE: '#7c3aed',
      CUSTOMER: '#0284c7'
    };
    return map[role] || '#475569';
  }

  computeRoleAccess(role: string): { label: string; has: boolean }[] {
    const all = ['Dashboard', 'Quotations', 'Approvals', 'Fulfillment', 'Subscription', 'Invoices', 'Deal Health', 'Reports', 'User Admin'];
    const access: Record<string, string[]> = {
      ADMIN:         all,
      SALES_REP:     ['Dashboard', 'Quotations', 'Fulfillment', 'Subscription', 'Deal Health'],
      SALES_MANAGER: ['Dashboard', 'Quotations', 'Approvals', 'Fulfillment', 'Subscription', 'Deal Health', 'Reports'],
      FINANCE:       ['Dashboard', 'Quotations', 'Approvals', 'Fulfillment', 'Subscription', 'Invoices', 'Deal Health', 'Reports'],
      CUSTOMER:      ['Portal Access', 'Quotations', 'Invoices'],
    };
    return all.map(label => ({ label, has: (access[role] || []).includes(label) }));
  }

  private showToast(msg: string, type: 'success' | 'error') {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast = msg;
    this.toastType = type;
    this.cdr.detectChanges();
    this.toastTimer = setTimeout(() => {
      this.toast = null;
      this.cdr.detectChanges();
    }, 3500);
  }
}
