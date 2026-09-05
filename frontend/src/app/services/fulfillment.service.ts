import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { FulfillmentPlan, FulfillmentSplit, Warehouse } from '../models/dealflow.model';

@Injectable({
  providedIn: 'root'
})
export class FulfillmentService {
  constructor(private api: ApiService) {}

  getPlanForQuotation(quoteId: number): Observable<FulfillmentPlan> {
    return this.api.get<FulfillmentPlan>(`fulfillments/quotation/${quoteId}`);
  }

  recomputePlan(quoteId: number): Observable<FulfillmentPlan> {
    return this.api.post<FulfillmentPlan>(`fulfillments/quotation/${quoteId}/recompute`, {});
  }

  acceptPlan(planId: number): Observable<FulfillmentPlan> {
    return this.api.post<FulfillmentPlan>(`fulfillments/${planId}/accept`, {});
  }

  overridePlan(planId: number, manualSplits: FulfillmentSplit[], reason: string = 'Manual logistics override'): Observable<FulfillmentPlan> {
    return this.api.post<FulfillmentPlan>(`fulfillments/${planId}/override?reason=${encodeURIComponent(reason)}`, manualSplits);
  }

  getWarehouses(): Observable<Warehouse[]> {
    return this.api.get<Warehouse[]>('fulfillments/warehouses');
  }

  createWarehouse(warehouse: Partial<Warehouse>): Observable<Warehouse> {
    return this.api.post<Warehouse>('fulfillments/warehouses', warehouse);
  }

  updateWarehouse(id: number, warehouse: Partial<Warehouse>): Observable<Warehouse> {
    return this.api.put<Warehouse>(`fulfillments/warehouses/${id}`, warehouse);
  }

  deleteWarehouse(id: number): Observable<void> {
    return this.api.delete<void>(`fulfillments/warehouses/${id}`);
  }

  getStocks(warehouseId?: number): Observable<any[]> {
    const url = warehouseId ? `fulfillments/stocks?warehouseId=${warehouseId}` : 'fulfillments/stocks';
    return this.api.get<any[]>(url);
  }

  setStock(warehouseId: number, productId: number, inStock: number, reorderLevel?: number): Observable<any> {
    let url = `fulfillments/stocks/set?warehouseId=${warehouseId}&productId=${productId}&inStock=${inStock}`;
    if (reorderLevel !== undefined && reorderLevel !== null) {
      url += `&reorderLevel=${reorderLevel}`;
    }
    return this.api.post<any>(url, {});
  }

  addStock(warehouseId: number, productId: number, quantity: number): Observable<any> {
    return this.api.post<any>(`fulfillments/stock/add?warehouseId=${warehouseId}&productId=${productId}&quantity=${quantity}`, {});
  }

  consolidateSplitBackorder(splitId: number): Observable<FulfillmentSplit> {
    return this.api.post<FulfillmentSplit>(`fulfillments/splits/${splitId}/consolidate`, {});
  }
}
