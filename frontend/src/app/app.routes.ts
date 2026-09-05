import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home.component';
import { LoginComponent } from './pages/login.component';
import { DashboardComponent } from './pages/dashboard.component';
import { DashboardHomeComponent } from './pages/dashboard-home.component';
import { PipelineComponent } from './pages/pipeline.component';
import { QuoteBuilderComponent } from './pages/quote-builder.component';
import { ApprovalCenterComponent } from './pages/approval-center.component';
import { WarehouseSplitComponent } from './pages/warehouse-split.component';
import { DealHealthComponent } from './pages/deal-health.component';
import { CustomerPortalComponent } from './pages/customer-portal.component';
import { SubscriptionBillingComponent } from './pages/subscription-billing.component';
import { InvoicesComponent } from './pages/invoices.component';
import { UserManagementComponent } from './pages/user-management.component';
import { UnauthorizedComponent } from './pages/unauthorized.component';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
  // Public routes
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'unauthorized', component: UnauthorizedComponent },

  // Customer portal (public token-based or customer authenticated)
  { path: 'portal/:token', component: CustomerPortalComponent },

  // Protected dashboard shell
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'home',
        component: DashboardHomeComponent,
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE'] }
      },
      {
        path: 'pipeline',
        component: PipelineComponent,
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE'], module: 'quotations' }
      },
      {
        path: 'quote/new',
        component: QuoteBuilderComponent,
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'SALES_REP', 'SALES_MANAGER'], module: 'quotations' }
      },
      {
        path: 'quote/:id',
        component: QuoteBuilderComponent,
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE'], module: 'quotations' }
      },
      {
        path: 'approval',
        component: ApprovalCenterComponent,
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'SALES_MANAGER', 'FINANCE'], module: 'approvals' }
      },
      {
        path: 'approval/:id',
        component: ApprovalCenterComponent,
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'SALES_MANAGER', 'FINANCE'], module: 'approvals' }
      },
      {
        path: 'fulfillment',
        component: WarehouseSplitComponent,
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE'], module: 'fulfillment' }
      },
      {
        path: 'fulfillment/:id',
        component: WarehouseSplitComponent,
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE'], module: 'fulfillment' }
      },
      {
        path: 'subscription',
        component: SubscriptionBillingComponent,
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE'], module: 'subscription' }
      },
      {
        path: 'invoices',
        component: InvoicesComponent,
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'FINANCE'], module: 'invoices' }
      },
      {
        path: 'deal-health',
        component: DealHealthComponent,
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE'], module: 'deal-health' }
      },
      {
        path: 'reports',
        component: PipelineComponent,
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'SALES_MANAGER', 'FINANCE'], module: 'reports' }
      },
      {
        path: 'users',
        component: UserManagementComponent,
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'], module: 'users' }
      }
    ]
  },

  // Catch-all
  { path: '**', redirectTo: '' }
];
