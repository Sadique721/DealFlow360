import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InvoiceService } from '../services/invoice.service';
import { Invoice as BackendInvoice } from '../models/dealflow.model';

interface DisplayInvoice {
  id: number | string;
  invoiceNumber: string;
  quoteId: string;
  customer: string;
  amount: number;
  status: 'PAID' | 'PENDING' | 'OVERDUE' | 'DRAFT' | 'UNPAID';
  dueDate: string;
  issuedDate: string;
  salesRep: string;
  deliveryStatus: string;
}

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-content">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-xl font-bold text-primary">Invoices & Commercial Accounts</h1>
          <p class="text-sm text-muted mt-1">Live database records synced with MySQL billing and ERP reconciliation</p>
        </div>
        <div class="badge badge-primary">
          {{ invoices.length }} Total Invoices
        </div>
      </div>

      <!-- Summary -->
      <div class="grid-4 mb-6">
        <div class="stat-card" *ngFor="let s of summary">
          <div class="stat-label">{{ s.label }}</div>
          <div class="stat-value">{{ s.value }}</div>
        </div>
      </div>

      <!-- Table -->
      <div class="card">
        <div class="table-toolbar">
          <div class="search-input-wrapper">
            <svg class="search-icon" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input class="search-input" placeholder="Search invoices..." [(ngModel)]="search" (ngModelChange)="applyFilter()"/>
          </div>
          <select class="form-control" style="width:auto" [(ngModel)]="statusFilter" (ngModelChange)="applyFilter()">
            <option value="">All Statuses</option>
            <option value="PAID">Paid</option>
            <option value="UNPAID">Unpaid</option>
            <option value="PENDING">Pending</option>
            <option value="OVERDUE">Overdue</option>
          </select>
        </div>

        <div class="table-container" style="border:none;border-radius:0">
          <table class="table-custom">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Quote</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Delivery</th>
                <th>Issued</th>
                <th>Due Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let inv of paged">
                <td class="font-semibold mono">{{ inv.invoiceNumber }}</td>
                <td class="text-muted mono">{{ inv.quoteId }}</td>
                <td>{{ inv.customer }}</td>
                <td class="font-semibold mono">\${{ inv.amount.toLocaleString() }}</td>
                <td>
                  <span class="badge"
                    [class.badge-success]="inv.status==='PAID'"
                    [class.badge-warning]="inv.status==='PENDING' || inv.status==='UNPAID'"
                    [class.badge-danger]="inv.status==='OVERDUE'"
                    [class.badge-neutral]="inv.status==='DRAFT'"
                  >{{ inv.status }}</span>
                </td>
                <td>
                  <span class="badge badge-neutral" style="font-size: 11px;">
                    {{ inv.deliveryStatus }}
                  </span>
                </td>
                <td class="text-muted">{{ inv.issuedDate }}</td>
                <td class="text-muted">{{ inv.dueDate }}</td>
                <td>
                  <button
                    *ngIf="inv.status !== 'PAID'"
                    class="btn btn-outline btn-xs"
                    (click)="recordPayment(inv)"
                  >
                    Pay
                  </button>
                  <span *ngIf="inv.status === 'PAID'" class="text-success text-xs font-semibold">
                    ✓ Settled
                  </span>
                </td>
              </tr>
              <tr *ngIf="filtered.length === 0">
                <td colspan="9" class="text-center py-4 text-muted">
                  No matching database invoices found.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="pagination" *ngIf="filtered.length > 0">
          <span class="pagination-info">Showing {{ (page-1)*perPage+1 }}–{{ min(page*perPage, filtered.length) }} of {{ filtered.length }} invoices</span>
          <button class="page-btn" [disabled]="page === 1" (click)="page = page-1">‹</button>
          <button class="page-btn" *ngFor="let p of pages()" [class.active]="p === page" (click)="page = p">{{ p }}</button>
          <button class="page-btn" [disabled]="page === totalPages" (click)="page = page+1">›</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-content { padding: 28px; }
    .stat-card { background: rgba(12, 18, 34, 0.7); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 18px; }
    .stat-label { font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: .04em; margin-bottom: 8px; }
    .stat-value { font-size: 24px; font-weight: 700; color: var(--text-main); }
    .table-toolbar { display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; border-bottom: 1px solid var(--border-subtle); gap: 16px; }
    .search-input-wrapper { position: relative; flex: 1; max-width: 320px; }
    .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); }
    .search-input { padding-left: 36px; }
    .pagination { display: flex; align-items: center; justify-content: flex-end; gap: 8px; padding: 14px 20px; border-top: 1px solid var(--border-subtle); }
    .pagination-info { font-size: 13px; color: var(--text-muted); margin-right: 12px; }
    .page-btn { padding: 4px 10px; border-radius: 6px; border: 1px solid var(--border-subtle); background: transparent; color: var(--text-main); cursor: pointer; }
    .page-btn.active { background: rgba(0, 242, 254, 0.15); border-color: #00f2fe; color: #00f2fe; }
    .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  `]
})
export class InvoicesComponent implements OnInit {
  search = '';
  statusFilter = '';
  page = 1;
  perPage = 15;
  invoices: DisplayInvoice[] = [];
  filtered: DisplayInvoice[] = [];

  summary = [
    { label: 'Total Invoiced', value: '$0' },
    { label: 'Paid Volume',    value: '$0' },
    { label: 'Pending/Unpaid', value: '$0' },
    { label: 'Total Invoices', value: '0' }
  ];

  constructor(private invoiceService: InvoiceService) {}

  ngOnInit(): void {
    this.loadInvoices();
  }

  loadInvoices(): void {
    this.invoiceService.getInvoices().subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          this.invoices = data.map(inv => ({
            id: inv.id,
            invoiceNumber: inv.invoiceNumber || `INV-${inv.id}`,
            quoteId: inv.quotation ? inv.quotation.quoteNumber : (inv.quotationId ? `Q-${inv.quotationId}` : 'DIRECT'),
            customer: inv.customer ? inv.customer.name : (inv.customerName || 'Enterprise Customer'),
            amount: Number(inv.amount) || 0,
            status: (inv.status || 'UNPAID') as any,
            dueDate: inv.dueDate || '2026-10-15',
            issuedDate: inv.createdAt ? inv.createdAt.substring(0, 10) : '2026-09-01',
            salesRep: inv.quotation?.salesRep?.name || 'Sales Rep',
            deliveryStatus: inv.deliveryStatus || 'SHIPPED'
          }));
        } else {
          this.invoices = [];
        }
        this.computeSummary();
        this.applyFilter();
      },
      error: () => {
        this.invoices = [];
        this.computeSummary();
        this.applyFilter();
      }
    });
  }

  computeSummary(): void {
    let total = 0;
    let paid = 0;
    let pending = 0;

    for (const inv of this.invoices) {
      total += inv.amount;
      if (inv.status === 'PAID') {
        paid += inv.amount;
      } else {
        pending += inv.amount;
      }
    }

    this.summary = [
      { label: 'Total Invoiced', value: this.formatCurrency(total) },
      { label: 'Paid Volume',    value: this.formatCurrency(paid) },
      { label: 'Pending/Unpaid', value: this.formatCurrency(pending) },
      { label: 'Total Invoices', value: String(this.invoices.length) }
    ];
  }

  recordPayment(inv: DisplayInvoice): void {
    const numId = typeof inv.id === 'number' ? inv.id : parseInt(inv.id as string, 10);
    if (isNaN(numId)) return;

    this.invoiceService.recordPayment(numId).subscribe({
      next: () => {
        inv.status = 'PAID';
        this.computeSummary();
        alert(`Payment recorded for invoice ${inv.invoiceNumber}! Ledger updated.`);
      },
      error: (err) => {
        alert('Payment could not be recorded: ' + (err.error?.message || err.message || 'Error'));
      }
    });
  }

  applyFilter(): void {
    const q = this.search.toLowerCase();
    this.filtered = this.invoices.filter(inv =>
      (!q || inv.invoiceNumber.toLowerCase().includes(q) || inv.customer.toLowerCase().includes(q) || inv.quoteId.toLowerCase().includes(q)) &&
      (!this.statusFilter || inv.status === this.statusFilter)
    );
    this.page = 1;
  }

  get paged(): DisplayInvoice[] {
    const start = (this.page - 1) * this.perPage;
    return this.filtered.slice(start, start + this.perPage);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filtered.length / this.perPage));
  }

  pages(): number[] {
    const total = this.totalPages;
    const current = this.page;
    const pages: number[] = [];
    for (let i = Math.max(1, current - 2); i <= Math.min(total, current + 2); i++) {
      pages.push(i);
    }
    return pages;
  }

  min(a: number, b: number): number { return Math.min(a, b); }

  private formatCurrency(val: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  }
}
