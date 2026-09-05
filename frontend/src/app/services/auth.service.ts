import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole =
  | 'ADMIN'
  | 'SALES_REP'
  | 'SALES_MANAGER'
  | 'FINANCE'
  | 'CUSTOMER'
  | 'GUEST';

export interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  team: string;
}

export interface ManagedUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  team: string;
  active: boolean;
  createdAt?: string;
}

export interface LoginResponse {
  token: string;
  type: string;
  id: number;
  name: string;
  email: string;
  role: string;
  team: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  role: string;
  team?: string;
  password?: string;
}

export interface CreateUserResponse {
  id: number;
  name: string;
  email: string;
  role: string;
  team: string;
  tempPassword: string;
  message: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE = 'http://localhost:8080/api';
const TOKEN_KEY  = 'df_token';
const ROLE_KEY   = 'df_role';
const NAME_KEY   = 'df_name';
const EMAIL_KEY  = 'df_email';
const USER_KEY   = 'df_user';

const DEFAULT_USER: SessionUser = { id: 0, name: '', email: '', role: 'GUEST', team: '' };

@Injectable({ providedIn: 'root' })
export class AuthService {

  private _user$ = new BehaviorSubject<SessionUser>(DEFAULT_USER);
  private _role$ = new BehaviorSubject<UserRole>('GUEST');
  private _auth$ = new BehaviorSubject<boolean>(false);
  private _users$ = new BehaviorSubject<ManagedUser[]>([]);

  public currentUser$     = this._user$.asObservable();
  public currentRole$     = this._role$.asObservable();
  public isAuthenticated$ = this._auth$.asObservable();
  public managedUsers$    = this._users$.asObservable();

  constructor(private http: HttpClient) {
    this.restoreSession();
  }

  // ─── Getters ─────────────────────────────────────────────────────────────────

  get currentRole(): UserRole { return this._role$.value; }
  get currentUser(): SessionUser { return this._user$.value; }
  get isAuthenticated(): boolean { return this._auth$.value; }
  get token(): string | null { return localStorage.getItem(TOKEN_KEY); }

  get authHeaders(): HttpHeaders {
    const token = this.token;
    return token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : new HttpHeaders();
  }

  // ─── Real Backend Authentication ─────────────────────────────────────────────

  async loginWithCredentials(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const resp = await this.http.post<LoginResponse>(`${API_BASE}/auth/login`, {
        email: email.trim(),
        password
      }).toPromise();

      if (resp && resp.token) {
        this.applySession(resp);
        return { success: true };
      }
      return { success: false, error: 'Invalid response from server.' };
    } catch (err: any) {
      if (err?.status === 401) {
        return { success: false, error: 'Invalid email or password.' };
      }
      if (err?.status === 403) {
        return { success: false, error: 'Account is deactivated or disabled. Please contact administrator.' };
      }
      const msg = err?.error?.error || err?.message || 'Authentication server unreachable. Please verify backend is running on port 8080.';
      return { success: false, error: msg };
    }
  }

  // ─── Customer Self-Registration ──────────────────────────────────────────────

