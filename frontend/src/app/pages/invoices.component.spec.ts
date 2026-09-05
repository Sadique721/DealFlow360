import { TestBed } from '@angular/core/testing';
import { InvoicesComponent, InvoiceItem } from './invoices.component';
import { ApiService } from '../services/api.service';
import { of } from 'rxjs';

describe('InvoicesComponent', () => {
  let component: InvoicesComponent;
  let mockApiService: any;

  beforeEach(() => {
    mockApiService = {
      get: vi.fn(),
      post: vi.fn()
    };

    TestBed.configureTestingModule({
      imports: [InvoicesComponent],
      providers: [
        { provide: ApiService, useValue: mockApiService }
      ]
    });

    const fixture = TestBed.createComponent(InvoicesComponent);
    component = fixture.componentInstance;
  });

  it('should initialize and load invoices from backend', () => {
    const mockData = [
      {
        id: 1,
        invoiceNumber: 'INV-2026-0001',
        quoteId: 'Q-2026-0045',
        customerName: 'Tata Consultancy',
        amount: 5000.00,
        status: 'PAID',
        deliveryStatus: 'PAID',
        issuedDate: '2026-09-01',
        dueDate: '2026-10-01',
        salesRep: 'Jay Rao'
      },
      {
        id: 2,
        invoiceNumber: 'INV-2026-0002',
        quoteId: 'Q-2026-0046',
        customerName: 'Infosys Ltd',
        amount: 2500.00,
        status: 'UNPAID',
        deliveryStatus: 'SHIPPED',
        issuedDate: '2026-09-02',
        dueDate: '2026-10-02',
        salesRep: 'Samir Patel'
      }
    ];

    mockApiService.get.mockReturnValue(of(mockData));

    component.ngOnInit();

    expect(component.invoices.length).toBe(2);
    expect(component.invoices[0].id).toBe('INV-2026-0001');
    expect(component.invoices[0].status).toBe('PAID');
    expect(component.invoices[1].status).toBe('PENDING');

    // Verify summary computation
    expect(component.summary[0].value).toBe('$7.5K'); // Total: 7500
    expect(component.summary[1].value).toBe('$5.0K'); // Paid: 5000
    expect(component.summary[2].value).toBe('$2.5K'); // Pending: 2500
  });

  it('should successfully call backend to record payment', () => {
    const invoiceItem: InvoiceItem = {
      id: 'INV-2026-0002',
      dbId: 2,
      quoteId: 'Q-2026-0046',
      customer: 'Infosys Ltd',
      amount: 2500.00,
      status: 'PENDING',
      deliveryStatus: 'SHIPPED',
      issuedDate: '2026-09-02',
      dueDate: '2026-10-02',
      salesRep: 'Samir Patel'
    };

    mockApiService.post.mockReturnValue(of({ status: 'PAID' }));
    // Stub global alert
    window.alert = vi.fn();

    component.invoices = [invoiceItem];
    component.recordPayment(invoiceItem);

    expect(mockApiService.post).toHaveBeenCalledWith('invoices/2/pay', {});
    expect(invoiceItem.status).toBe('PAID');
    expect(invoiceItem.deliveryStatus).toBe('PAID');
  });
});
