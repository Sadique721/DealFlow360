import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  Quotation,
  RiskCalculationResult,
  UpsellSuggestion,
  QuotationCreateRequest,
  LineItemRequest,
  QuotationCalculateRequest,
  QuotationCalculateResponse
} from '../models/dealflow.model';

@Injectable({
  providedIn: 'root'
})
export class QuotationService {
  constructor(private api: ApiService) {}

  getQuotations(params?: { repId?: number; status?: string }): Observable<Quotation[]> {
    return this.api.get<Quotation[]>('quotations', params);
  }

  getQuotationById(id: number): Observable<Quotation> {
    return this.api.get<Quotation>(`quotations/${id}`);
  }

  calculatePreview(req: QuotationCalculateRequest): Observable<QuotationCalculateResponse> {
    return this.api.post<QuotationCalculateResponse>('quotations/calculate', req);
  }

  createQuotation(quoteData: QuotationCreateRequest): Observable<Quotation> {
    return this.api.post<Quotation>('quotations', quoteData);
  }

  updateQuotationLines(id: number, lines: LineItemRequest[]): Observable<Quotation> {
    return this.api.put<Quotation>(`quotations/${id}/lines`, lines);
  }

  submitForApproval(id: number): Observable<any> {
    return this.api.post<any>(`quotations/${id}/submit`, {});
  }

  confirmQuotation(id: number): Observable<Quotation> {
    return this.api.post<Quotation>(`quotations/${id}/confirm`, {});
  }

  cancelQuotation(id: number): Observable<Quotation> {
    return this.api.post<Quotation>(`quotations/${id}/cancel`, {});
  }

  calculateRisk(id: number): Observable<RiskCalculationResult> {
    return this.api.get<RiskCalculationResult>(`quotations/${id}/risk-breakdown`);
  }

  getVersions(id: number): Observable<any[]> {
    return this.api.get<any[]>(`quotations/${id}/versions`);
  }

  getUpsellSuggestions(id: number): Observable<UpsellSuggestion[]> {
    return this.api.get<UpsellSuggestion[]>(`quotations/${id}/upsell-suggestions`);
  }

  applyUpsell(id: number, ruleId: number): Observable<any> {
    return this.api.post<any>(`upsells/apply?quotationId=${id}&ruleId=${ruleId}`, {});
  }

  actOnApproval(id: number, action: 'APPROVE' | 'REJECT' | 'RETURN', comments: string): Observable<any> {
    return this.api.post<any>(`quotations/${id}/approval/act`, {
      quotationId: id,
      action,
      comments
    });
  }

  getMessages(id: number): Observable<any[]> {
    return this.api.get<any[]>(`quotations/${id}/messages`);
  }

  sendMessage(id: number, message: string): Observable<any> {
    return this.api.post<any>(`quotations/${id}/messages`, { message });
  }
}

