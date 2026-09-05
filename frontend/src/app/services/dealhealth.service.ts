import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { DealHealthFlag, DashboardMetrics } from '../models/dealflow.model';

@Injectable({
  providedIn: 'root'
})
export class DealHealthService {
  constructor(private api: ApiService) {}

  getActiveFlags(): Observable<DealHealthFlag[]> {
    return this.api.get<DealHealthFlag[]>('deal-health/flags');
  }

  nudgeRep(flagId: number): Observable<any> {
    return this.api.post<any>(`deal-health/flags/${flagId}/nudge`, {});
  }

  escalateFlag(flagId: number): Observable<any> {
    return this.api.post<any>(`deal-health/flags/${flagId}/escalate`, {});
  }

  resolveFlag(flagId: number, notes?: string): Observable<any> {
    return this.api.post<any>(`deal-health/flags/${flagId}/resolve`, { notes });
  }

  getDashboardMetrics(): Observable<DashboardMetrics> {
    return this.api.get<DashboardMetrics>('reporting/dashboard');
  }
}
