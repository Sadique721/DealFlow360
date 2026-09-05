import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Invoice } from '../models/dealflow.model';

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {
  constructor(private api: ApiService) {}

  getInvoices(status?: string): Observable<Invoice[]> {
    return this.api.get<Invoice[]>('invoices', status ? { status } : undefined);
  }

  getInvoiceById(id: number): Observable<Invoice> {
    return this.api.get<Invoice>(`invoices/${id}`);
  }

  getInvoicesForQuotation(quotationId: number): Observable<Invoice[]> {
    return this.api.get<Invoice[]>(`invoices/quotation/${quotationId}`);
  }

  generateInvoice(quotationId: number, invoiceType: string = 'ONE_TIME', amount?: number): Observable<Invoice> {
    let url = `invoices/quotation/${quotationId}/generate?invoiceType=${invoiceType}`;
    if (amount !== undefined) {
      url += `&amount=${amount}`;
    }
    return this.api.post<Invoice>(url, {});
  }

  recordPayment(id: number): Observable<Invoice> {
    return this.api.post<Invoice>(`invoices/${id}/pay`, {});
  }

  updateDeliveryStatus(id: number, deliveryStatus: string): Observable<Invoice> {
    return this.api.post<Invoice>(`invoices/${id}/delivery-status?deliveryStatus=${deliveryStatus}`, {});
  }
}
