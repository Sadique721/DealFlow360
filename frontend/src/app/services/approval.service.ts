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
    return this.api.get<ApprovalRequest[]>('approvals/pending');
  }

  getRequestForQuotation(quoteId: number): Observable<ApprovalRequest> {
    return this.api.get<ApprovalRequest>(`approvals/quotation/${quoteId}`);
  }

  processDecision(requestId: number, action: 'APPROVE' | 'REJECT' | 'REQUEST_MODIFICATION', comments: string): Observable<any> {
    return this.api.post<any>(`approvals/${requestId}/action`, { action, comments });
  }
}