  async customerSignup(name: string, email: string, company: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const resp = await this.http.post<LoginResponse>(`${API_BASE}/auth/signup`, {
        name: name.trim(),
        email: email.trim(),
        password,
        team: company.trim()
      }).toPromise();

      if (resp && resp.token) {
        this.applySession(resp);
        return { success: true };
      }
      return { success: false, error: 'Registration failed.' };
    } catch (err: any) {
      if (err?.status === 400) {
        const msg = err.error?.error || 'Email is already in use.';
        return { success: false, error: msg };
      }
      return { success: false, error: err?.error?.error || 'Signup request failed.' };
    }
  }

  // ─── Logout ──────────────────────────────────────────────────────────────────

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(NAME_KEY);
    localStorage.removeItem(EMAIL_KEY);
    localStorage.removeItem(USER_KEY);
    this._user$.next(DEFAULT_USER);
    this._role$.next('GUEST');
    this._auth$.next(false);
  }

  // ─── Admin Staff User Management APIs ─────────────────────────────────────────

  loadManagedUsers(): Observable<ManagedUser[]> {
    return this.http.get<ManagedUser[]>(`${API_BASE}/admin/users`, { headers: this.authHeaders })
      .pipe(
        tap(users => this._users$.next(users))
      );
  }

  createStaffUser(req: CreateUserRequest): Observable<CreateUserResponse> {
    return this.http.post<CreateUserResponse>(`${API_BASE}/admin/users`, req, { headers: this.authHeaders });
  }

  updateUser(id: number, updates: Partial<ManagedUser>): Observable<ManagedUser> {
    return this.http.patch<ManagedUser>(`${API_BASE}/admin/users/${id}`, updates, { headers: this.authHeaders });
  }

  deactivateUser(id: number): Observable<any> {
    return this.http.delete(`${API_BASE}/admin/users/${id}`, { headers: this.authHeaders });
  }

  resetPassword(id: number): Observable<any> {
    return this.http.post(`${API_BASE}/admin/users/${id}/reset-password`, {}, { headers: this.authHeaders });
  }

  // ─── Role Permission Matrix ───────────────────────────────────────────────────

  canAccess(module: string): boolean {
    const role = this.currentRole;
    if (role === 'ADMIN') return true;

    const access: Record<string, UserRole[]> = {
      'dashboard':       ['SALES_REP', 'SALES_MANAGER', 'FINANCE'],
      'quotations':      ['SALES_REP', 'SALES_MANAGER', 'FINANCE'],
      'customers':       ['SALES_REP', 'SALES_MANAGER', 'FINANCE'],
      'products':        ['SALES_REP', 'SALES_MANAGER'],
      'approvals':       ['SALES_MANAGER', 'FINANCE'],
      'fulfillment':     ['SALES_REP', 'SALES_MANAGER', 'FINANCE'],
      'warehouses':      ['FINANCE', 'SALES_MANAGER'],
      'backorders':      ['FINANCE', 'SALES_MANAGER'],
      'subscription':    ['SALES_REP', 'SALES_MANAGER', 'FINANCE'],
      'invoices':        ['FINANCE'],
      'deal-health':     ['SALES_REP', 'SALES_MANAGER', 'FINANCE'],
      'reports':         ['SALES_MANAGER', 'FINANCE'],
      'users':           [], // Strictly ADMIN only
      'portal':          ['CUSTOMER'],
    };

    return (access[module] || []).includes(role as UserRole);
  }

  // ─── Session Management ───────────────────────────────────────────────────────

  private applySession(resp: LoginResponse): void {
    const user: SessionUser = {
      id:    Number(resp.id),
      name:  resp.name,
      email: resp.email,
      role:  resp.role as UserRole,
      team:  resp.team || ''
    };
    localStorage.setItem(TOKEN_KEY, resp.token);
    localStorage.setItem(ROLE_KEY,  resp.role);
    localStorage.setItem(NAME_KEY,  resp.name);
    localStorage.setItem(EMAIL_KEY, resp.email);
    localStorage.setItem(USER_KEY,  JSON.stringify(user));
    this._user$.next(user);
    this._role$.next(resp.role as UserRole);
    this._auth$.next(true);
  }

  private restoreSession(): void {
    try {
      const stored = localStorage.getItem(USER_KEY);
      const token  = localStorage.getItem(TOKEN_KEY);
      if (stored && token) {
        const user: SessionUser = JSON.parse(stored);
        this._user$.next(user);
        this._role$.next(user.role);
        this._auth$.next(true);
      }
    } catch { /* ignore */ }
  }

  filterQuotationsByRole(quotes: any[]): any[] {
    const role = this.currentRole;
    const user = this.currentUser;
    if (role === 'ADMIN' || role === 'SALES_MANAGER') return quotes;
    if (role === 'SALES_REP') {
      return quotes.filter((q: any) =>
        q.salesRep?.name?.toLowerCase().includes(user.name.toLowerCase().split(' ')[0]) ||
        q.salesRep?.email === user.email
      );
    }
    if (role === 'FINANCE') {
      return quotes.filter((q: any) =>
        q.requiresFinanceApproval || q.blendedDiscountPct > 12 ||
        q.status === 'PENDING_APPROVAL' || q.status === 'APPROVED' || q.status === 'ACCEPTED'
      );
    }
    if (role === 'CUSTOMER') {
      return quotes.filter((q: any) => q.customer?.name?.toLowerCase().includes('acme') ||
        q.customer?.email === user.email);
    }
    return quotes;
  }
}
