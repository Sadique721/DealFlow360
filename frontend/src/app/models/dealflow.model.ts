export interface User {
  id: number;
  name: string;
  email: string;
  role?: 'ADMIN' | 'SALES_REP' | 'SALES_MANAGER' | 'FINANCE' | 'CUSTOMER' | string;
  team?: string;
  active?: boolean;
}

export interface CustomerTier {
  id?: number;
  tierName: string;
  code?: string;
  minAnnualSpend?: number;
  maxDiscountFloorPct?: number;
  freightDiscountPct?: number;
  defaultDiscountPct?: number;
  maxAllowedDiscountPct?: number;
}

export interface Customer {
  id: number;
  name: string;
  code?: string;
  companyName?: string;
  email?: string;
  contactEmail?: string;
  phone?: string;
  shippingAddress?: string;
  destinationRegion?: string;
  tier: CustomerTier | string;
}

export function getCustomerTierName(customer?: Customer | null): string {
  if (!customer || !customer.tier) return 'STANDARD';
  if (typeof customer.tier === 'string') return customer.tier;
  return customer.tier.tierName || 'STANDARD';
}

export interface Category {
  id: number;
  name: string;
  code: string;
  maxDiscountCeilingPct: number;
  standardMarginTargetPct: number;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  type?: 'HARDWARE' | 'SOFTWARE_SUBSCRIPTION' | 'SERVICE' | 'SUBSCRIPTION' | string;
  basePrice: number;
  costPrice?: number;
  unitCost: number;
  weightKg?: number;
  category?: Category;
  billingFrequency?: string;
  prorationUnit?: string;
  isSubscription?: boolean;
}

export interface QuotationLine {
  id?: number;
  product: Product;
  quantity: number;
  unitPrice?: number;
  unitListPrice: number;
  discountPercent?: number;
  unitDiscountPct: number;
  discountAmount?: number;
  unitDiscountAmount: number;
  unitFinalPrice: number;
  lineTotal: number;
  costPrice?: number;
  lineCost: number;
  marginAmount?: number;
  lineMarginPct: number;
  lineType?: string;
  requiresLineApproval?: boolean;
  approvalReason?: string;
  overagePoints?: number;
  status?: string;
}

export interface Quotation {
  id: number;
  quoteNumber: string;
  customer: Customer;
  salesRep: User;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'SENT_TO_CUSTOMER' | 'UNDER_NEGOTIATION' | 'CONFIRMED' | 'ACCEPTED' | 'FULFILLED' | 'REJECTED' | string;
  subtotalAmount: number;
  totalDiscountAmount: number;
  blendedDiscountPct: number;
  shippingAmount?: number;
  taxAmount?: number;
  totalAmount: number;
  totalCost?: number;
  totalCostAmount?: number;
  totalMarginAmount?: number;
  marginPct: number;
  marginPercentage?: number;
  riskScore: number;
  blendedRiskScore?: number;
  riskSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  requiresManagerApproval?: boolean;
  requiresFinanceApproval?: boolean;
  promisedDeliveryDate?: string;
  portalAccessToken?: string;
  portalToken?: string;
  version?: number;
  lastActivityAt?: string;
  lines: QuotationLine[];
  createdAt?: string;
  updatedAt?: string;
}

export interface LineOverageDetail {
  productName: string;
  lineTotal: number;
  revenueWeightPct: number;
  appliedDiscountPct: number;
  allowedThresholdPct: number;
  overagePct: number;
  weightedContribution: number;
}

export interface RiskCalculationResult {
  blendedDiscountPct: number;
  overallMarginPct: number;
  riskScore: number;
  riskSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  strictestThresholdPct: number;
  requiresManagerApproval: boolean;
  requiresFinanceApproval: boolean;
  approvalRoutingDescription: string;
  culpritLineDetails: LineOverageDetail[];
}

export interface ApprovalStep {
  id: number;
  level: string;
  approverRole: string;
  approver?: User;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'MODIFICATION_REQUESTED' | 'RETURNED';
  stepOrder: number;
  slaDeadline?: string;
  comments?: string;
  decidedAt?: string;
}

export interface ApprovalRequest {
  id: number;
  quotation: Quotation;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'MODIFICATION_REQUESTED' | 'RETURNED';
  currentLevel?: string;
  currentStage?: string;
  maxLevel?: string;
  culpritLineBreakdownJson?: string;
  steps: ApprovalStep[];
  requiredTier?: string;
}

