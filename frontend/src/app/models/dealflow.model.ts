export interface User {
  id: number;
  name: string;
  email: string;
  role?: 'ADMIN' | 'SALES_REP' | 'SALES_MANAGER' | 'FINANCE' | 'CUSTOMER' | string;
  team?: string;
  active?: boolean;
}

export interface CustomerTierRequest {
  tierName: string;
  maxDiscountPercent: number;
  description?: string;
}

export interface CustomerTier {
  id?: number;
  tierName?: string;
  code?: string;
  minAnnualSpend?: number;
  maxDiscountPercent?: number;
  maxDiscountFloorPct?: number;
  freightDiscountPct?: number;
  defaultDiscountPct?: number;
  maxAllowedDiscountPct?: number;
  description?: string;
}

export interface CustomerRequest {
  name: string;
  tier: string;
  email: string;
  contactPerson?: string;
  phone?: string;
  address?: string;
  portalUserId?: number;
}

export interface Customer {
  id: number;
  name: string;
  tier: any;
  tierMaxDiscount?: number;
  email?: string;
  contactPerson?: string;
  phone?: string;
  address?: string;
  portalUserId?: number;
  code?: string;
  companyName?: string;
  contactEmail?: string;
  shippingAddress?: string;
  destinationRegion?: string;
  createdAt?: string;
}

export interface ApprovalChainRequest {
  minScore: number;
  maxScore: number;
  requiredLevel: 'MANAGER' | 'MANAGER_THEN_FINANCE' | string;
  description?: string;
}

export interface ApprovalChainRule {
  id: number;
  minScore: number;
  maxScore: number;
  requiredLevel: 'MANAGER' | 'MANAGER_THEN_FINANCE' | string;
  description?: string;
}

export interface CategoryRequest {
  name: string;
  maxDiscountPercent: number;
  sensitivityGamma?: number;
  description?: string;
}

export interface Category {
  id: number;
  name: string;
  maxDiscountPercent?: number;
  maxDiscountCeilingPct?: number;
  sensitivityGamma?: number;
  standardMarginTargetPct?: number;
  code?: string;
  description?: string;
}

export interface ProductRequest {
  name: string;
  categoryId: number;
  basePrice: number;
  costPrice?: number;
  unitOfMeasure?: string;
  taxPercentage?: number;
  isSubscription?: boolean;
  recurringInterval?: string;
  stockOnHand?: number;
  active?: boolean;
  description?: string;
}

export interface Product {
  id: number;
  name: string;
  sku?: string;
  type?: 'HARDWARE' | 'SOFTWARE_SUBSCRIPTION' | 'SERVICE' | 'SUBSCRIPTION' | string;
  categoryId?: number;
  categoryName?: string;
  categoryMaxDiscount?: number;
  basePrice: number;
  costPrice?: number;
  unitCost?: number;
  unitOfMeasure?: string;
  taxPercentage?: number;
  isSubscription?: boolean;
  recurringInterval?: string;
  stockOnHand?: number;
  weightKg?: number;
  category?: Category;
  billingFrequency?: string;
  prorationUnit?: string;
  description?: string;
  active?: boolean;
  createdAt?: string;
}

export interface PriceListRequest {
  customerTier: string;
  currency?: string;
  discountAdjustmentPercent: number;
}

export interface PriceList {
  id: number;
  customerTier: string;
  currency: string;
  discountAdjustmentPercent: number;
}

export interface LineItemRequest {
  id?: number;
  productId: number;
  quantity: number;
  unitPrice?: number;
  discountPercent?: number;
  lineType?: string;
  subscriptionPlanId?: number;
}

export interface QuotationCreateRequest {
  customerId: number;
  salesRepId?: number;
  promisedDeliveryDate?: string;
  lines: LineItemRequest[];
}

export interface QuotationCalculateRequest {
  customerId?: number;
  lines: LineItemRequest[];
}

