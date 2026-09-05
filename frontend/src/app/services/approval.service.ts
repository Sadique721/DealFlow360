import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApprovalRequest } from '../models/dealflow.model';

@Injectable({
  providedIn: 'root'
})
export class ApprovalService {
  constructor(private api: ApiService) {}

  getPendingRequests(): Observable<ApprovalRequest[]> {
    return this.api.get<ApprovalRequest[]>('approvals');
  }

  getRequestForQuotation(quoteId: number): Observable<any> {
    return this.api.get<any>(`approvals/quotation/${quoteId}`);
  }

  processDecision(quotationId: number, action: 'APPROVE' | 'REJECT' | 'RETURN' | 'REQUEST_MODIFICATION', comments: string, stepId?: number): Observable<any> {
    const backendAction = action === 'REQUEST_MODIFICATION' ? 'RETURN' : action;
    return this.api.post<any>('approvals/act', { quotationId, stepId, action: backendAction, comments });
  }

  actOnApproval(payload: { quotationId: number; stepId?: number; action: string; comments?: string }): Observable<any> {
    return this.api.post<any>('approvals/act', payload);
  }
}

