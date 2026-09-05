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
          <span class="badge badge-info">{{ portalData.status }}</span>
        </div>
      </header>

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
                      <div class="sub">{{ item.description || 'Enterprise Tier' }}</div>
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
                <span>Subtotal:</span>
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
            <h3>Discussion & Negotiation Thread</h3>
            <div class="message-feed">
              <div
                class="chat-msg"
                *ngFor="let m of portalData.messages"
                [class.msg-customer]="m.senderRole === 'CUSTOMER'"
                [class.msg-rep]="m.senderRole !== 'CUSTOMER'"
              >
                <div class="msg-header">
                  <span class="sender-name font-bold">{{ m.senderName }} ({{ m.senderRole }})</span>
                  <span class="msg-time mono">{{ m.createdAt | date:'short' }}</span>
                </div>
                <div class="msg-text">{{ m.message }}</div>
              </div>
              <div class="empty-feed" *ngIf="!portalData.messages || portalData.messages.length === 0">
                No discussion messages yet. Use the box below to ask questions or submit feedback.
              </div>
            </div>

            <div class="reply-box">
              <textarea
                class="form-control"
                rows="2"
                placeholder="Type your message or request to the sales team..."
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
            <p class="sub">Propose an alternative discount percentage for commercial review.</p>

            <div class="form-group mt-3">
              <label class="form-label">Target Discount %</label>
              <input
                type="number"
                min="0"
                max="50"
                class="form-control"
                [(ngModel)]="counterDiscountPct"
                placeholder="e.g. 18.5"
              />
            </div>

            <div class="alert-info-box" *ngIf="counterDiscountPct != null && counterDiscountPct > 15">
              <span>⚠️ Note: Requests exceeding standard customer tier ceilings automatically trigger internal manager re-approval.</span>
            </div>

            <button class="btn btn-outline btn-block mt-3" (click)="submitCounterOffer()" [disabled]="!counterDiscountPct">
              Submit Counter Proposal
            </button>
          </div>

          <!-- Order Acceptance -->
          <div class="glass-panel accept-card">
            <h4>Accept & Confirm Quotation</h4>
            <p class="sub">By clicking accept, you authorize conversion of this quotation into a formal sales agreement.</p>
            <button class="btn btn-success btn-block mt-4" (click)="acceptQuote()">
              ✓ Accept Proposal & Confirm
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
      gap: 20px;
      padding: 20px;
    }
    .portal-header {
      padding: 18px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-left: 4px solid var(--brand-primary);
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
      max-height: 300px;
      overflow-y: auto;
    }
    .chat-msg {
      padding: 12px;
      border-radius: var(--radius-sm);
      font-size: 13px;
    }
    .msg-customer {
      background: rgba(59, 130, 246, 0.12);
      border: 1px solid rgba(59, 130, 246, 0.3);
      align-self: flex-end;
      max-width: 80%;
    }
    .msg-rep {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-subtle);
      align-self: flex-start;
      max-width: 80%;
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
    .mt-3 { margin-top: 12px; }
    .mt-4 { margin-top: 16px; }
  `]
})
export class CustomerPortalComponent implements OnInit {
  token = '';
  portalData: any;
  newMessage = '';
  counterDiscountPct?: number;

  constructor(
    private route: ActivatedRoute,
    private api: ApiService
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') || 'token-zenith-1042';
    this.loadPortalData();
  }

  loadPortalData(): void {
    this.api.get<any>(`portal/${this.token}`).subscribe({
      next: (data) => this.portalData = data,
      error: (err) => console.error('Error loading portal', err)
    });
  }

  sendMessage(): void {
    if (!this.newMessage.trim()) return;
    this.api.post<any>(`portal/${this.token}/messages`, {
      message: this.newMessage,
      senderName: this.portalData.customerName,
      senderRole: 'CUSTOMER'
    }).subscribe({
      next: () => {
        this.newMessage = '';
        this.loadPortalData();
      },
      error: (err) => alert('Error sending: ' + err.message)
    });
  }

  submitCounterOffer(): void {
    if (!this.counterDiscountPct) return;
    this.api.post<any>(`portal/${this.token}/counter-offer`, {
      requestedDiscountPct: this.counterDiscountPct,
      notes: 'Customer proposed counter-offer via portal'
    }).subscribe({
      next: () => {
        alert('Counter-offer submitted to account executive for review!');
        this.loadPortalData();
      },
      error: (err) => alert('Error submitting: ' + err.message)
    });
  }

  acceptQuote(): void {
    this.api.post<any>(`portal/${this.token}/accept`, {}).subscribe({
      next: () => {
        alert('Thank you! Proposal accepted and confirmed.');
        this.loadPortalData();
      },
      error: (err) => alert('Error: ' + err.message)
    });
  }

  formatCurrency(val: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);
  }
}
