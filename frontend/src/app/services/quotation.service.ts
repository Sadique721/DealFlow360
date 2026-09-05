import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Quotation, RiskCalculationResult, Product, Customer, UpsellSuggestion } from '../models/dealflow.model';

@Injectable({
  providedIn: 'root'
})
export class QuotationService {
  constructor(private api: ApiService) {}

  getQuotations(status?: string): Observable<Quotation[]> {
    return this.api.get<Quotation[]>('quotations', status ? { status } : undefined);
  }

  getQuotationById(id: number): Observable<Quotation> {
    return this.api.get<Quotation>(`quotations/${id}`);
  }

  createQuotation(quoteData: any): Observable<Quotation> {
    return this.api.post<Quotation>('quotations', quoteData);
  }

  updateQuotation(id: number, quoteData: any): Observable<Quotation> {
    return this.api.put<Quotation>(`quotations/${id}`, quoteData);
  }

  calculateRisk(id: number): Observable<RiskCalculationResult> {
    return this.api.get<RiskCalculationResult>(`quotations/${id}/risk-breakdown`);
  }

  submitForApproval(id: number): Observable<any> {
    return this.api.post<any>(`quotations/${id}/submit-approval`, {});
  }

  confirmQuotation(id: number): Observable<any> {
    return this.api.post<any>(`quotations/${id}/confirm`, {});
  }

  getUpsellSuggestions(id: number): Observable<UpsellSuggestion[]> {
    return this.api.get<UpsellSuggestion[]>(`upsells/quotation/${id}`);
  }

  applyUpsell(id: number, ruleId: number): Observable<any> {
    return this.api.post<any>(`upsells/apply?quotationId=${id}&ruleId=${ruleId}`, {});
  }
}