export interface Warehouse {
  id: number;
  name: string;
  code: string;
  locationCity?: string;
  city?: string;
  region: string;
  baseFreightCost?: number;
  baseFreight?: number;
  weightRatePerKg?: number;
  shippingCostWeight?: number;
  leadTimeDays: number;
}

export interface FulfillmentSplit {
  id: number;
  quotationId?: number;
  warehouse: Warehouse;
  product?: Product;
  productId?: number;
  productName?: string;
  quantity?: number;
  allocatedQuantity?: number;
  backorderedQuantity?: number;
  isBackorder?: boolean;
  estimatedCost?: number;
  estimatedFreightCost?: number;
  leadTimeDays?: number;
  shipmentGroup?: string;
  status: 'ALLOCATED' | 'BACKORDERED' | 'DISPATCHED' | 'DELIVERED' | 'SHIPPED' | string;
}

export interface FulfillmentPlan {
  id: number;
  quotationId: number;
  status: 'OPTIMIZED' | 'PARTIALLY_ALLOCATED' | 'FULFILLED' | 'ACCEPTED' | 'OVERRIDDEN' | string;
  totalFreightCost?: number;
  totalCost?: number;
  totalLeadTimeDays?: number;
  allLinesSatisfied?: boolean;
  hasBackorder?: boolean;
  summaryText?: string;
  splits: FulfillmentSplit[];
}

export interface DealHealthFlag {
  id: number;
  quotation: Quotation;
  flagType: 'STALLED' | 'DISCOUNT_ANOMALY' | 'DELIVERY_SLIPPAGE' | 'SLA_BREACH' | 'STATISTICAL_DISCOUNT_OUTLIER' | 'STAGE_RESIDENCE_STALL' | 'MARGIN_DECAY_ANOMALY' | string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  description: string;
  resolved?: boolean;
  actionTaken?: string;
  detectedAt: string;
}

export interface DashboardMetrics {
  totalPipelineValue: number;
  activeQuotationsCount: number;
  pendingApprovalsCount: number;
  activeAnomaliesCount: number;
  averageMarginPct: number;
  discountZScoreAverage: number;
  monthlyRevenue: number;
}

export interface UpsellSuggestion {
  id?: number;
  ruleId?: number;
  ruleName?: string;
  recommendedProduct?: Product;
  suggestedProduct?: Product;
  benefitDescription?: string;
  promoTag?: string;
  promoDiscountPercent?: number;
  discountOverridePct?: number;
  discountPct?: number;
  revenueImpact?: number;
  projectedRevenueIncrease?: number;
  marginImpactPct?: number;
  marginDelta?: number;
  simulatedNewMarginPercentage?: number;
  coPurchaseScore?: number;
  rationale?: string;
  explanation?: string;
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
  quotation?: Quotation;
  quotationId?: number;
  customer?: Customer;
  customerName?: string;
  invoiceType: 'ONE_TIME' | 'RECURRING' | 'CREDIT_NOTE' | string;
  amount: number;
  status: 'UNPAID' | 'PAID' | 'VOID' | string;
  dueDate: string;
  paidAt?: string;
  deliveryStatus: 'ORDER_CONFIRMED' | 'SHIPPED' | 'INVOICED' | 'PAID' | string;
  createdAt: string;
}

export interface Subscription {
  id: number;
  customer: Customer;
  quotation: Quotation;
  quotationLineId?: number;
  planName: string;
  cycle: 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | string;
  startDate: string;
  nextBillDate: string;
  amount: number;
  quantity: number;
  status: 'ACTIVE' | 'PAUSED' | 'CANCELED' | string;
  schedules?: any[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SubscriptionContract {
  id: number;
  contractNumber?: string;
  customerName: string;
  customerTier?: string;
  planName: string;
  billingFrequency: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | string;
  seatsCount: number;
  unitSeatPrice: number;
  monthlyRecurringRevenue: number;
  annualContractValue: number;
  startDate: string;
  nextRenewalDate: string;
  status: 'ACTIVE' | 'PENDING_PRORATION' | 'RENEWING' | 'IN_GRACE' | 'CANCELLED' | string;
  prorationAmountAvailable?: number;
  creditNoteId?: string;
}
