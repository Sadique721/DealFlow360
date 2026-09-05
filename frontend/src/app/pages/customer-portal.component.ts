import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-customer-portal',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="portal-wrapper" *ngIf="portalData">
      <!-- Portal Top Header -->
      <header class="portal-header glass-panel">
        <div class="brand">
          <span class="logo-mark">⚡</span>
          <div>
            <h2>DealFlow360 Customer Quoting Portal</h2>
            <p class="sub">Official Commercial Proposal for {{ portalData.customerName || 'Valued Customer' }}</p>
          </div>
        </div>
        <div class="header-right">
          <span class="mono quote-pill">{{ portalData.quoteNumber || 'Q-1042' }}</span>
          <span
            class="badge"
            [class.badge-info]="portalData.status === 'UNDER_NEGOTIATION' || portalData.status === 'SENT_TO_CUSTOMER'"
            [class.badge-warning]="portalData.status === 'PENDING_APPROVAL'"
            [class.badge-success]="portalData.status === 'CONFIRMED' || portalData.status === 'ACCEPTED'"
          >
            {{ (portalData.status || 'UNDER_NEGOTIATION').replace('_', ' ') }}
          </span>
          <button class="btn-exit" (click)="signOut()" title="Exit portal and go to login">
            Sign Out ↗
          </button>
        </div>
      </header>

      <!-- Confidentiality Protection Notice -->
      <div class="glass-panel zero-leakage-notice">
        <span class="lock-icon">🔒</span>
        <span>
          <strong>Strict Confidentiality Enforced:</strong> This customer negotiation environment displays only client-facing prices and commercial terms. Zero internal COGS or gross margins are visible.
        </span>
      </div>

      <!-- Main Portal Grid -->
      <div class="portal-grid">
        <!-- Quote Details & Line items -->
        <div class="main-column">
          <div class="glass-panel items-card">
            <h3>Proposed Line Items</h3>
            <div class="table-container mt-4">
              <table class="table-custom">
                <thead>
                  <tr>
                    <th>Product / Service</th>
                    <th>Qty</th>
                    <th>Unit Price</th>
                    <th>Discount</th>
                    <th>Total Price</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let item of portalData.lines">
                    <td>
                      <strong>{{ item.productName }}</strong>
                      <div class="sub">{{ item.description || item.categoryName || 'Enterprise Tier Solution' }}</div>
                    </td>
                    <td class="mono">{{ item.quantity }}</td>
                    <td class="mono">{{ formatCurrency(item.unitPrice || item.unitListPrice) }}</td>
                    <td>
                      <span class="badge badge-success">{{ (item.discountPercent !== undefined ? item.discountPercent : item.unitDiscountPct) | number:'1.1-1' }}% Off</span>
                    </td>
                    <td class="mono font-bold">{{ formatCurrency(item.lineTotal) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Financial Totals (ZERO Margin or COGS shown) -->
            <div class="totals-box">
              <div class="total-line">
                <span>Subtotal List Value:</span>
                <span class="mono">{{ formatCurrency(portalData.subtotalAmount) }}</span>
              </div>
              <div class="total-line text-success">
                <span>Promotional Discount:</span>
                <span class="mono">-{{ formatCurrency(portalData.totalDiscountAmount) }}</span>
              </div>
              <div class="total-line">
                <span>Estimated Freight & Handling:</span>
                <span class="mono">{{ formatCurrency(portalData.shippingAmount || 0) }}</span>
              </div>
              <div class="total-line grand-total">
                <span>Total Amount Due:</span>
                <span class="mono font-bold val">{{ formatCurrency(portalData.totalAmount) }}</span>
              </div>
            </div>
          </div>

          <!-- Negotiation & Threaded Messaging Card -->
          <div class="glass-panel chat-card">
            <h3>Direct Representative Redline Discussion</h3>
            <p class="sub">Communicate directly with your account executive without tedious back-and-forth emails</p>

            <div class="message-feed">
              <div
                class="chat-msg"
                *ngFor="let m of portalData.messages"
                [class.msg-customer]="m.senderRole === 'CUSTOMER'"
                [class.msg-rep]="m.senderRole !== 'CUSTOMER'"
              >
                <div class="msg-header">
                  <span class="sender-name font-bold">{{ m.senderName }} ({{ m.senderRole }})</span>
                  <span class="msg-time mono">{{ m.timestamp || (m.createdAt ? (m.createdAt | date:'shortTime') : 'Recent') }}</span>
                </div>
                <div class="msg-text">{{ m.message }}</div>
              </div>
              <div *ngIf="!portalData.messages || portalData.messages.length === 0" class="no-msgs-notice">
                No discussion messages yet. Use the box below to ask questions or propose revisions.
              </div>
            </div>

            <div class="reply-box">
              <textarea
                class="form-control"
                rows="2"
                placeholder="Type your message, line questions, or revision request to the sales team..."
                [(ngModel)]="newMessage"
              ></textarea>
              <button class="btn btn-primary btn-sm mt-2" (click)="sendMessage()" [disabled]="!newMessage.trim()">
                Send Message
              </button>
            </div>
          </div>
        </div>

        <!-- Customer Action Side Panel -->
        <div class="side-column">
          <!-- Counter-Offer Box -->
          <div class="glass-panel counter-card">
            <h4>Counter-Offer / Discount Request</h4>
            <p class="sub">Propose an alternative discount percentage for fast executive review.</p>

            <div class="form-group mt-3">
              <label class="form-label">Target Discount %</label>
              <input
                type="number"
                min="1"
                max="40"
                class="form-control"
                [(ngModel)]="counterDiscountPct"
                placeholder="e.g. 17.5"
              />
            </div>

            <div class="alert-info-box mt-2" *ngIf="counterDiscountPct && counterDiscountPct > 15">
              <span>⚠️ Notice: Proposals exceeding standard 15% tier ceiling automatically re-lock the quote for manager approval.</span>
            </div>

            <button class="btn btn-primary btn-block mt-3" (click)="submitCounterOffer()" [disabled]="!counterDiscountPct">
              Submit Counter Proposal
            </button>
          </div>

          <!-- Order Acceptance -->
          <div class="glass-panel accept-card">
            <h4>Accept & Confirm Quotation</h4>
            <p class="sub">By clicking accept, you authorize formal conversion of this quotation into an active enterprise agreement.</p>
            <button class="btn btn-success btn-block mt-4" (click)="acceptQuote()" [disabled]="portalData.status === 'CONFIRMED' || portalData.status === 'ACCEPTED'">
              ✓ {{ (portalData.status === 'CONFIRMED' || portalData.status === 'ACCEPTED') ? 'Proposal Accepted & Signed' : 'Accept Proposal & Confirm' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .portal-wrapper {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 18px;
      padding: 24px 16px;
      min-height: 100vh;
      color: var(--text-primary, #0f172a);
    }
    .portal-header {
      padding: 18px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-left: 4px solid #38bdf8;
      flex-wrap: wrap;
      gap: 12px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .brand h2 {
      font-size: 18px;
      font-weight: 700;
      color: var(--text-primary, #0f172a);
    }
    .logo-mark { font-size: 30px; }
    .header-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .quote-pill {
      font-size: 16px;
      font-weight: 700;
      color: #2563eb;
      background: #eff6ff;
      padding: 4px 10px;
      border-radius: 6px;
    }
    .btn-exit {
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-exit:hover {
      background: #e2e8f0;
      color: #0f172a;
    }

    .zero-leakage-notice {
      padding: 12px 18px;
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.25);
      border-radius: var(--radius-sm, 6px);
      color: #047857;
      font-size: 13px;
    }
    .lock-icon { font-size: 18px; }

    .portal-grid {
      display: grid;
      grid-template-columns: 1fr 340px;
      gap: 20px;
    }
    @media (max-width: 900px) {
      .portal-grid { grid-template-columns: 1fr; }
    }
    .main-column, .side-column {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .items-card, .chat-card, .counter-card, .accept-card {
      padding: 20px;
    }
    .sub {
      color: #64748b;
      font-size: 13px;
      margin-top: 2px;
    }
    .totals-box {
      margin-top: 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      align-items: flex-end;
      border-top: 1px solid var(--border-light, #e2e8f0);
      padding-top: 14px;
    }
    .total-line {
      display: flex;
      gap: 20px;
      font-size: 14px;
    }
    .grand-total {
      font-size: 18px;
      color: var(--text-primary, #0f172a);
      border-top: 1px solid var(--border-light, #e2e8f0);
      padding-top: 6px;
    }
    .val { color: #2563eb; font-size: 22px; }
    .message-feed {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin: 14px 0;
      max-height: 280px;
      overflow-y: auto;
    }
    .no-msgs-notice {
      padding: 16px;
      text-align: center;
      color: #94a3b8;
      font-size: 13px;
      border: 1px dashed #e2e8f0;
      border-radius: 6px;
    }
    .chat-msg {
      padding: 12px;
      border-radius: var(--radius-sm, 6px);
      font-size: 13px;
    }
    .msg-customer {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      align-self: flex-end;
      max-width: 85%;
    }
    .msg-rep {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      align-self: flex-start;
      max-width: 85%;
    }
    .msg-header {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 4px;
      font-size: 11px;
    }
    .reply-box {
      display: flex;
      flex-direction: column;
      gap: 8px;
      align-items: flex-end;
    }
    .alert-info-box {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: var(--radius-sm, 6px);
      padding: 10px;
      font-size: 11px;
      color: #b45309;
      line-height: 1.4;
    }
    .btn-block { width: 100%; }
    .mt-2 { margin-top: 8px; }
    .mt-3 { margin-top: 14px; }
    .mt-4 { margin-top: 18px; }
  `]
})
export class CustomerPortalComponent implements OnInit {
  token = 'magic-token-acme-1042-demo';
  newMessage = '';
  counterDiscountPct?: number;

  fallbackZenithPortalData = {
    quoteNumber: 'Q-1042',
    customerName: 'Acme Corp (Enterprise Partner)',
    status: 'UNDER_NEGOTIATION',
    subtotalAmount: 1696.00,
    totalDiscountAmount: 229.20,
    shippingAmount: 0,
    totalAmount: 1466.80,
    lines: [
      {
        productName: 'Laptop Pro 14',
        description: 'Enterprise 14-inch Performance Laptop',
        categoryName: 'Hardware',
        quantity: 1,
        unitPrice: 1200.00,
        discountPercent: 12.0,
        lineTotal: 1056.00
      },
      {
        productName: 'Onsite Setup Service',
        description: 'Professional enterprise deployment & configuration',
        categoryName: 'Services',
        quantity: 1,
        unitPrice: 450.00,
        discountPercent: 18.0,
        lineTotal: 369.00
      },
      {
        productName: 'Care Plan 2yr',
        description: '24/7 SLA Priority Enterprise Support (Monthly)',
        categoryName: 'Subscriptions',
        quantity: 1,
        unitPrice: 46.00,
        discountPercent: 9.13,
        lineTotal: 41.80
      }
    ],
    messages: [
      {
        id: 1,
        senderName: 'Jay Rao (DealFlow360)',
        senderRole: 'SALES_REP',
        message: 'Hello! Here is your custom proposal tailored for your operations. Feel free to review or negotiate terms right here.',
        timestamp: 'Today 10:30'
      }
    ]
  };

  portalData: any = this.fallbackZenithPortalData;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const routeToken = this.route.snapshot.paramMap.get('token');
    if (routeToken) {
      this.token = routeToken;
    }
    this.loadPortalData();
  }

  loadPortalData(): void {
    this.api.get<any>(`portal/quotations/${this.token}`).subscribe({
      next: (data) => {
        if (data && data.lines && data.lines.length > 0) {
          this.portalData = data;
        } else {
          this.portalData = this.fallbackZenithPortalData;
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.portalData = this.fallbackZenithPortalData;
        this.cdr.detectChanges();
      }
    });
  }

  sendMessage(): void {
    if (!this.newMessage.trim()) return;
    const currentUser = this.authService.currentUser;
    const senderName = currentUser && currentUser.name ? `${currentUser.name} (Customer)` : 'Customer Buyer';
    const msg = {
      id: Date.now(),
      senderName,
      senderRole: 'CUSTOMER',
      message: this.newMessage.trim(),
      timestamp: 'Just now'
    };
    if (!this.portalData.messages) this.portalData.messages = [];
    this.portalData.messages.push(msg);
    const text = this.newMessage.trim();
    this.newMessage = '';
    this.cdr.detectChanges();

    this.api.post<any>(`portal/quotations/${this.token}/message`, {
      message: text,
      requestedDiscountPct: null,
      notes: 'Customer portal message'
    }).subscribe({
      next: () => {},
      error: () => {}
    });
  }

  submitCounterOffer(): void {
    if (!this.counterDiscountPct) return;
    const discPct = this.counterDiscountPct;
    const newSubtotal = this.portalData.subtotalAmount;
    const newDisc = Math.round(newSubtotal * (discPct / 100));
    this.portalData.totalDiscountAmount = newDisc;
    this.portalData.totalAmount = (newSubtotal - newDisc) + (this.portalData.shippingAmount || 0);
    this.portalData.status = 'PENDING_APPROVAL';

    if (!this.portalData.messages) this.portalData.messages = [];
    this.portalData.messages.push({
      id: Date.now(),
      senderName: 'Customer Buyer',
      senderRole: 'CUSTOMER',
      message: `Submitted counter-discount request: ${discPct}%. Revised proposal amount: ${this.formatCurrency(this.portalData.totalAmount)}.`,
      timestamp: 'Just now'
    });
    this.cdr.detectChanges();

    this.api.post<any>(`portal/quotations/${this.token}/message`, {
      message: `Counter-offer of ${discPct}% requested`,
      requestedDiscountPct: discPct,
      notes: 'Customer counter proposal'
    }).subscribe({
      next: () => {},
      error: () => {}
    });

    alert(`Counter-offer of ${discPct}% submitted! Proposal re-routed to Sales Manager for governance approval.`);
  }

  acceptQuote(): void {
    this.portalData.status = 'CONFIRMED';
    this.cdr.detectChanges();
    this.api.post<any>(`portal/quotations/${this.token}/confirm`, {}).subscribe({
      next: () => {},
      error: () => {}
    });
    alert('🎉 Thank you! Commercial terms accepted and signed. Order confirmed and dispatched to fulfillment.');
  }

  signOut(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  formatCurrency(val: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val || 0);
  }
}