export interface CalculatedLineResponse {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  discountPercent: number;
  discountAmount: number;
  netPrice: number;
  taxPercent: number;
  taxAmount: number;
  lineTotal: number;
  lineCost: number;
  marginAmount: number;
  marginPercentage: number;
  overagePoints: number;
  status: string; // OK, OVER
  lineType: string;
}

export interface QuotationCalculateResponse {
  subtotalAmount: number;
  totalDiscountAmount: number;
  taxAmount: number;
  totalAmount: number;
  totalCost: number;
  totalMarginAmount: number;
  marginPercentage: number;
  blendedRiskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  requiresApproval: boolean;
  requiresFinance: boolean;
  explanation: string;
  lines: CalculatedLineResponse[];
}

export interface QuotationLine {
  id?: number;
  product: Product;
  quantity: number;
  unitPrice?: number;
  unitListPrice?: number;
  costPrice?: number;
  lineCost?: number;
  discountPercent?: number;
  unitDiscountPct?: number;
  unitDiscountAmount?: number;
  unitFinalPrice?: number;
  lineTotal: number;
  marginAmount?: number;
  lineMarginPct?: number;
  lineType?: string; // ONE_TIME, RECURRING
  subscriptionPlanId?: number;
  overagePoints?: number;
  status?: string; // OK, OVER
  requiresLineApproval?: boolean;
  approvalReason?: string;
}

