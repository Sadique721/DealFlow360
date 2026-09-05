import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';

describe('AuthService Role Filtering', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthService, provideHttpClient()]
    });
    service = TestBed.inject(AuthService);
    localStorage.clear();
  });

  it('should grant full pipeline visibility to ADMIN, SALES_MANAGER, and FINANCE', () => {
    const quotes = [
      { id: 1, quoteNumber: 'Q-001', status: 'DRAFT' },
      { id: 2, quoteNumber: 'Q-002', status: 'PENDING_APPROVAL' },
      { id: 3, quoteNumber: 'Q-003', status: 'UNDER_NEGOTIATION' },
      { id: 4, quoteNumber: 'Q-004', status: 'APPROVED' }
    ];

    // Test ADMIN
    (service as any)._role$.next('ADMIN');
    expect(service.filterQuotationsByRole(quotes).length).toBe(4);

    // Test SALES_MANAGER
    (service as any)._role$.next('SALES_MANAGER');
    expect(service.filterQuotationsByRole(quotes).length).toBe(4);

    // Test FINANCE
    (service as any)._role$.next('FINANCE');
    expect(service.filterQuotationsByRole(quotes).length).toBe(4);
  });

  it('should scope quotations for SALES_REP strictly to assigned deals', () => {
    const user = { id: 2, name: 'Jay Rao', email: 'j.rao@dealflow360.com', role: 'SALES_REP' };
    (service as any)._user$.next(user);
    (service as any)._role$.next('SALES_REP');

    const quotes = [
      { id: 1, quoteNumber: 'Q-001', salesRep: { id: 2, email: 'j.rao@dealflow360.com', name: 'Jay Rao' } },
      { id: 2, quoteNumber: 'Q-002', salesRep: { id: 3, email: 's.patel@dealflow360.com', name: 'Samir Patel' } },
      { id: 3, quoteNumber: 'Q-003', salesRepId: 2 }
    ];

    const filtered = service.filterQuotationsByRole(quotes);
    expect(filtered.length).toBe(2);
    expect(filtered.map(q => q.id)).toEqual([1, 3]);
  });
});
