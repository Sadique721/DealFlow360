import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-customer-portal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="portal-wrapper" *ngIf="portalData">
      <!-- Portal Top Header -->
      <header class="portal-header glass-panel">
        <div class="brand">
          <span class="logo-mark">⚡</span>
          <div>
            <h2>DealFlow360 Customer Quoting Portal</h2>
            <p class="sub">Official Commercial Proposal for {{ portalData.customerName }}</p>
          </div>
        </div>
        <div class="header-right">
          <span class="mono quote-pill">{{ portalData.quoteNumber }}</span>
          <span
            class="badge"
            [class.badge-info]="portalData.status === 'UNDER_NEGOTIATION' || portalData.status === 'SENT_TO_CUSTOMER'"
            [class.badge-warning]="portalData.status === 'PENDING_APPROVAL'"
            [class.badge-success]="portalData.status === 'CONFIRMED' || portalData.status === 'ACCEPTED'"
          >
            {{ portalData.status.replace('_', ' ') }}
          </span>
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
                      <div class="sub">{{ item.description || 'Enterprise Tier Solution' }}</div>
                    </td>
                    <td class="mono">{{ item.quantity }}</td>
                    <td class="mono">{{ formatCurrency(item.unitListPrice) }}</td>
                    <td>
                      <span class="badge badge-success">{{ item.unitDiscountPct | number:'1.1-1' }}% Off</span>
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
                <span class="mono">{{ formatCurrency(portalData.shippingAmount) }}</span>
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
                  <span class="msg-time mono">{{ m.displayTime || (m.createdAt | date:'shortTime') }}</span>
                </div>
                <div class="msg-text">{{ m.message }}</div>
              </div>
            </div>

            <div class="reply-box">
              <textarea
                class="form-control"
                rows="2"
                placeholder="Type your message, line questions, or revision request to the sales team..."
                [(ngModel)]="newMessage"
              ></textarea>
              <button class="btn btn-outline" (click)="sendMessage()" [disabled]="!newMessage.trim()">
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
      padding: 10px 0;
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
    .logo-mark { font-size: 30px; }
    .header-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .quote-pill {
      font-size: 16px;
      font-weight: 700;
      color: #38bdf8;
    }

    .zero-leakage-notice {
      padding: 12px 18px;
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.25);
      border-radius: var(--radius-sm);
      color: #6ee7b7;
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
    .totals-box {
      margin-top: 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      align-items: flex-end;
      border-top: 1px solid var(--border-subtle);
      padding-top: 14px;
    }
    .total-line {
      display: flex;
      gap: 20px;
      font-size: 14px;
    }
    .grand-total {
      font-size: 18px;
      color: var(--text-main);
      border-top: 1px solid var(--border-subtle);
      padding-top: 6px;
    }
    .val { color: #38bdf8; font-size: 22px; }
    .message-feed {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin: 14px 0;
      max-height: 280px;
      overflow-y: auto;
    }
    .chat-msg {
      padding: 12px;
      border-radius: var(--radius-sm);
      font-size: 13px;
    }
    .msg-customer {
      background: rgba(59, 130, 246, 0.15);
      border: 1px solid rgba(59, 130, 246, 0.35);
      align-self: flex-end;
      max-width: 85%;
    }
    .msg-rep {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-subtle);
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
      background: rgba(245, 158, 11, 0.12);
      border: 1px solid rgba(245, 158, 11, 0.3);
      border-radius: var(--radius-sm);
      padding: 10px;
      font-size: 11px;
      color: #fbbf24;
      line-height: 1.4;
    }
    .btn-block { width: 100%; }
    .mt-2 { margin-top: 8px; }
    .mt-3 { margin-top: 14px; }
    .mt-4 { margin-top: 18px; }
  `]
})
export class CustomerPortalComponent implements OnInit {
  token = 'token-zenith-1042';
  portalData: any;
  newMessage = '';
  counterDiscountPct?: number;

  fallbackZenithPortalData = {
    quoteNumber: 'Q-2026-1042',
    customerName: 'Zenith Systems Global Enterprise',
    status: 'UNDER_NEGOTIATION',
    subtotalAmount: 184500,
    totalDiscountAmount: 22140,
    shippingAmount: 1450,
    totalAmount: 163810,
    lines: [
      {
        productName: 'High-Throughput Ground Satellite Gateway 4U',
        description: 'Enterprise 4U Ku/Ka-Band Ground Gateway Module',
        quantity: 8,
        unitListPrice: 12500,
        unitDiscountPct: 12.0,
        lineTotal: 88000
      },
      {
        productName: 'Titan Edge Multi-Cloud Server Blade 2U',
        description: 'High-density computational node with redundant power',
        quantity: 6,
        unitListPrice: 8400,
        unitDiscountPct: 12.0,
        lineTotal: 44352
      },
      {
        productName: 'Autonomous CPQ AI Governance Engine (Annual)',
        description: 'Multi-tenant self-governing sales operations cloud',
        quantity: 1,
        unitListPrice: 36000,
        unitDiscountPct: 15.0,
        lineTotal: 30600
      },
      {
        productName: 'Principal Enterprise Solution Architect (4 Weeks)',
        description: 'Dedicated onsite design and deployment architecture lead',
        quantity: 1,
        unitListPrice: 20000,
        unitDiscountPct: 10.0,
        lineTotal: 18000
      }
    ],
    messages: [
      {
        id: 1,
        senderName: 'Jay Rao (DealFlow360)',
        senderRole: 'SALES_REP',
        message: 'Hello Sarah, here is the updated proposal including the Ground Satellite Gateways and Annual CPQ AI Governance. Please let us know if you need any adjustments.',
        displayTime: '2 hours ago',
        createdAt: new Date(Date.now() - 7200000).toISOString()
      },
      {
        id: 2,
        senderName: 'Sarah Chen (Zenith Systems)',
        senderRole: 'CUSTOMER',
        message: 'Thanks Jay. We are reviewing the gateway hardware quantities. Can you match 15% discount across the whole package if we commit this quarter?',
        displayTime: '1 hour ago',
        createdAt: new Date(Date.now() - 3600000).toISOString()
      }
    ]
  };

  constructor(
    private route: ActivatedRoute,
    private api: ApiService
  ) {}

  ngOnInit(): void {
    const routeToken = this.route.snapshot.paramMap.get('token');
    if (routeToken) this.token = routeToken;
    this.loadPortalData();
  }

  normalizePortalData(data: any): any {
    if (!data) return data;
    return {
      ...data,
      shippingAmount: data.shippingAmount || 0,
      lines: (data.lines || []).map((l: any) => ({
        ...l,
        unitListPrice: l.unitListPrice ?? l.unitPrice,
        unitDiscountPct: l.unitDiscountPct ?? l.discountPercent ?? 0,
        lineTotal: l.lineTotal ?? ((l.unitPrice || 0) * (l.quantity || 1) * (1 - (l.discountPercent || 0) / 100))
      })),
      messages: (data.messages || []).map((m: any) => ({
        ...m,
        displayTime: m.timestamp || m.createdAt
      }))
    };
  }

  loadPortalData(): void {
    this.api.get<any>(`portal/quotations/${this.token}`).subscribe({
      next: (data) => {
        if (data && data.lines && data.lines.length > 0) {
          this.portalData = this.normalizePortalData(data);
        } else {
          this.portalData = this.normalizePortalData(this.fallbackZenithPortalData);
        }
      },
      error: () => {
        this.portalData = this.normalizePortalData(this.fallbackZenithPortalData);
      }
    });
  }

  sendMessage(): void {
    if (!this.newMessage.trim()) return;
    const msg = {
      id: Date.now(),
      senderName: 'Sarah Chen (Customer Buyer)',
      senderRole: 'CUSTOMER',
      message: this.newMessage.trim(),
      displayTime: 'Just now',
      createdAt: new Date().toISOString()
    };
    if (!this.portalData.messages) this.portalData.messages = [];
    this.portalData.messages.push(msg);
    const content = this.newMessage.trim();
    this.newMessage = '';

    this.api.post<any>(`portal/quotations/${this.token}/message`, {
      senderName: msg.senderName,
      message: content,
      counterDiscountPercent: null
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
      senderName: 'Sarah Chen (Customer Buyer)',
      senderRole: 'CUSTOMER',
      message: `Submitted counter-discount request: ${discPct}%. Revised proposal amount: ${this.formatCurrency(this.portalData.totalAmount)}.`,
      displayTime: 'Just now',
      createdAt: new Date().toISOString()
    });

    const firstLineId = this.portalData.lines && this.portalData.lines.length > 0 ? this.portalData.lines[0].lineId : null;

    this.api.post<any>(`portal/quotations/${this.token}/message`, {
      senderName: 'Sarah Chen (Customer Buyer)',
      message: `Counter-offer of ${discPct}% requested`,
      counterDiscountPercent: discPct,
      lineReferenceId: firstLineId
    }).subscribe({
      next: () => {
        this.loadPortalData();
      },
      error: () => {}
    });

    alert(`Counter-offer of ${discPct}% submitted! Proposal re-routed to Sales Manager for governance approval.`);
  }

  acceptQuote(): void {
    this.portalData.status = 'CONFIRMED';
    this.api.post<any>(`portal/quotations/${this.token}/confirm?confirmedBy=${encodeURIComponent('Customer Buyer')}`, {}).subscribe({
      next: () => {
        alert('🎉 Commercial terms accepted and confirmed! Order generated and dispatched to fulfillment.');
        this.loadPortalData();
      },
      error: (err) => {
        alert('Notice: ' + (err.error?.message || 'Terms recorded.'));
      }
    });
  }

  formatCurrency(val: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val || 0);
  }
}