export interface Quotation {
  id: number;
  quoteNumber: string;
  customer: Customer;
  salesRep: User;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'RETURNED' | 'SENT_TO_CUSTOMER' | 'UNDER_NEGOTIATION' | 'CONFIRMED' | 'ACCEPTED' | 'FULFILLED' | 'REJECTED' | 'CANCELLED' | string;
  subtotalAmount: number;
  totalDiscountAmount: number;
  blendedDiscountPct: number;
  totalAmount: number;
  totalCost?: number;
  totalCostAmount?: number;
  totalMarginAmount?: number;
  marginPercentage?: number;
  marginPct: number;
  blendedRiskScore?: number;
  riskScore: number;
  riskSeverity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  version?: number;
  portalToken?: string;
  portalAccessToken?: string;
  promisedDeliveryDate?: string;
  requiresManagerApproval?: boolean;
  requiresFinanceApproval?: boolean;
  shippingAmount?: number;
  taxAmount?: number;
  lines: QuotationLine[];
  lastActivityAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LineOverageDetail {
  productName: string;
  lineTotal: number;
  revenueWeightPct: number;
  appliedDiscountPct: number;
  allowedThresholdPct: number;
  overagePoints?: number;
  overagePct?: number;
  weightedContribution?: number;
  isCulprit?: boolean;
}

export interface RiskCalculationResult {
  blendedDiscountPct?: number;
  overallMarginPct?: number;
  blendedRiskScore?: number;
  riskScore?: number;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  riskSeverity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  strictestThresholdPct?: number;
  requiresApproval?: boolean;
  requiresFinance?: boolean;
  requiresManagerApproval?: boolean;
  requiresFinanceApproval?: boolean;
  fullExplanation?: string;
  approvalRoutingDescription?: string;
  lineDetails?: LineOverageDetail[];
  culpritLineDetails?: LineOverageDetail[];
}

export interface ApprovalStep {
  id: number;
  level: string;
  requiredRole?: string;
  approverRole?: string;
  approver?: User;
  approverName?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RETURNED' | 'MODIFICATION_REQUESTED' | string;
  stepOrder?: number;
  slaDeadline?: string;
  comments?: string;
  assignedAt?: string;
  actedAt?: string;
  decidedAt?: string;
}

export interface ApprovalRequest {
  id: number;
  quotation: Quotation;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RETURNED' | 'MODIFICATION_REQUESTED' | 'AUTO_APPROVED' | string;
  currentStage?: string;
  currentLevel?: string;
  maxLevel?: string;
  blendedRiskScore?: number;
  riskLevel?: string;
  explanation?: string;
  culpritLineBreakdownJson?: string;
  steps: ApprovalStep[];
  requiredTier?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Warehouse {
  id: number;
  name: string;
  code?: string;
  location?: string;
  locationCity?: string;
  region?: string;
  baseFreight?: number;
  baseFreightCost?: number;
  shippingCostWeight?: number;
  weightRatePerKg?: number;
  leadTimeDays?: number;
}

export interface FulfillmentSplit {
  id: number;
  quotationId?: number;
  warehouse: Warehouse;
  productId?: number;
  product?: Product;
  productName?: string;
  quantity?: number;
  allocatedQuantity?: number;
  backorderedQuantity?: number;
  isBackorder?: boolean;
  estimatedCost?: number;
  estimatedFreightCost?: number;
  shipmentGroup?: string;
  leadTimeDays?: number;
  status: 'ALLOCATED' | 'BACKORDERED' | 'DISPATCHED' | 'DELIVERED' | 'SHIPPED' | string;
}

export interface FulfillmentPlan {
  id: number;
  quotationId?: number;
  quotation?: Quotation;
  status: 'OPTIMIZED' | 'PARTIALLY_ALLOCATED' | 'FULFILLED' | 'PENDING' | 'SPLIT_PENDING' | 'OVERRIDDEN' | string;
  totalShippingCost?: number;
  totalFreightCost?: number;
  shipmentCount?: number;
  totalLeadTimeDays?: number;
  allLinesSatisfied?: boolean;
  splits: FulfillmentSplit[];
  createdAt?: string;
  updatedAt?: string;
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
  discountOverridePct?: number;
  discountPct?: number;
  revenueImpact?: number;
  projectedRevenueIncrease?: number;
  marginImpactPct?: number;
  explanation?: string;
}

export interface SubscriptionContract {
  id: number;
  contractNumber?: string;
  customer?: Customer;
  customerName?: string;
  customerTier?: string;
  quotation?: Quotation;
  quotationLineId?: number;
  planName: string;
  cycle?: 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | string;
  billingFrequency?: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | string;
  quantity?: number;
  seatsCount?: number;
  amount?: number;
  unitSeatPrice?: number;
  monthlyRecurringRevenue?: number;
  annualContractValue?: number;
  startDate: string;
  nextBillDate?: string;
  nextRenewalDate?: string;
  status: 'ACTIVE' | 'PENDING_PRORATION' | 'RENEWING' | 'IN_GRACE' | 'CANCELED' | 'CANCELLED' | string;
  prorationAmountAvailable?: number;
  creditNoteId?: string;
  schedules?: BillingSchedule[];
}

export interface SubscriptionPlan {
  id?: number;
  name: string;
  billingCycle: 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | string;
  basePrice: number;
  defaultProrationRule?: string;
  cancellationRule?: string;
  active?: boolean;
}

export interface BillingSchedule {
  id?: number;
  subscriptionId?: number;
  quotationLineId?: number;
  billingDate: string;
  amount: number;
  status: 'PENDING' | 'INVOICED' | 'PAID' | string;
  prorationFactor?: number;
  prorationNote?: string;
  invoiceId?: number;
}

export interface ProrationPreview {
  subscriptionId: number;
  oldQuantity: number;
  newQuantity: number;
  quantityDelta: number;
  daysRemaining: number;
  totalCycleDays: number;
  prorationFactor: number;
  adjustmentAmount: number;
  isCreditNote: boolean;
  explanation: string;
}

export interface BillingOverview {
  quotationId: number;
  quoteNumber: string;
  totalAmount: number;
  oneTimeTotal: number;
  recurringTotal: number;
  oneTimeLines: QuotationLine[];
  recurringLines: QuotationLine[];
  subscriptions?: SubscriptionContract[];
}

