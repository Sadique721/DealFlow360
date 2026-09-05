import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';

export interface InvoiceItem {
  id: string;
  dbId?: number;
  quoteId: string;
  customer: string;
  amount: number;
  status: 'PAID' | 'PENDING' | 'OVERDUE' | 'DRAFT' | 'UNPAID' | 'VOID';
  deliveryStatus?: string;
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
          <h1 class="text-xl font-bold text-primary">Invoices & Financial Settlements</h1>
          <p class="text-sm text-muted mt-1">Manage, reconcile, and track commercial invoices, delivery states, and payment records</p>
        </div>
        <button class="btn btn-primary" (click)="promptNewInvoice()">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
          Issue Commercial Invoice
        </button>
      </div>

      <!-- Summary -->
      <div class="grid-4 mb-6">
        <div class="stat-card" *ngFor="let s of summary">
          <div class="stat-label">{{ s.label }}</div>
          <div class="stat-value">{{ s.value }}</div>
        </div>
      </div>

      <!-- Table Card -->
      <div class="card">
        <div class="table-toolbar">
          <div class="search-input-wrapper">
            <svg class="search-icon" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input class="search-input" placeholder="Search by invoice #, quote #, customer, or rep..." [(ngModel)]="search" (ngModelChange)="applyFilter()"/>
          </div>
          <select class="form-control" style="width:auto" [(ngModel)]="statusFilter" (ngModelChange)="applyFilter()">
            <option value="">All Statuses</option>
            <option value="PAID">Paid</option>
            <option value="PENDING">Pending / Unpaid</option>
            <option value="OVERDUE">Overdue</option>
            <option value="VOID">Void</option>
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
                <th>Payment Status</th>
                <th>Delivery Reconciliation</th>
                <th>Issued</th>
                <th>Due Date</th>
                <th>Sales Rep</th>
                <th style="text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let inv of paged">
                <td class="font-semibold text-primary">{{ inv.id }}</td>
                <td class="text-muted">{{ inv.quoteId }}</td>
                <td>{{ inv.customer }}</td>
                <td class="font-semibold">\${{ inv.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
                <td>
                  <span class="badge"
                    [class.badge-success]="inv.status === 'PAID'"
                    [class.badge-warning]="inv.status === 'PENDING' || inv.status === 'UNPAID'"
                    [class.badge-danger]="inv.status === 'OVERDUE'"
                    [class.badge-neutral]="inv.status === 'DRAFT' || inv.status === 'VOID'"
                  >{{ inv.status }}</span>
                </td>
                <td>
                  <span class="badge"
                    [class.badge-success]="inv.deliveryStatus === 'PAID' || inv.deliveryStatus === 'FULFILLED'"
                    [class.badge-info]="inv.deliveryStatus === 'SHIPPED'"
                    [class.badge-warning]="inv.deliveryStatus === 'INVOICED' || inv.deliveryStatus === 'ORDER_CONFIRMED'"
                    [class.badge-neutral]="!inv.deliveryStatus"
                  >{{ inv.deliveryStatus || 'SHIPPED' }}</span>
                </td>
                <td class="text-muted">{{ inv.issuedDate }}</td>
                <td class="text-muted">{{ inv.dueDate }}</td>
                <td>{{ inv.salesRep }}</td>
                <td style="text-align: right; white-space: nowrap;">
                  <button class="btn btn-sm btn-outline-primary mr-1" (click)="openPdfModal(inv)" title="Generate & Download/Print Commercial Invoice PDF">
                    <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="vertical-align: -1px; margin-right: 2px;">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                    PDF
                  </button>
                  <button *ngIf="inv.status !== 'PAID' && inv.status !== 'VOID'" 
                          class="btn btn-sm btn-outline-success mr-1" 
                          (click)="recordPayment(inv)"
                          title="Record full payment in MySQL">
                    Pay
                  </button>
                  <button *ngIf="inv.status !== 'PAID' && inv.status !== 'VOID'" 
                          class="btn btn-sm btn-outline-danger" 
                          (click)="voidInvoice(inv)"
                          title="Void invoice">
                    Void
                  </button>
                  <span *ngIf="inv.status === 'PAID'" class="text-success font-semibold" style="font-size: 12px; margin-left: 4px;">
                    ✓ Settled
                  </span>
                  <span *ngIf="inv.status === 'VOID'" class="text-muted font-semibold" style="font-size: 12px; margin-left: 4px;">
                    Cancelled
                  </span>
                </td>
              </tr>
              <tr *ngIf="filtered.length === 0">
                <td colspan="10" class="text-center py-6 text-muted">
                  No matching invoices found.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="pagination">
          <span class="pagination-info">Showing {{ filtered.length > 0 ? (page-1)*perPage+1 : 0 }}–{{ min(page*perPage, filtered.length) }} of {{ filtered.length }} invoices</span>
          <button class="page-btn" [disabled]="page === 1" (click)="page = page-1">‹</button>
          <button class="page-btn" *ngFor="let p of pages()" [class.active]="p === page" (click)="page = p">{{ p }}</button>
          <button class="page-btn" [disabled]="page === totalPages" (click)="page = page+1">›</button>
        </div>
      </div>

      <!-- INVOICE PDF PREVIEW & PRINT TEMPLATE MODAL -->
      <div class="pdf-modal-backdrop" *ngIf="selectedInvoiceForPdf" (click)="closePdfModal()">
        <div class="pdf-modal-content" (click)="$event.stopPropagation()">
          <div class="pdf-modal-toolbar no-print">
            <div class="toolbar-left">
              <span class="badge badge-info">Commercial Invoice Document</span>
              <span class="mono text-muted" style="margin-left: 8px;">{{ selectedInvoiceForPdf.id }}</span>
            </div>
            <div class="toolbar-actions">
              <button class="btn btn-primary btn-sm" (click)="printPdf()">
                <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                Print / Save as PDF
              </button>
              <button class="btn-close" (click)="closePdfModal()">✕</button>
            </div>
          </div>

          <!-- Printable Invoice Document -->
          <div class="invoice-paper" id="printable-invoice">
            <!-- Header -->
            <div class="inv-header">
              <div class="inv-brand">
                <div class="brand-logo">
                  <span class="logo-text">DealFlow360</span>
                </div>
                <div class="brand-address">
                  <strong>DealFlow360 Inc. — Commercial Operations</strong><br/>
                  100 Tech Enterprise Blvd, Suite 400<br/>
                  San Francisco, CA 94105, United States<br/>
                  <span>Tax ID: EIN-94-3829104 | billing@dealflow360.com</span>
                </div>
              </div>
              <div class="inv-meta">
                <h2 class="inv-doc-title">TAX INVOICE</h2>
                <table class="inv-meta-table">
                  <tr>
                    <td>Invoice #:</td>
                    <td class="mono font-bold">{{ selectedInvoiceForPdf.id }}</td>
                  </tr>
                  <tr>
                    <td>Quote Ref:</td>
                    <td class="mono">{{ selectedInvoiceForPdf.quoteId }}</td>
                  </tr>
                  <tr>
                    <td>Issue Date:</td>
                    <td>{{ selectedInvoiceForPdf.issuedDate }}</td>
                  </tr>
                  <tr>
                    <td>Due Date:</td>
                    <td class="font-bold">{{ selectedInvoiceForPdf.dueDate }}</td>
                  </tr>
                  <tr>
                    <td>Fulfillment:</td>
                    <td>{{ selectedInvoiceForPdf.deliveryStatus || 'SHIPPED' }}</td>
                  </tr>
                </table>
              </div>
            </div>

            <!-- Billed To & Status Stamp -->
            <div class="inv-parties">
              <div class="bill-to">
                <span class="party-label">BILLED TO / ENTERPRISE CUSTOMER:</span>
                <h3 class="party-name">{{ selectedInvoiceForPdf.customer }}</h3>
                <div class="party-details">
                  <span>Sales Representative: <strong>{{ selectedInvoiceForPdf.salesRep }}</strong></span><br/>
                  <span>Payment Terms: Net 30 Commercial Credit</span><br/>
                  <span>Billing Currency: USD ($)</span>
                </div>
              </div>
              <div class="inv-status-stamp">
                <div class="stamp-box" [class.stamp-paid]="selectedInvoiceForPdf.status === 'PAID'" [class.stamp-pending]="selectedInvoiceForPdf.status !== 'PAID'">
                  {{ selectedInvoiceForPdf.status === 'PAID' ? 'PAID & SETTLED' : 'PAYMENT DUE' }}
                </div>
              </div>
            </div>

            <!-- Line Items Table -->
            <table class="inv-lines-table">
              <thead>
                <tr>
                  <th style="width: 5%;">#</th>
                  <th style="width: 50%;">Description / Deliverable</th>
                  <th style="width: 15%; text-align: center;">Delivery State</th>
                  <th style="width: 10%; text-align: center;">Qty</th>
                  <th style="width: 20%; text-align: right;">Amount (USD)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1</td>
                  <td>
                    <strong>Enterprise Commercial Deliverables (Ref: {{ selectedInvoiceForPdf.quoteId }})</strong>
                    <div class="inv-line-sub">Hardware components, recurring licenses, and dedicated engineering services</div>
                  </td>
                  <td style="text-align: center;">
                    <span class="inv-pill">{{ selectedInvoiceForPdf.deliveryStatus || 'SHIPPED' }}</span>
                  </td>
                  <td style="text-align: center;">1</td>
                  <td style="text-align: right;" class="mono font-bold">
                    \${{ selectedInvoiceForPdf.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- Totals & Settlement Calculation -->
            <div class="inv-calc-section">
              <div class="inv-notes">
                <h4>Payment & Wire Instructions:</h4>
                <p>Please remit wire transfers in USD quoting Invoice #<strong>{{ selectedInvoiceForPdf.id }}</strong>:</p>
                <div class="bank-details-box">
                  <strong>Bank:</strong> Silicon Valley Commercial Bank, N.A.<br/>
                  <strong>Routing / ABA:</strong> 121000358<br/>
                  <strong>Account #:</strong> 9842-1082-4419 (USD Settlement)<br/>
                  <strong>SWIFT/BIC:</strong> SVCBUS6S<br/>
                  <strong>Beneficiary:</strong> DealFlow360 Commercial Holdings Inc.
                </div>
              </div>

              <div class="inv-totals-box">
                <div class="tot-row">
                  <span>Subtotal:</span>
                  <span class="mono">\${{ (selectedInvoiceForPdf.amount * 0.9091).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
                </div>
                <div class="tot-row">
                  <span>Estimated Tax / VAT:</span>
                  <span class="mono">\${{ (selectedInvoiceForPdf.amount * 0.0909).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
                </div>
                <div class="tot-row tot-final">
                  <span>Total Amount Due:</span>
                  <span class="mono">\${{ selectedInvoiceForPdf.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
                </div>
              </div>
            </div>

            <!-- Footer Sign-off -->
            <div class="inv-footer">
              <div class="footer-terms">
                Thank you for your business. For billing inquiries, contact finance@dealflow360.com within 14 days.
              </div>
              <div class="footer-auth">
                <div class="signature-line"></div>
                <span>Authorized Financial Officer</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-content { padding: 28px; }
    .stat-card { background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:18px; }
    .stat-label { font-size:12px; font-weight:600; color:#94a3b8; text-transform:uppercase; letter-spacing:.04em; margin-bottom:8px; }
    .stat-value { font-size:24px; font-weight:700; color:#0f172a; }
    .btn-outline-primary {
      background: transparent;
      border: 1px solid #2563eb;
      color: #2563eb;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-outline-primary:hover {
      background: #2563eb;
      color: #fff;
    }
    .btn-outline-success {
      background: transparent;
      border: 1px solid #16a34a;
      color: #16a34a;
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-outline-success:hover {
      background: #16a34a;
      color: #fff;
    }
    .btn-outline-danger {
      background: transparent;
      border: 1px solid #ef4444;
      color: #ef4444;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-outline-danger:hover {
      background: #ef4444;
      color: #fff;
    }
    .badge-info { background: #e0f2fe; color: #0369a1; }
    .badge-neutral { background: #f1f5f9; color: #64748b; }
    .mr-1 { margin-right: 6px; }

    /* PDF MODAL & PRINT STYLES */
    .pdf-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.7);
      backdrop-filter: blur(4px);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      padding: 20px;
      overflow-y: auto;
    }
    .pdf-modal-content {
      background: #f8fafc;
      border-radius: 12px;
      max-width: 850px;
      width: 100%;
      box-shadow: 0 20px 40px rgba(0,0,0,0.25);
      border: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      max-height: 90vh;
      overflow-y: auto;
    }
    .pdf-modal-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 20px;
      background: #ffffff;
      border-bottom: 1px solid #e2e8f0;
      border-radius: 12px 12px 0 0;
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .btn-close {
      background: transparent;
      border: none;
      font-size: 18px;
      color: #64748b;
      cursor: pointer;
      padding: 4px 8px;
    }
    .btn-close:hover { color: #0f172a; }

    /* The White Sheet */
    .invoice-paper {
      background: #ffffff;
      color: #1e293b;
      padding: 40px;
      margin: 20px auto;
      width: 100%;
      max-width: 790px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      line-height: 1.5;
    }
    .inv-header {
      display: flex;
      justify-content: space-between;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 20px;
      margin-bottom: 25px;
    }
    .logo-text {
      font-size: 24px;
      font-weight: 800;
      color: #2563eb;
      letter-spacing: -0.5px;
    }
    .brand-address {
      font-size: 12px;
      color: #64748b;
      margin-top: 6px;
    }
    .inv-meta {
      text-align: right;
    }
    .inv-doc-title {
      font-size: 26px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 1px;
      margin: 0 0 10px 0;
    }
    .inv-meta-table {
      font-size: 12px;
      margin-left: auto;
    }
    .inv-meta-table td {
      padding: 2px 6px;
      color: #334155;
    }
    .inv-parties {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 25px;
      padding: 16px;
      background: #f8fafc;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    .party-label {
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.5px;
    }
    .party-name {
      font-size: 17px;
      font-weight: 700;
      color: #0f172a;
      margin: 4px 0 6px 0;
    }
    .party-details {
      font-size: 12px;
      color: #475569;
    }
    .stamp-box {
      font-size: 14px;
      font-weight: 800;
      letter-spacing: 1px;
      padding: 8px 16px;
      border-radius: 6px;
      text-transform: uppercase;
      transform: rotate(-4deg);
    }
    .stamp-paid {
      border: 2px solid #16a34a;
      color: #16a34a;
      background: #f0fdf4;
    }
    .stamp-pending {
      border: 2px solid #d97706;
      color: #d97706;
      background: #fffbeb;
    }
    .inv-lines-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 25px;
    }
    .inv-lines-table th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 700;
      font-size: 12px;
      padding: 10px 12px;
      border-bottom: 1px solid #cbd5e1;
      text-align: left;
    }
    .inv-lines-table td {
      padding: 12px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 13px;
    }
    .inv-line-sub {
      font-size: 11px;
      color: #64748b;
      margin-top: 3px;
    }
    .inv-pill {
      font-size: 10px;
      font-weight: 700;
      padding: 3px 8px;
      background: #e0f2fe;
      color: #0284c7;
      border-radius: 9999px;
    }
    .inv-calc-section {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      margin-bottom: 30px;
    }
    .inv-notes {
      flex: 1;
      font-size: 11px;
      color: #64748b;
    }
    .inv-notes h4 {
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 6px 0;
    }
    .bank-details-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 10px;
      border-radius: 6px;
      margin-top: 6px;
      line-height: 1.6;
    }
    .inv-totals-box {
      width: 280px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px;
    }
    .tot-row {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      margin-bottom: 6px;
      color: #475569;
    }
    .tot-final {
      border-top: 2px solid #cbd5e1;
      padding-top: 8px;
      margin-top: 8px;
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
    }
    .inv-footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-top: 1px solid #e2e8f0;
      padding-top: 20px;
      font-size: 11px;
      color: #64748b;
    }
    .footer-terms {
      max-width: 420px;
    }
    .footer-auth {
      text-align: center;
    }
    .signature-line {
      width: 160px;
      border-bottom: 1px solid #94a3b8;
      margin-bottom: 6px;
    }

    /* PRINT SPECIFIC CSS */
    @media print {
      body * {
        visibility: hidden !important;
      }
      .no-print, .nav-header, .sidebar, .top-nav, .page-content > *:not(.pdf-modal-backdrop) {
        display: none !important;
      }
      .pdf-modal-backdrop {
        position: static !important;
        background: none !important;
        padding: 0 !important;
        visibility: visible !important;
        display: block !important;
      }
      .pdf-modal-content {
        box-shadow: none !important;
        border: none !important;
        max-width: 100% !important;
        visibility: visible !important;
      }
      #printable-invoice, #printable-invoice * {
        visibility: visible !important;
      }
      #printable-invoice {
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        width: 100% !important;
        box-shadow: none !important;
        margin: 0 !important;
        padding: 20px !important;
      }
    }
  `]
})
export class InvoicesComponent implements OnInit {
  search = '';
  statusFilter = '';
  page = 1;
  perPage = 10;
  filtered: InvoiceItem[] = [];
  invoices: InvoiceItem[] = [];
  selectedInvoiceForPdf: InvoiceItem | null = null;

  summary = [
    { label: 'Total Invoiced', value: '$0.00' },
    { label: 'Paid',           value: '$0.00' },
    { label: 'Pending',        value: '$0.00' },
    { label: 'Overdue',        value: '$0.00' }
  ];

  constructor(
    private apiService: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadInvoices();
  }

  openPdfModal(inv: InvoiceItem): void {
    this.selectedInvoiceForPdf = inv;
    this.cdr.detectChanges();
  }

  closePdfModal(): void {
    this.selectedInvoiceForPdf = null;
    this.cdr.detectChanges();
  }

  printPdf(): void {
    window.print();
  }

  loadInvoices(): void {
    this.apiService.get<any[]>('invoices').subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          this.invoices = data.map(inv => ({
            id: inv.invoiceNumber || (`INV-2026-${String(inv.id).padStart(4, '0')}`),
            dbId: inv.id,
            quoteId: inv.quoteId || inv.quoteNumber || (inv.quotation?.quoteNumber) || `Q-2026-${String(inv.quotationId || 1).padStart(4, '0')}`,
            customer: inv.customerName || (typeof inv.customer === 'string' ? inv.customer : inv.customer?.name) || 'Client Partner',
            amount: Number(inv.amount || 0),
            status: inv.status === 'UNPAID' ? 'PENDING' : (inv.status || 'PENDING'),
            deliveryStatus: inv.deliveryStatus || 'SHIPPED',
            issuedDate: inv.issuedDate || (inv.createdAt ? String(inv.createdAt).substring(0, 10) : '2026-09-01'),
            dueDate: inv.dueDate ? String(inv.dueDate).substring(0, 10) : '2026-10-01',
            salesRep: inv.salesRep || inv.salesRepName || inv.quotation?.salesRep?.name || 'Regional Sales Rep'
          }));
        } else {
          // No invoices yet — show empty state
          this.invoices = [];
        }
        this.updateSummary();
        this.applyFilter();
        this.cdr.detectChanges();
      },
      error: () => {
        // Network error — show empty state, do not use mock data
        this.invoices = [];
        this.updateSummary();
        this.applyFilter();
        this.cdr.detectChanges();
      }
    });
  }

  recordPayment(inv: InvoiceItem): void {
    if (!inv.dbId) {
      inv.status = 'PAID';
      inv.deliveryStatus = 'PAID';
      this.updateSummary();
      this.applyFilter();
      this.cdr.detectChanges();
      return;
    }

    this.apiService.post<any>(`invoices/${inv.dbId}/pay`, {}).subscribe({
      next: () => {
        inv.status = 'PAID';
        inv.deliveryStatus = 'PAID';
        this.updateSummary();
        this.applyFilter();
        this.cdr.detectChanges();
        alert(`Payment of $${inv.amount.toLocaleString()} successfully recorded for ${inv.id}!`);
      },
      error: (err) => {
        alert(`Failed to record payment: ${err?.error?.message || err?.message || 'Server error'}`);
      }
    });
  }

  voidInvoice(inv: InvoiceItem): void {
    if (!inv.dbId) {
      inv.status = 'VOID';
      this.updateSummary();
      this.applyFilter();
      this.cdr.detectChanges();
      return;
    }

    const reason = prompt('Please enter reason for voiding this invoice:') || 'Customer cancellation';
    this.apiService.post<any>(`invoices/${inv.dbId}/void?reason=${encodeURIComponent(reason)}`, {}).subscribe({
      next: () => {
        inv.status = 'VOID';
        this.updateSummary();
        this.applyFilter();
        this.cdr.detectChanges();
        alert(`Invoice ${inv.id} has been voided.`);
      },
      error: (err) => {
        alert(`Failed to void invoice: ${err?.error?.message || err?.message || 'Server error'}`);
      }
    });
  }

  promptNewInvoice(): void {
    const qInput = prompt('Enter Quotation ID or Quote Number to issue invoice for (e.g. 6 or Q-1045):');
    if (!qInput) return;
    const cleanId = parseInt(qInput.replace(/\D/g, ''), 10);
    if (!cleanId || isNaN(cleanId)) {
      alert('Please enter a valid numeric Quotation ID.');
      return;
    }

    this.apiService.post<any>(`invoices/quotation/${cleanId}/generate`, {}).subscribe({
      next: (newInv) => {
        alert(`Invoice ${newInv.invoiceNumber || 'INV-NEW'} successfully generated for quotation!`);
        this.loadInvoices();
      },
      error: (err) => {
        alert(`Failed to generate invoice: ${err?.error?.message || err?.message || 'Quotation not found or not confirmed'}`);
      }
    });
  }

  updateSummary(): void {
    let total = 0;
    let paid = 0;
    let pending = 0;
    let overdue = 0;

    for (const inv of this.invoices) {
      if (inv.status === 'VOID') continue;
      total += inv.amount;
      if (inv.status === 'PAID') {
        paid += inv.amount;
      } else if (inv.status === 'OVERDUE') {
        overdue += inv.amount;
      } else {
        pending += inv.amount;
      }
    }

    this.summary = [
      { label: 'Total Invoiced', value: this.formatCurrencyAbbr(total) },
      { label: 'Paid',           value: this.formatCurrencyAbbr(paid) },
      { label: 'Pending',        value: this.formatCurrencyAbbr(pending) },
      { label: 'Overdue',        value: this.formatCurrencyAbbr(overdue) }
    ];
  }

  private formatCurrencyAbbr(val: number): string {
    if (val >= 1_000_000) {
      return `$${(val / 1_000_000).toFixed(2)}M`;
    }
    if (val >= 1_000) {
      return `$${(val / 1_000).toFixed(1)}K`;
    }
    return `$${val.toFixed(2)}`;
  }

  applyFilter(): void {
    const q = this.search.toLowerCase().trim();
    this.filtered = this.invoices.filter(inv => {
      const matchQ = !q ||
        inv.id.toLowerCase().includes(q) ||
        inv.customer.toLowerCase().includes(q) ||
        inv.quoteId.toLowerCase().includes(q) ||
        inv.salesRep.toLowerCase().includes(q);

      let matchStatus = true;
      if (this.statusFilter === 'PENDING') {
        matchStatus = inv.status === 'PENDING' || inv.status === 'UNPAID';
      } else if (this.statusFilter) {
        matchStatus = inv.status === this.statusFilter;
      }

      return matchQ && matchStatus;
    });
    this.page = 1;
  }

  get paged(): InvoiceItem[] {
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

  private generateFallbackInvoices(): InvoiceItem[] {
    const customers = [
      'Zenith Systems','Tata Consultancy','Apex Logistics','InfoSys Ltd','Wipro Dynamics',
      'HCL Technologies','Mahindra IT','Tech Mahindra','Reliance Digital','Bajaj Finserv',
      'HDFC Bank IT','ICICI Tech','Axis Capital','SBI Cards','Kotak Securities',
      'Mphasis Corp','Mindtree Solutions','Hexaware Tech','Mastech Digital','Cyient Ltd'
    ];
    const reps = ['Jay Rao','Neha Sharma','Arjun Patel','Kavya Nair','Rohit Mehta','Priya Singh','Kiran Kumar'];
    const statuses: InvoiceItem['status'][] = ['PAID','PAID','PAID','PENDING','PENDING','OVERDUE','DRAFT'];
    const result: InvoiceItem[] = [];

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
        deliveryStatus: status === 'PAID' ? 'PAID' : 'SHIPPED',
        issuedDate: `2026-${mon}-${day}`,
        dueDate: `2026-${String(Number(mon) + 1 > 12 ? 1 : Number(mon) + 1).padStart(2,'0')}-${day}`,
        salesRep: reps[i % reps.length]
      });
    }
    return result;
  }
}
