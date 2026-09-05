import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Invoice {
  id: string;
  quoteId: string;
  customer: string;
  amount: number;
  status: 'PAID' | 'PENDING' | 'OVERDUE' | 'DRAFT';
  dueDate: string;
  issuedDate: string;
  salesRep: string;
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
          <h1 class="text-xl font-bold text-primary">Invoices</h1>
          <p class="text-sm text-muted mt-1">Manage and track all customer invoices</p>
        </div>
        <button class="btn btn-primary">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
          New Invoice
        </button>
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
            <option value="PENDING">Pending</option>
            <option value="OVERDUE">Overdue</option>
            <option value="DRAFT">Draft</option>
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
                <th>Issued</th>
                <th>Due Date</th>
                <th>Sales Rep</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let inv of paged">
                <td class="font-semibold">{{ inv.id }}</td>
                <td class="text-muted">{{ inv.quoteId }}</td>
                <td>{{ inv.customer }}</td>
                <td class="font-semibold">\${{ inv.amount.toLocaleString() }}</td>
                <td>
                  <span class="badge"
                    [class.badge-success]="inv.status==='PAID'"
                    [class.badge-warning]="inv.status==='PENDING'"
                    [class.badge-danger]="inv.status==='OVERDUE'"
                    [class.badge-neutral]="inv.status==='DRAFT'"
                  >{{ inv.status }}</span>
                </td>
                <td class="text-muted">{{ inv.issuedDate }}</td>
                <td class="text-muted">{{ inv.dueDate }}</td>
                <td>{{ inv.salesRep }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="pagination">
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
    .stat-card { background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:18px; }
    .stat-label { font-size:12px; font-weight:600; color:#94a3b8; text-transform:uppercase; letter-spacing:.04em; margin-bottom:8px; }
    .stat-value { font-size:24px; font-weight:700; color:#0f172a; }
  `]
})
export class InvoicesComponent {
  search = '';
  statusFilter = '';
  page = 1;
  perPage = 15;
  filtered: Invoice[] = [];

  summary = [
    { label: 'Total Invoiced',   value: '$1.84M' },
    { label: 'Paid',             value: '$1.21M' },
    { label: 'Pending',          value: '$420K'  },
    { label: 'Overdue',          value: '$210K'  }
  ];

  invoices: Invoice[] = this.generateInvoices();

  ngOnInit() { this.applyFilter(); }

  applyFilter() {
    const q = this.search.toLowerCase();
    this.filtered = this.invoices.filter(inv =>
      (!q || inv.id.toLowerCase().includes(q) || inv.customer.toLowerCase().includes(q) || inv.quoteId.toLowerCase().includes(q)) &&
      (!this.statusFilter || inv.status === this.statusFilter)
    );
    this.page = 1;
  }

  get paged(): Invoice[] {
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

  private generateInvoices(): Invoice[] {
    const customers = [
      'Zenith Systems','Tata Consultancy','Apex Logistics','InfoSys Ltd','Wipro Dynamics',
      'HCL Technologies','Mahindra IT','Tech Mahindra','Reliance Digital','Bajaj Finserv',
      'HDFC Bank IT','ICICI Tech','Axis Capital','SBI Cards','Kotak Securities',
      'Mphasis Corp','Mindtree Solutions','Hexaware Tech','Mastech Digital','Cyient Ltd'
    ];
    const reps = ['Jay Rao','Neha Sharma','Arjun Patel','Kavya Nair','Rohit Mehta','Priya Singh','Kiran Kumar'];
    const statuses: Invoice['status'][] = ['PAID','PAID','PAID','PENDING','PENDING','OVERDUE','DRAFT'];
    const result: Invoice[] = [];

    for (let i = 1; i <= 120; i++) {
      const customer = customers[i % customers.length];
      const status = statuses[i % statuses.length];
      const amount = Math.round((Math.random() * 90000 + 5000) / 100) * 100;
      const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
      const mon = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
      result.push({
        id: `INV-2026-${String(i).padStart(4, '0')}`,
        quoteId: `Q-2026-${String(Math.floor(Math.random() * 142) + 1).padStart(4, '0')}`,
        customer,
        amount,
        status,
        issuedDate: `2026-${mon}-${day}`,
        dueDate: `2026-${String(Number(mon) + 1 > 12 ? 1 : Number(mon) + 1).padStart(2,'0')}-${day}`,
        salesRep: reps[i % reps.length]
      });
    }
    return result;
  }
}
