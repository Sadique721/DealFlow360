import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  SubscriptionPlan,
  SubscriptionContract,
  BillingSchedule,
  ProrationPreview,
  BillingOverview
} from '../models/dealflow.model';

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  constructor(private api: ApiService) {}

  // -------------------------------------------------------------
  // Subscription Plans (Admin Catalog)
  // -------------------------------------------------------------
  getPlans(): Observable<SubscriptionPlan[]> {
    return this.api.get<SubscriptionPlan[]>('subscriptions/plans');
  }

  getPlan(id: number): Observable<SubscriptionPlan> {
    return this.api.get<SubscriptionPlan>(`subscriptions/plans/${id}`);
  }

  createPlan(plan: Partial<SubscriptionPlan>): Observable<SubscriptionPlan> {
    return this.api.post<SubscriptionPlan>('subscriptions/plans', plan);
  }

  updatePlan(id: number, plan: Partial<SubscriptionPlan>): Observable<SubscriptionPlan> {
    return this.api.put<SubscriptionPlan>(`subscriptions/plans/${id}`, plan);
  }

  deletePlan(id: number): Observable<void> {
    return this.api.delete<void>(`subscriptions/plans/${id}`);
  }

  // -------------------------------------------------------------
  // Active Subscriptions & Contracts
  // -------------------------------------------------------------
  getSubscriptions(customerId?: number): Observable<SubscriptionContract[]> {
    const url = customerId ? `subscriptions?customerId=${customerId}` : 'subscriptions';
    return this.api.get<SubscriptionContract[]>(url);
  }

  getSubscription(id: number): Observable<SubscriptionContract> {
    return this.api.get<SubscriptionContract>(`subscriptions/${id}`);
  }

  getSchedules(id: number): Observable<BillingSchedule[]> {
    return this.api.get<BillingSchedule[]>(`subscriptions/${id}/schedules`);
  }

  generateFromQuotation(quotationId: number): Observable<SubscriptionContract[]> {
    return this.api.post<SubscriptionContract[]>(`subscriptions/generate-from-quotation/${quotationId}`, {});
  }

  // -------------------------------------------------------------
  // Mid-Cycle Proration & Adjustments
  // -------------------------------------------------------------
  previewProration(id: number, newQuantity: number, changeDate?: string): Observable<ProrationPreview> {
    const url = changeDate
      ? `subscriptions/${id}/preview-proration?newQuantity=${newQuantity}&changeDate=${changeDate}`
      : `subscriptions/${id}/preview-proration?newQuantity=${newQuantity}`;
    return this.api.post<ProrationPreview>(url, {});
  }

  modifySubscription(id: number, newQuantity: number, changeDate?: string): Observable<SubscriptionContract> {
    const url = changeDate
      ? `subscriptions/${id}/modify?newQuantity=${newQuantity}&changeDate=${changeDate}`
      : `subscriptions/${id}/modify?newQuantity=${newQuantity}`;
    return this.api.post<SubscriptionContract>(url, {});
  }

  cancelSubscription(id: number, cancelDate?: string, reason: string = 'Customer requested cancellation'): Observable<SubscriptionContract> {
    let url = `subscriptions/${id}/cancel?reason=${encodeURIComponent(reason)}`;
    if (cancelDate) {
      url += `&cancelDate=${cancelDate}`;
    }
    return this.api.post<SubscriptionContract>(url, {});
  }

  // -------------------------------------------------------------
  // Quotation Hybrid Billing Overview
  // -------------------------------------------------------------
  getBillingOverview(quotationId: number): Observable<BillingOverview> {
    return this.api.get<BillingOverview>(`subscriptions/quotation/${quotationId}/billing-overview`);
  }
}
