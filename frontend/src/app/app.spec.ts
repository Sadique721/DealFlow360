import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])]
    }).compileComponents();
  });

  it('should create the executive shell app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
    expect(app.currentRole).toBe('ADMIN');
  });

  it('should switch personas dynamically for hackathon judges', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.switchRole('SALES_REP', 'Jay Rao (Sales Rep)');
    expect(app.currentRole).toBe('SALES_REP');
    expect(app.currentUser).toBe('Jay Rao (Sales Rep)');
  });

  it('should render brand logo with DealFlow360', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.brand-name')?.textContent).toContain('DealFlow');
    expect(compiled.querySelector('.brand-name')?.textContent).toContain('360');
  });
});
