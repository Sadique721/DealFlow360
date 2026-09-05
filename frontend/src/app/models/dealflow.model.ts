export interface User {
  id: number;
  name: string;
  email: string;
  role: 'ADMIN' | 'SALES_REP' | 'SALES_MANAGER' | 'FINANCE' | 'CUSTOMER';
  team?: string;
  active?: boolean;
}

export interface CustomerTier {
  id: number;
  tierName: string;
  code: string;
  minAnnualSpend?: number;
  maxDiscountFloorPct: number;
  freightDiscountPct: number;
}

export interface Customer {
  id: number;
  name: string;
  companyName?: string;
  email: string;
  phone?: string;
  shippingAddress?: string;
  destinationRegion: string;
  tier: CustomerTier;
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
  type: 'HARDWARE' | 'SOFTWARE_SUBSCRIPTION' | 'SERVICE';
  basePrice: number;
  unitCost: number;
  weightKg: number;
  category: Category;
  billingFrequency?: string;
  prorationUnit?: string;
}

export interface QuotationLine {
  id?: number;
  product: Product;
  quantity: number;
  unitListPrice: number;
  unitDiscountPct: number;
  unitDiscountAmount: number;
  unitFinalPrice: number;
  lineTotal: number;
  lineCost: number;
  lineMarginPct: number;
  requiresLineApproval?: boolean;
  approvalReason?: string;
}

export interface Quotation {
  id: number;
  quoteNumber: string;
  customer: Customer;
  salesRep: User;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'SENT_TO_CUSTOMER' | 'UNDER_NEGOTIATION' | 'CONFIRMED' | 'FULFILLED' | 'REJECTED';
  subtotalAmount: number;
  totalDiscountAmount: number;
  blendedDiscountPct: number;
  shippingAmount: number;
  taxAmount: number;
  totalAmount: number;
  totalCostAmount: number;
  marginPct: number;
  riskScore: number;
  riskSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  requiresManagerApproval: boolean;
  requiresFinanceApproval: boolean;
  promisedDeliveryDate?: string;
  portalAccessToken?: string;
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
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'MODIFICATION_REQUESTED';
  stepOrder: number;
  slaDeadline?: string;
  comments?: string;
  decidedAt?: string;
}

export interface ApprovalRequest {
  id: number;
  quotation: Quotation;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'MODIFICATION_REQUESTED';
  currentLevel: string;
  maxLevel: string;
  culpritLineBreakdownJson?: string;
  steps: ApprovalStep[];
}

export interface Warehouse {
  id: number;
  name: string;
  code: string;
  locationCity: string;
  region: string;
  baseFreightCost: number;
  weightRatePerKg: number;
  leadTimeDays: number;
}

export interface FulfillmentSplit {
  id: number;
  warehouse: Warehouse;
  productId: number;
  productName: string;
  allocatedQuantity: number;
  backorderedQuantity: number;
  estimatedFreightCost: number;
  leadTimeDays: number;
  status: 'ALLOCATED' | 'BACKORDERED' | 'DISPATCHED' | 'DELIVERED';
}

export interface FulfillmentPlan {
  id: number;
  quotationId: number;
  status: 'OPTIMIZED' | 'PARTIALLY_ALLOCATED' | 'FULFILLED';
  totalFreightCost: number;
  totalLeadTimeDays: number;
  allLinesSatisfied: boolean;
  splits: FulfillmentSplit[];
}

export interface DealHealthFlag {
  id: number;
  quotation: Quotation;
  flagType: 'STALLED' | 'DISCOUNT_ANOMALY' | 'DELIVERY_SLIPPAGE' | 'SLA_BREACH';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  resolved: boolean;
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
  ruleId: number;
  suggestedProduct: Product;
  benefitDescription: string;
  discountPct: number;
  projectedRevenueIncrease: number;
  marginImpactPct: number;
}
