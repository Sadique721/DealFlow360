import { Routes } from '@angular/router';
import { PipelineComponent } from './pages/pipeline.component';
import { QuoteBuilderComponent } from './pages/quote-builder.component';
import { ApprovalCenterComponent } from './pages/approval-center.component';
import { WarehouseSplitComponent } from './pages/warehouse-split.component';
import { DealHealthComponent } from './pages/deal-health.component';
import { CustomerPortalComponent } from './pages/customer-portal.component';

export const routes: Routes = [
  { path: '', redirectTo: 'pipeline', pathMatch: 'full' },
  { path: 'pipeline', component: PipelineComponent },
  { path: 'quote/new', component: QuoteBuilderComponent },
  { path: 'quote/:id', component: QuoteBuilderComponent },
  { path: 'approval/:id', component: ApprovalCenterComponent },
  { path: 'fulfillment/:id', component: WarehouseSplitComponent },
  { path: 'deal-health', component: DealHealthComponent },
  { path: 'portal/:token', component: CustomerPortalComponent },
  { path: '**', redirectTo: 'pipeline' }
];
