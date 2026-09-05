import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { FulfillmentPlan, Warehouse } from '../models/dealflow.model';

@Injectable({
  providedIn: 'root'
})
export class FulfillmentService {
  constructor(private api: ApiService) {}

  getPlanForQuotation(quoteId: number): Observable<FulfillmentPlan> {
    return this.api.get<FulfillmentPlan>(`fulfillment/quotation/${quoteId}`);
  }

  optimizePlan(quoteId: number): Observable<FulfillmentPlan> {
    return this.api.post<FulfillmentPlan>(`fulfillment/quotation/${quoteId}/optimize`, {});
  }

  consolidateBackorder(quoteId: number): Observable<any> {
    return this.api.post<any>(`fulfillment/quotation/${quoteId}/consolidate-backorder`, {});
  }

  getWarehouses(): Observable<Warehouse[]> {
    return this.api.get<Warehouse[]>('fulfillment/warehouses');
  }
}
