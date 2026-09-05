import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Subscription } from '../models/dealflow.model';

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  constructor(private api: ApiService) {}

  getSubscriptions(customerId?: number): Observable<Subscription[]> {
    return this.api.get<Subscription[]>('subscriptions', customerId ? { customerId } : undefined);
  }

  getSubscriptionById(id: number): Observable<Subscription> {
    return this.api.get<Subscription>(`subscriptions/${id}`);
  }

  getSchedules(id: number): Observable<any[]> {
    return this.api.get<any[]>(`subscriptions/${id}/schedules`);
  }

  getPlans(): Observable<any[]> {
    return this.api.get<any[]>('subscriptions/plans');
  }

  previewProration(id: number, newQuantity: number, changeDate?: string): Observable<any> {
    let url = `subscriptions/${id}/preview-proration?newQuantity=${newQuantity}`;
    if (changeDate) {
      url += `&changeDate=${changeDate}`;
    }
    return this.api.post<any>(url, {});
  }

  modifySubscription(id: number, newQuantity: number, changeDate?: string): Observable<Subscription> {
    let url = `subscriptions/${id}/modify?newQuantity=${newQuantity}`;
    if (changeDate) {
      url += `&changeDate=${changeDate}`;
    }
    return this.api.post<Subscription>(url, {});
  }

  cancelSubscription(id: number, cancelDate?: string, reason?: string): Observable<Subscription> {
    let url = `subscriptions/${id}/cancel?`;
    const params: string[] = [];
    if (cancelDate) params.push(`cancelDate=${cancelDate}`);
    if (reason) params.push(`reason=${encodeURIComponent(reason)}`);
    return this.api.post<Subscription>(url + params.join('&'), {});
  }

  getBillingOverview(quotationId: number): Observable<any> {
    return this.api.get<any>(`subscriptions/quotation/${quotationId}/billing-overview`);
  }
}
