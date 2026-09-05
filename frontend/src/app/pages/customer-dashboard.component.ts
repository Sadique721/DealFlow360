import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { of } from 'rxjs';
import { ApiService } from '../services/api.service';
import { AuthService, SessionUser } from '../services/auth.service';
import { generate120Quotations } from '../services/mock-data';

interface CustomerQuote {
  id: number;
  quoteNumber: string;
  status: string;
  totalAmount: number;
  subtotalAmount: number;
  totalDiscountAmount: number;
  shippingAmount: number;
  customerName: string;
  createdAt: string;
  expiresAt?: string;
  lines: any[];
  messages: any[];
  salesRepName?: string;
}

@Component({
  selector: 'app-customer-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DatePipe],
  template: `
    <div class="cust-page">

      <!-- ── Welcome Banner ── -->
      <div class="cust-banner">
        <div class="cust-banner-left">
          <div class="cust-avatar">{{ userInitials }}</div>
          <div>
            <h1 class="cust-welcome">Welcome back, {{ firstName }}!</h1>
            <p class="cust-sub">{{ user?.team || 'Your Company' }} · Customer Account</p>
          </div>
        </div>
        <div class="cust-banner-right">
          <div class="cust-pill">
            <span class="cust-pill-dot"></span>Customer Portal
          </div>
        </div>
      </div>

      <!-- ── KPI Cards (always shown) ── -->
      <div class="cust-kpi-row">
        <div class="cust-kpi">
          <div class="cust-kpi-icon blue">📄</div>
          <div class="cust-kpi-body">
            <div class="cust-kpi-val">{{ myQuotes.length }}</div>
            <div class="cust-kpi-label">My Quotations</div>
          </div>
        </div>
        <div class="cust-kpi">
          <div class="cust-kpi-icon orange">⏳</div>
          <div class="cust-kpi-body">
            <div class="cust-kpi-val">{{ pendingCount }}</div>
            <div class="cust-kpi-label">Awaiting Action</div>
          </div>
        </div>
        <div class="cust-kpi">
          <div class="cust-kpi-icon green">✅</div>
          <div class="cust-kpi-body">
            <div class="cust-kpi-val">{{ confirmedCount }}</div>
            <div class="cust-kpi-label">Confirmed Orders</div>
          </div>
        </div>
        <div class="cust-kpi">
          <div class="cust-kpi-icon purple">💬</div>
          <div class="cust-kpi-body">
            <div class="cust-kpi-val">{{ totalMessages }}</div>
            <div class="cust-kpi-label">Total Messages</div>
          </div>
        </div>
      </div>

      <!-- ── LOADING STATE ── -->
      <div class="cust-loading" *ngIf="isLoading">
        <div class="cust-spinner"></div>
        <p>Loading your quotations…</p>
      </div>

      <!-- ── EMPTY STATE (no quotes assigned) ── -->
      <div class="cust-empty" *ngIf="!isLoading && myQuotes.length === 0">
        <div class="cust-empty-icon">📭</div>
        <h2>No Quotations Yet</h2>
        <p class="cust-empty-sub">
          You don't have any active quotations assigned to your account yet.<br/>
          Your account executive will share a proposal here once it's ready for your review.
        </p>
        <div class="cust-empty-steps">
          <div class="cust-step">
            <div class="cust-step-num">1</div>
            <div>
              <strong>Sales Rep Prepares Your Quote</strong>
              <div class="cust-step-desc">Your DealFlow360 account manager builds a tailored commercial proposal for you.</div>
            </div>
          </div>
          <div class="cust-step">
            <div class="cust-step-num">2</div>
            <div>
              <strong>Quote Sent to Your Portal</strong>
              <div class="cust-step-desc">Once approved internally, the quotation appears right here on your dashboard.</div>
            </div>
          </div>
          <div class="cust-step">
            <div class="cust-step-num">3</div>
            <div>
              <strong>Review, Negotiate &amp; Confirm</strong>
              <div class="cust-step-desc">You can review line items, submit counter-offers and confirm your order — all without email.</div>
            </div>
          </div>
        </div>
        <div class="cust-empty-contact">
          <span>📧</span> Need help? Contact your account executive directly at
          <a href="mailto:sales@dealflow360.com">sales@dealflow360.com</a>
        </div>
      </div>

      <!-- ── QUOTATIONS LIST ── -->
      <div *ngIf="!isLoading && myQuotes.length > 0 && !activeQuote">

        <div class="cust-section-header">
          <h2 class="cust-section-title">My Quotations</h2>
          <span class="cust-count-badge">{{ myQuotes.length }} proposals</span>
        </div>

        <div class="cust-quote-list">
          <div
            class="cust-quote-card"
            *ngFor="let q of myQuotes"
            (click)="openQuote(q)"
          >
            <div class="cust-quote-card-top">
              <div class="cust-quote-num">{{ q.quoteNumber }}</div>
              <span class="cust-status-badge" [ngClass]="statusClass(q.status)">
                {{ statusLabel(q.status) }}
              </span>
            </div>
            <div class="cust-quote-amount">{{ fmt(q.totalAmount) }}</div>
            <div class="cust-quote-meta">
              <span>{{ q.lines?.length || 0 }} line items</span>
              <span class="cust-meta-dot">·</span>
              <span>{{ q.messages?.length || 0 }} messages</span>
              <span class="cust-meta-dot">·</span>
              <span>{{ q.salesRepName || 'Sales Rep' }}</span>
            </div>
            <div class="cust-quote-card-footer">
              <span>Created {{ q.createdAt | date:'mediumDate' }}</span>
              <button class="cust-view-btn">View & Negotiate →</button>
            </div>
          </div>
        </div>
      </div>

      <!-- ── ACTIVE QUOTE NEGOTIATION VIEW ── -->
      <div *ngIf="!isLoading && activeQuote" class="cust-negotiation">

        <!-- Back link -->
        <div class="cust-back-row">
          <button class="cust-back-btn" (click)="closeQuote()">← Back to My Quotations</button>
          <span class="cust-breadcrumb">{{ activeQuote.quoteNumber }}</span>
        </div>

        <!-- Quote Header -->
        <div class="cust-neg-header glass-panel">
          <div class="cust-neg-hdr-left">
            <div class="cust-neg-quote-num">{{ activeQuote.quoteNumber }}</div>
            <div class="cust-neg-customer">{{ activeQuote.customerName }}</div>
            <div class="cust-neg-rep" *ngIf="activeQuote.salesRepName">
              👤 Account Exec: <strong>{{ activeQuote.salesRepName }}</strong>
            </div>
          </div>
          <div class="cust-neg-hdr-right">
            <span class="cust-status-badge lg" [ngClass]="statusClass(activeQuote.status)">
              {{ statusLabel(activeQuote.status) }}
            </span>
            <div class="cust-neg-amount">{{ fmt(activeQuote.totalAmount) }}</div>
          </div>
        </div>

        <!-- Security Notice -->
        <div class="cust-secure-notice">
          🔒 <strong>Confidential:</strong> This view shows your negotiated prices only. Internal cost data is never visible.
        </div>

        <div class="cust-neg-grid">

          <!-- LEFT: Line Items + Messages -->
          <div class="cust-neg-main">

            <!-- Line Items -->
            <div class="glass-panel cust-lines-card">
              <h3 class="cust-card-title">Proposed Line Items</h3>
              <div class="cust-table-wrap">
                <table class="cust-table">
                  <thead>
                    <tr>
                      <th>Product / Service</th>
                      <th>Qty</th>
                      <th>Unit Price</th>
                      <th>Discount</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let item of activeQuote.lines">
                      <td>
                        <strong>{{ item.productName || item.product?.name }}</strong>
                        <div class="cust-td-sub">{{ item.description || item.categoryName || item.product?.category?.name || 'Enterprise Solution' }}</div>
                      </td>
                      <td class="mono">{{ item.quantity }}</td>
                      <td class="mono">{{ fmt(item.unitPrice || item.unitListPrice || item.unitFinalPrice) }}</td>
                      <td>
                        <span class="disc-badge">
                          {{ (item.discountPercent !== undefined ? item.discountPercent : (item.unitDiscountPct || 0)) | number:'1.1-1' }}% off
                        </span>
                      </td>
                      <td class="mono fw-bold">{{ fmt(item.lineTotal) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Totals -->
              <div class="cust-totals">
                <div class="cust-tot-row">
                  <span>Subtotal List Price</span>
                  <span class="mono">{{ fmt(activeQuote.subtotalAmount) }}</span>
                </div>
                <div class="cust-tot-row discount">
                  <span>Your Discount</span>
                  <span class="mono">-{{ fmt(activeQuote.totalDiscountAmount) }}</span>
                </div>
                <div class="cust-tot-row" *ngIf="activeQuote.shippingAmount">
                  <span>Freight &amp; Handling</span>
                  <span class="mono">{{ fmt(activeQuote.shippingAmount) }}</span>
                </div>
                <div class="cust-tot-row grand">
                  <span>Total Amount Due</span>
                  <span class="mono grand-val">{{ fmt(activeQuote.totalAmount) }}</span>
                </div>
              </div>
            </div>

            <!-- Messages -->
            <div class="glass-panel cust-chat-card">
              <h3 class="cust-card-title">💬 Direct Discussion with Sales Team</h3>
              <p class="cust-card-sub">Ask questions or propose changes without any email back-and-forth.</p>
              <div class="cust-messages" #msgFeed>
                <div *ngIf="!activeQuote.messages || activeQuote.messages.length === 0" class="cust-no-msgs">
                  No messages yet. Start the conversation below!
                </div>
                <div
                  *ngFor="let m of activeQuote.messages"
                  class="cust-msg"
                  [class.cust-msg-mine]="m.senderRole === 'CUSTOMER'"
                  [class.cust-msg-theirs]="m.senderRole !== 'CUSTOMER'"
                >
                  <div class="cust-msg-header">
                    <span class="cust-msg-sender">{{ m.senderName }}</span>
                    <span class="cust-msg-time">{{ m.timestamp || m.createdAt || 'Recent' }}</span>
                  </div>
                  <div class="cust-msg-body">{{ m.message }}</div>
                </div>
              </div>
              <div class="cust-reply">
                <textarea
                  class="cust-textarea"
                  rows="2"
                  placeholder="Type a message, ask a question, or request a revision…"
                  [(ngModel)]="newMessage"
                ></textarea>
                <button class="cust-send-btn" (click)="sendMessage()" [disabled]="!newMessage.trim()">
                  Send Message
                </button>
              </div>
            </div>
          </div>

          <!-- RIGHT: Actions -->
          <div class="cust-neg-side">

            <!-- Counter Offer -->
            <div class="glass-panel cust-action-card" *ngIf="activeQuote.status !== 'CONFIRMED' && activeQuote.status !== 'ACCEPTED' && activeQuote.status !== 'CANCELLED'">
              <h4 class="cust-action-title">🔄 Counter-Offer</h4>
              <p class="cust-action-sub">Propose an alternative discount for fast executive review.</p>
              <div class="cust-field">
                <label class="cust-label">Requested Discount %</label>
                <input
                  type="number"
                  class="cust-input"
                  min="1"
                  max="40"
                  placeholder="e.g. 17.5"
                  [(ngModel)]="counterDiscountPct"
                />
              </div>
              <div class="cust-warn-box" *ngIf="counterDiscountPct && counterDiscountPct > 15">
                ⚠️ Proposals over 15% automatically re-route to a sales manager for approval.
              </div>
              <button
                class="cust-btn-primary cust-btn-full"
                [disabled]="!counterDiscountPct"
                (click)="submitCounterOffer()"
              >
                Submit Counter Proposal
              </button>
            </div>

            <!-- Accept -->
            <div class="glass-panel cust-action-card">
              <h4 class="cust-action-title">✅ Accept &amp; Confirm</h4>
              <p class="cust-action-sub">
                {{
                  (activeQuote.status === 'CONFIRMED' || activeQuote.status === 'ACCEPTED')
                    ? 'You have already confirmed this proposal. Your order is being processed.'
                    : 'Accept these commercial terms to convert this quotation into an active order.'
                }}
              </p>
              <button
                class="cust-btn-success cust-btn-full"
                [disabled]="activeQuote.status === 'CONFIRMED' || activeQuote.status === 'ACCEPTED' || activeQuote.status === 'CANCELLED'"
                (click)="acceptQuote()"
              >
                {{
                  (activeQuote.status === 'CONFIRMED' || activeQuote.status === 'ACCEPTED')
                    ? '✓ Proposal Accepted & Signed'
                    : 'Accept Proposal & Confirm'
                }}
              </button>
            </div>

            <!-- Quote Info -->
            <div class="glass-panel cust-action-card">
              <h4 class="cust-action-title">📋 Quote Details</h4>
              <div class="cust-detail-row">
                <span class="cust-detail-label">Quote #</span>
                <span class="cust-detail-val mono">{{ activeQuote.quoteNumber }}</span>
              </div>
              <div class="cust-detail-row">
                <span class="cust-detail-label">Created</span>
                <span class="cust-detail-val">{{ activeQuote.createdAt | date:'mediumDate' }}</span>
              </div>
              <div class="cust-detail-row" *ngIf="activeQuote.expiresAt">
                <span class="cust-detail-label">Expires</span>
                <span class="cust-detail-val warn">{{ activeQuote.expiresAt | date:'mediumDate' }}</span>
              </div>
              <div class="cust-detail-row">
                <span class="cust-detail-label">Status</span>
                <span class="cust-status-badge sm" [ngClass]="statusClass(activeQuote.status)">{{ statusLabel(activeQuote.status) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    :host { display: block; }

    .cust-page {
      padding: 28px 28px 48px;
      max-width: 1280px;
    }

    /* ── Welcome Banner ── */
    .cust-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: linear-gradient(135deg, #1e40af 0%, #0284c7 100%);
      border-radius: 14px;
      padding: 22px 28px;
      margin-bottom: 24px;
      color: #fff;
      flex-wrap: wrap;
      gap: 12px;
    }
    .cust-banner-left {
      display: flex;
      align-items: center;
      gap: 18px;
    }
    .cust-avatar {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: rgba(255,255,255,0.25);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 800;
      flex-shrink: 0;
    }
    .cust-welcome {
      font-size: 20px;
      font-weight: 700;
      color: #fff;
      margin-bottom: 2px;
    }
    .cust-sub {
      font-size: 13px;
      color: rgba(255,255,255,0.75);
    }
    .cust-pill {
      display: flex;
      align-items: center;
      gap: 7px;
      background: rgba(255,255,255,0.2);
      border: 1px solid rgba(255,255,255,0.3);
      border-radius: 20px;
      padding: 6px 14px;
      font-size: 12px;
      font-weight: 600;
      color: #fff;
    }
    .cust-pill-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #86efac;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    /* ── KPI Row ── */
    .cust-kpi-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
      margin-bottom: 28px;
    }
    @media (max-width: 900px) { .cust-kpi-row { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 480px) { .cust-kpi-row { grid-template-columns: 1fr; } }

    .cust-kpi {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 18px 20px;
      display: flex;
      align-items: center;
      gap: 14px;
      transition: box-shadow 0.15s;
    }
    .cust-kpi:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
    .cust-kpi-icon {
      width: 42px;
      height: 42px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      flex-shrink: 0;
    }
    .cust-kpi-icon.blue   { background: #eff6ff; }
    .cust-kpi-icon.orange { background: #fff7ed; }
    .cust-kpi-icon.green  { background: #f0fdf4; }
    .cust-kpi-icon.purple { background: #f5f3ff; }

    .cust-kpi-val {
      font-size: 26px;
      font-weight: 700;
      color: #0f172a;
      line-height: 1;
    }
    .cust-kpi-label {
      font-size: 12px;
      color: #64748b;
      font-weight: 500;
      margin-top: 3px;
    }

    /* ── Loading ── */
    .cust-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 60px;
      color: #64748b;
      gap: 16px;
      font-size: 14px;
    }
    .cust-spinner {
      width: 36px;
      height: 36px;
      border: 3px solid #e2e8f0;
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Empty State ── */
    .cust-empty {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 56px 40px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
    }
    .cust-empty-icon {
      font-size: 56px;
      margin-bottom: 4px;
    }
    .cust-empty h2 {
      font-size: 22px;
      font-weight: 700;
      color: #0f172a;
    }
    .cust-empty-sub {
      font-size: 14px;
      color: #64748b;
      line-height: 1.7;
      max-width: 480px;
    }
    .cust-empty-steps {
      display: flex;
      flex-direction: column;
      gap: 14px;
      margin: 16px 0;
      text-align: left;
      max-width: 500px;
      width: 100%;
    }
    .cust-step {
      display: flex;
      gap: 16px;
      align-items: flex-start;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px 18px;
    }
    .cust-step-num {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #2563eb;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      flex-shrink: 0;
    }
    .cust-step strong { font-size: 14px; color: #0f172a; display: block; margin-bottom: 3px; }
    .cust-step-desc { font-size: 12px; color: #64748b; line-height: 1.5; }
    .cust-empty-contact {
      font-size: 13px;
      color: #64748b;
      margin-top: 8px;
    }
    .cust-empty-contact a {
      color: #2563eb;
      text-decoration: none;
      font-weight: 600;
    }

    /* ── Quote List ── */
    .cust-section-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 16px;
    }
    .cust-section-title {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
    }
    .cust-count-badge {
      background: #eff6ff;
      color: #2563eb;
      border-radius: 20px;
      padding: 3px 10px;
      font-size: 12px;
      font-weight: 600;
    }
    .cust-quote-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 16px;
    }
    .cust-quote-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      cursor: pointer;
      transition: all 0.15s ease;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .cust-quote-card:hover {
      border-color: #93c5fd;
      box-shadow: 0 4px 16px rgba(37,99,235,0.1);
      transform: translateY(-1px);
    }
    .cust-quote-card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .cust-quote-num {
      font-size: 15px;
      font-weight: 700;
      color: #2563eb;
      font-family: monospace;
    }
    .cust-quote-amount {
      font-size: 24px;
      font-weight: 700;
      color: #0f172a;
    }
    .cust-quote-meta {
      font-size: 12px;
      color: #94a3b8;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .cust-meta-dot { color: #cbd5e1; }
    .cust-quote-card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 4px;
      border-top: 1px solid #f1f5f9;
      padding-top: 12px;
      font-size: 12px;
      color: #94a3b8;
    }
    .cust-view-btn {
      background: #2563eb;
      color: #fff;
      border: none;
      border-radius: 6px;
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }
    .cust-view-btn:hover { background: #1d4ed8; }

    /* ── Status Badges ── */
    .cust-status-badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .cust-status-badge.lg { font-size: 13px; padding: 5px 14px; }
    .cust-status-badge.sm { font-size: 10px; padding: 2px 8px; }
    .st-pending   { background: #fff7ed; color: #c2410c; }
    .st-sent      { background: #eff6ff; color: #1d4ed8; }
    .st-negotiation { background: #fef3c7; color: #92400e; }
    .st-approved  { background: #f0fdf4; color: #166534; }
    .st-confirmed { background: #dcfce7; color: #15803d; }
    .st-cancelled { background: #fef2f2; color: #b91c1c; }
    .st-draft     { background: #f1f5f9; color: #475569; }
    .st-default   { background: #f1f5f9; color: #475569; }

    /* ── Negotiation View ── */
    .cust-negotiation { display: flex; flex-direction: column; gap: 18px; }
    .cust-back-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .cust-back-btn {
      background: none;
      border: 1px solid #e2e8f0;
      border-radius: 7px;
      padding: 7px 14px;
      font-size: 13px;
      font-weight: 600;
      color: #2563eb;
      cursor: pointer;
      transition: all 0.15s;
    }
    .cust-back-btn:hover { background: #eff6ff; border-color: #bfdbfe; }
    .cust-breadcrumb {
      font-size: 13px;
      color: #94a3b8;
      font-family: monospace;
    }
    .cust-neg-header {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 22px 24px;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 20px;
      flex-wrap: wrap;
    }
    .cust-neg-quote-num {
      font-size: 22px;
      font-weight: 700;
      color: #2563eb;
      font-family: monospace;
    }
    .cust-neg-customer { font-size: 15px; color: #0f172a; font-weight: 600; margin: 4px 0; }
    .cust-neg-rep { font-size: 13px; color: #64748b; }
    .cust-neg-hdr-right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 10px;
    }
    .cust-neg-amount {
      font-size: 28px;
      font-weight: 800;
      color: #0f172a;
    }
    .cust-secure-notice {
      background: #f0fdf4;
      border: 1px solid #86efac;
      border-radius: 8px;
      padding: 11px 16px;
      font-size: 12px;
      color: #166534;
    }
    .cust-neg-grid {
      display: grid;
      grid-template-columns: 1fr 320px;
      gap: 18px;
      align-items: start;
    }
    @media (max-width: 960px) { .cust-neg-grid { grid-template-columns: 1fr; } }
    .cust-neg-main { display: flex; flex-direction: column; gap: 18px; }
    .cust-neg-side { display: flex; flex-direction: column; gap: 18px; }

    /* Glass panels */
    .glass-panel {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
    }
    .cust-lines-card, .cust-chat-card { padding: 20px; }
    .cust-action-card { padding: 20px; }

    .cust-card-title {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .cust-card-sub { font-size: 12px; color: #64748b; margin-bottom: 12px; }

    /* Table */
    .cust-table-wrap { overflow-x: auto; }
    .cust-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .cust-table th {
      text-align: left;
      padding: 9px 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #64748b;
      border-bottom: 2px solid #f1f5f9;
    }
    .cust-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
      vertical-align: top;
    }
    .cust-table tr:last-child td { border-bottom: none; }
    .cust-td-sub { font-size: 11px; color: #94a3b8; margin-top: 2px; }
    .disc-badge {
      background: #dcfce7;
      color: #166534;
      border-radius: 4px;
      padding: 2px 7px;
      font-size: 11px;
      font-weight: 600;
    }
    .mono { font-family: 'Roboto Mono', monospace; }
    .fw-bold { font-weight: 700; }

    /* Totals */
    .cust-totals {
      border-top: 1px solid #f1f5f9;
      padding-top: 14px;
      margin-top: 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      align-items: flex-end;
    }
    .cust-tot-row {
      display: flex;
      gap: 24px;
      font-size: 13px;
      color: #334155;
    }
    .cust-tot-row.discount { color: #16a34a; }
    .cust-tot-row.grand {
      font-size: 17px;
      font-weight: 700;
      color: #0f172a;
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
      margin-top: 4px;
    }
    .grand-val { color: #2563eb; font-size: 20px; }

    /* Messages */
    .cust-messages {
      max-height: 260px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin: 14px 0;
    }
    .cust-no-msgs {
      text-align: center;
      padding: 20px;
      color: #94a3b8;
      font-size: 13px;
      border: 1px dashed #e2e8f0;
      border-radius: 8px;
    }
    .cust-msg {
      padding: 10px 12px;
      border-radius: 8px;
      font-size: 13px;
      max-width: 88%;
    }
    .cust-msg-mine   { background: #eff6ff; border: 1px solid #bfdbfe; align-self: flex-end; }
    .cust-msg-theirs { background: #f8fafc; border: 1px solid #e2e8f0; align-self: flex-start; }
    .cust-msg-header { display: flex; justify-content: space-between; gap: 10px; margin-bottom: 4px; }
    .cust-msg-sender { font-size: 11px; font-weight: 700; color: #334155; }
    .cust-msg-time   { font-size: 10px; color: #94a3b8; }
    .cust-msg-body   { color: #334155; line-height: 1.5; }

    .cust-reply {
      display: flex;
      flex-direction: column;
      gap: 8px;
      align-items: flex-end;
    }
    .cust-textarea {
      width: 100%;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 13px;
      color: #0f172a;
      resize: vertical;
      transition: border-color 0.15s;
      font-family: inherit;
      box-sizing: border-box;
    }
    .cust-textarea:focus { outline: none; border-color: #93c5fd; box-shadow: 0 0 0 3px rgba(147,197,253,0.2); }
    .cust-send-btn {
      background: #2563eb;
      color: #fff;
      border: none;
      border-radius: 7px;
      padding: 9px 18px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }
    .cust-send-btn:hover:not(:disabled) { background: #1d4ed8; }
    .cust-send-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Action cards */
    .cust-action-title { font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
    .cust-action-sub { font-size: 12px; color: #64748b; margin-bottom: 14px; line-height: 1.5; }
    .cust-field { margin-bottom: 10px; }
    .cust-label { display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 6px; }
    .cust-input {
      width: 100%;
      border: 1px solid #e2e8f0;
      border-radius: 7px;
      padding: 8px 12px;
      font-size: 14px;
      color: #0f172a;
      box-sizing: border-box;
      transition: border-color 0.15s;
    }
    .cust-input:focus { outline: none; border-color: #93c5fd; }
    .cust-warn-box {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 6px;
      padding: 9px 12px;
      font-size: 11px;
      color: #92400e;
      margin-bottom: 10px;
      line-height: 1.4;
    }
    .cust-btn-primary {
      background: #2563eb;
      color: #fff;
      border: none;
      border-radius: 7px;
      padding: 10px 18px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }
    .cust-btn-primary:hover:not(:disabled) { background: #1d4ed8; }
    .cust-btn-success {
      background: #16a34a;
      color: #fff;
      border: none;
      border-radius: 7px;
      padding: 10px 18px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }
    .cust-btn-success:hover:not(:disabled) { background: #15803d; }
    .cust-btn-primary:disabled, .cust-btn-success:disabled { opacity: 0.5; cursor: not-allowed; }
    .cust-btn-full { width: 100%; }

    /* Detail rows */
    .cust-detail-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #f1f5f9;
      font-size: 13px;
    }
    .cust-detail-row:last-child { border-bottom: none; }
    .cust-detail-label { color: #64748b; font-weight: 500; }
    .cust-detail-val { color: #0f172a; font-weight: 600; }
    .cust-detail-val.warn { color: #d97706; }
  `]
})
export class CustomerDashboardComponent implements OnInit, OnDestroy {
  user: SessionUser | null = null;
  firstName = '';
  userInitials = '';

