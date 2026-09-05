import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { FulfillmentPlan, FulfillmentSplit, Warehouse, WarehouseStock } from '../models/dealflow.model';

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

  getWarehouseById(id: number): Observable<Warehouse> {
    return this.api.get<Warehouse>(`fulfillments/warehouses/${id}`);
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

  getStocks(warehouseId?: number): Observable<WarehouseStock[]> {
    const url = warehouseId ? `fulfillments/stocks?warehouseId=${warehouseId}` : 'fulfillments/stocks';
    return this.api.get<WarehouseStock[]>(url);
  }

  createInventory(req: { warehouseId: number; productId: number; inStock: number; reserved?: number; reorderLevel?: number }): Observable<WarehouseStock> {
    return this.api.post<WarehouseStock>('fulfillments/stocks', req);
  }

  updateInventory(id: number, req: { inStock?: number; reserved?: number; reorderLevel?: number }): Observable<WarehouseStock> {
    return this.api.put<WarehouseStock>(`fulfillments/stocks/${id}`, req);
  }

  deleteInventory(id: number): Observable<void> {
    return this.api.delete<void>(`fulfillments/stocks/${id}`);
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