  isLoading = true;
  myQuotes: CustomerQuote[] = [];
  activeQuote: CustomerQuote | null = null;

  newMessage = '';
  counterDiscountPct?: number;

  private subs = new Subscription();

  constructor(
    private authService: AuthService,
    private api: ApiService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.user = this.authService.currentUser;
    const nameParts = (this.user?.name || 'Customer').trim().split(' ');
    this.firstName = nameParts[0];
    this.userInitials = ((nameParts[0]?.[0] || '') + (nameParts[1]?.[0] || '')).toUpperCase() || 'C';

    this.subs.add(
      this.authService.currentUser$.subscribe(u => {
        if (u && u.id > 0) {
          this.user = u;
          const parts = (u.name || '').trim().split(' ');
          this.firstName = parts[0];
          this.userInitials = ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || 'C';
        }
      })
    );

    this.loadMyQuotations();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  get pendingCount(): number {
    return this.myQuotes.filter(q =>
      ['SENT_TO_CUSTOMER', 'UNDER_NEGOTIATION', 'PENDING_APPROVAL'].includes(q.status)
    ).length;
  }

  get confirmedCount(): number {
    return this.myQuotes.filter(q =>
      ['CONFIRMED', 'ACCEPTED'].includes(q.status)
    ).length;
  }

  get totalMessages(): number {
    return this.myQuotes.reduce((sum, q) => sum + (q.messages?.length || 0), 0);
  }

  loadMyQuotations(): void {
    this.isLoading = true;

    // Try the backend API first (with timeout)
    this.api.get<any[]>('quotations', { customerId: this.user?.id }).pipe(
      timeout(4000),
      catchError(() => of(null))
    ).subscribe(data => {
      if (data && data.length > 0) {
        this.myQuotes = this.mapQuotes(data);
      } else {
        // Backend unavailable or no results — show empty state for new customers
        // Only fall back to mock if the customer email matches known mock data
        const mockAll = generate120Quotations();
        const myEmail = this.user?.email?.toLowerCase() || '';
        const myName = this.user?.name?.toLowerCase() || '';
        const matched = mockAll.filter(q =>
          q.customer?.email?.toLowerCase() === myEmail ||
          q.customer?.name?.toLowerCase().includes(myName.split(' ')[0]) ||
          (q as any).customerEmail?.toLowerCase() === myEmail
        );
        this.myQuotes = matched.length > 0 ? this.mapQuotes(matched) : [];
      }
      this.isLoading = false;
      this.cdr.detectChanges();
    });
  }

  private mapQuotes(raw: any[]): CustomerQuote[] {
    return raw.map(q => ({
      id: q.id,
      quoteNumber: q.quoteNumber || q.quote_number || `Q-${String(q.id).padStart(4, '0')}`,
      status: q.status || 'DRAFT',
      totalAmount: q.totalAmount || q.total_amount || 0,
      subtotalAmount: q.subtotalAmount || q.subtotal_amount || q.totalAmount || 0,
      totalDiscountAmount: q.totalDiscountAmount || q.total_discount_amount || 0,
      shippingAmount: q.shippingAmount || q.shipping_amount || 0,
      customerName: q.customer?.name || q.customerName || this.user?.name || 'You',
      createdAt: q.createdAt || q.created_at || new Date().toISOString(),
      expiresAt: q.expiresAt || q.expires_at,
      lines: q.lines || [],
      messages: q.messages || [],
      salesRepName: q.salesRep?.name || q.salesRepName || 'Your Account Executive'
    }));
  }

  openQuote(q: CustomerQuote): void {
    this.activeQuote = q;
    this.newMessage = '';
    this.counterDiscountPct = undefined;
    this.cdr.detectChanges();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  closeQuote(): void {
    this.activeQuote = null;
    this.cdr.detectChanges();
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || !this.activeQuote) return;
    const text = this.newMessage.trim();
    const msg = {
      id: Date.now(),
      senderName: `${this.user?.name || 'Customer'} (Customer)`,
      senderRole: 'CUSTOMER',
      message: text,
      timestamp: 'Just now'
    };
    if (!this.activeQuote.messages) this.activeQuote.messages = [];
    this.activeQuote.messages.push(msg);
    this.newMessage = '';
    this.cdr.detectChanges();

    // Best-effort post to backend
    this.api.post<any>(`quotations/${this.activeQuote.id}/messages`, {
      message: text,
      senderRole: 'CUSTOMER'
    }).pipe(catchError(() => of(null))).subscribe();
  }

  submitCounterOffer(): void {
    if (!this.counterDiscountPct || !this.activeQuote) return;
    const pct = this.counterDiscountPct;
    const newDisc = Math.round((this.activeQuote.subtotalAmount || this.activeQuote.totalAmount) * (pct / 100));
    this.activeQuote.totalDiscountAmount = newDisc;
    this.activeQuote.totalAmount = (this.activeQuote.subtotalAmount - newDisc) + (this.activeQuote.shippingAmount || 0);
    this.activeQuote.status = 'PENDING_APPROVAL';

    const msg = {
      id: Date.now(),
      senderName: `${this.user?.name || 'Customer'} (Customer)`,
      senderRole: 'CUSTOMER',
      message: `Counter-offer submitted: Requesting ${pct}% discount. Revised total: ${this.fmt(this.activeQuote.totalAmount)}.`,
      timestamp: 'Just now'
    };
    this.activeQuote.messages.push(msg);
    this.counterDiscountPct = undefined;
    this.cdr.detectChanges();

    alert(`✅ Counter-offer of ${pct}% submitted! Your request is now pending sales manager review.`);

    this.api.post<any>(`quotations/${this.activeQuote.id}/messages`, {
      message: msg.message,
      requestedDiscountPct: pct,
      senderRole: 'CUSTOMER'
    }).pipe(catchError(() => of(null))).subscribe();
  }

  acceptQuote(): void {
    if (!this.activeQuote) return;
    this.activeQuote.status = 'CONFIRMED';
    this.activeQuote.messages.push({
      id: Date.now(),
      senderName: `${this.user?.name || 'Customer'} (Customer)`,
      senderRole: 'CUSTOMER',
      message: 'Customer confirmed and accepted the quotation terms.',
      timestamp: 'Just now'
    });
    this.cdr.detectChanges();

    alert('🎉 Thank you! Your order is confirmed. Our team will be in touch shortly.');

    this.api.post<any>(`portal/quotations/${this.activeQuote.id}/confirm`, {})
      .pipe(catchError(() => of(null))).subscribe();
  }

  statusClass(status: string): string {
    switch ((status || '').toUpperCase()) {
      case 'DRAFT':                return 'st-draft';
      case 'PENDING_APPROVAL':     return 'st-pending';
      case 'SENT_TO_CUSTOMER':     return 'st-sent';
      case 'UNDER_NEGOTIATION':    return 'st-negotiation';
      case 'APPROVED':             return 'st-approved';
      case 'CONFIRMED':
      case 'ACCEPTED':             return 'st-confirmed';
      case 'CANCELLED':            return 'st-cancelled';
      default:                     return 'st-default';
    }
  }

  statusLabel(status: string): string {
    switch ((status || '').toUpperCase()) {
      case 'DRAFT':             return 'Draft';
      case 'PENDING_APPROVAL':  return 'Pending Approval';
      case 'SENT_TO_CUSTOMER':  return 'Awaiting Review';
      case 'UNDER_NEGOTIATION': return 'Under Negotiation';
      case 'APPROVED':          return 'Approved';
      case 'CONFIRMED':         return 'Confirmed';
      case 'ACCEPTED':          return 'Accepted';
      case 'CANCELLED':         return 'Cancelled';
      default:                  return status || 'Unknown';
    }
  }

  fmt(val: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD', maximumFractionDigits: 0
    }).format(val || 0);
  }
}
