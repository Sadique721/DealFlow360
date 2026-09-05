import { Quotation, Product, ApprovalRequest, FulfillmentSplit, Warehouse, DealHealthFlag, SubscriptionContract } from '../models/dealflow.model';

// Utility random generator helpers for deterministic 120+ enterprise records
const CLIENT_COMPANIES = [
  'Tesla Gigafactory Texas', 'SpaceX Starlink Operations', 'Nvidia AI Foundry', 'Microsoft Azure Systems',
  'Snowflake Data Cloud', 'Databricks Labs', 'Stripe Payments US', 'Goldman Sachs Trading',
  'Apple Hardware Engineering', 'Amazon AWS Infrastructure', 'Google DeepMind Clusters', 'Meta Reality Labs',
  'Palantir Defense Analytics', 'OpenAI Supercomputer Grid', 'Anthropic Frontier Compute', 'Oracle Cloud Core',
  'Cisco Unified Networks', 'Intel Foundry Services', 'AMD Instinct Accelerators', 'IBM Quantum Labs',
  'JPMorgan Chase Fintech', 'Morgan Stanley Wealth', 'Boeing Aerospace Avionics', 'Lockheed Martin Space',
  'Uber Mobility Systems', 'Airbnb Global Services', 'Spotify Audio AI', 'Netflix Streaming CDN',
  'Adobe Creative Cloud', 'Zoom Video Communications', 'Shopify Merchant Cloud', 'Cloudflare Edge Mesh',
  'Salesforce Einstein AI', 'Atlassian Enterprise', 'ServiceNow Workflow Hub', 'CrowdStrike Falcon Cloud',
  'Palo Alto Prisma SASE', 'Zscaler Zero Trust', 'Splunk Security Telemetry', 'Twilio Communications'
];

const SALES_REPS = [
  { id: 2, name: 'Jay Rao', email: 'j.rao@dealflow360.com', role: 'SALES_REP', team: 'Strategic Enterprise' },
  { id: 3, name: 'Samir Patel', email: 's.patel@dealflow360.com', role: 'SALES_REP', team: 'Cloud & SaaS' },
  { id: 4, name: 'Anand Joshi', email: 'a.joshi@dealflow360.com', role: 'SALES_MANAGER', team: 'North America' },
  { id: 5, name: 'Priya Desai', email: 'p.desai@dealflow360.com', role: 'FINANCE', team: 'Executive Finance' },
  { id: 6, name: 'Vikram Mehta', email: 'v.mehta@dealflow360.com', role: 'SALES_REP', team: 'Government & Defense' }
];

const CATEGORIES = [
  { id: 1, name: 'Core Hardware & Servers', code: 'HW_CORE', maxDiscountCeilingPct: 15, standardMarginTargetPct: 35 },
  { id: 2, name: 'Cloud & AI Subscriptions', code: 'SW_SUB', maxDiscountCeilingPct: 20, standardMarginTargetPct: 75 },
  { id: 3, name: 'Professional & Mission Services', code: 'SVC_PRO', maxDiscountCeilingPct: 10, standardMarginTargetPct: 45 },
  { id: 4, name: 'Edge Networking & Gateway', code: 'NET_EDGE', maxDiscountCeilingPct: 15, standardMarginTargetPct: 40 }
];

export const MOCK_PRODUCTS: Product[] = [
  { id: 101, name: 'High-Throughput Ground Satellite Gateway 4U', sku: 'HW-GW-900', type: 'HARDWARE', basePrice: 12500, unitCost: 8100, weightKg: 28, category: CATEGORIES[0] },
  { id: 102, name: 'Titan Edge Multi-Cloud Server Blade 2U', sku: 'SRV-TITAN-2U', type: 'HARDWARE', basePrice: 8400, unitCost: 5600, weightKg: 18, category: CATEGORIES[0] },
  { id: 103, name: 'Quantum Cryptographic HSM Security Module', sku: 'SEC-HSM-Q', type: 'HARDWARE', basePrice: 18500, unitCost: 11200, weightKg: 12, category: CATEGORIES[0] },
  { id: 104, name: 'Dense AI Inference Accelerator Pod (8x GPU)', sku: 'POD-AI-8X', type: 'HARDWARE', basePrice: 64000, unitCost: 44000, weightKg: 65, category: CATEGORIES[0] },
  { id: 105, name: 'Ultra-Low Latency 400GbE Spine Core Switch', sku: 'NET-SPINE-400', type: 'HARDWARE', basePrice: 22000, unitCost: 14500, weightKg: 22, category: CATEGORIES[3] },
  { id: 201, name: 'Autonomous CPQ AI Governance Engine (Annual)', sku: 'SUB-CPQ-GOV', type: 'SUBSCRIPTION', basePrice: 3600, unitCost: 400, weightKg: 0, category: CATEGORIES[1], billingFrequency: 'ANNUAL' },
  { id: 202, name: 'Mission Critical 24/7 SRE Telemetry & Ops', sku: 'SUB-OPS-247', type: 'SUBSCRIPTION', basePrice: 1800, unitCost: 550, weightKg: 0, category: CATEGORIES[1], billingFrequency: 'MONTHLY' },
  { id: 203, name: 'Multi-Cloud Edge Routing & Zero Trust License', sku: 'SUB-EDGE-ZT', type: 'SUBSCRIPTION', basePrice: 2400, unitCost: 350, weightKg: 0, category: CATEGORIES[1], billingFrequency: 'MONTHLY' },
  { id: 204, name: 'Enterprise Fleet Predictive Maintenance Engine', sku: 'SUB-PRED-AI', type: 'SUBSCRIPTION', basePrice: 4200, unitCost: 600, weightKg: 0, category: CATEGORIES[1], billingFrequency: 'ANNUAL' },
  { id: 301, name: 'Principal Enterprise Solution Architect (Per Week)', sku: 'SVC-ARCH-WK', type: 'SERVICE', basePrice: 7500, unitCost: 4200, weightKg: 0, category: CATEGORIES[2] },
  { id: 302, name: 'Onsite RF Calibration & Satellite Rigging Services', sku: 'SVC-RF-CALIB', type: 'SERVICE', basePrice: 320, unitCost: 160, weightKg: 0, category: CATEGORIES[2] },
  { id: 303, name: 'High-Availability Disaster Recovery Verification', sku: 'SVC-DR-AUDIT', type: 'SERVICE', basePrice: 14000, unitCost: 7800, weightKg: 0, category: CATEGORIES[2] }
];

// Generate 120 deterministic products for extensive testing
export function generate120Products(): Product[] {
  const result: Product[] = [...MOCK_PRODUCTS];
  const types = ['HARDWARE', 'SUBSCRIPTION', 'SERVICE'];
  for (let i = 13; i <= 125; i++) {
    const cat = CATEGORIES[i % 4];
    const pType = i % 3 === 0 ? 'SUBSCRIPTION' : i % 3 === 1 ? 'HARDWARE' : 'SERVICE';
    const base = Math.round((1200 + (i * 350)) / 50) * 50;
    const cost = Math.round((base * (0.45 + ((i % 25) * 0.01))) / 10) * 10;
    result.push({
      id: 100 + i,
      name: `Enterprise ${cat.name.split('&')[0].trim()} Package v${i}`,
      sku: `SKU-${cat.code}-${i}`,
      type: pType,
      basePrice: base,
      unitCost: cost,
      weightKg: pType === 'HARDWARE' ? Math.round(5 + (i % 30)) : 0,
      category: cat,
      billingFrequency: pType === 'SUBSCRIPTION' ? (i % 2 === 0 ? 'MONTHLY' : 'ANNUAL') : undefined
    });
  }
  return result;
}

// Generate 120 deterministic quotations for pipeline and analytics testing
export function generate120Quotations(): Quotation[] {
  const statuses = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT_TO_CUSTOMER', 'CONFIRMED', 'ACCEPTED'];
  const tiers = [
    { id: 1, tierName: 'Enterprise Diamond', code: 'DIAMOND', maxDiscountFloorPct: 25, freightDiscountPct: 50 },
    { id: 2, tierName: 'Platinum Partner', code: 'PLATINUM', maxDiscountFloorPct: 20, freightDiscountPct: 35 },
    { id: 3, tierName: 'Gold Corporate', code: 'GOLD', maxDiscountFloorPct: 15, freightDiscountPct: 20 },
    { id: 4, tierName: 'Silver Commercial', code: 'SILVER', maxDiscountFloorPct: 10, freightDiscountPct: 10 }
  ];

  const quotations: Quotation[] = [];

  for (let i = 1; i <= 120; i++) {
    const compName = CLIENT_COMPANIES[(i - 1) % CLIENT_COMPANIES.length] + (i > 40 ? ` (Div ${Math.floor(i / 40)})` : '');
    const rep = SALES_REPS[(i - 1) % SALES_REPS.length];
    const tier = tiers[(i - 1) % tiers.length];
    const status = statuses[(i - 1) % statuses.length];

    const subtotal = Math.round((45000 + (i * 12500) + ((i % 7) * 8500)) / 100) * 100;
    const discPct = Number(((i % 17) * 1.2 + 3).toFixed(1));
    const discAmt = Math.round(subtotal * (discPct / 100));
    const total = subtotal - discAmt;
    const margin = Number((42.5 - (discPct * 0.95) + ((i % 5) * 1.5)).toFixed(1));
    const riskScore = discPct > 15 ? Number((60 + (discPct * 2.2)).toFixed(1)) : Number((discPct * 2.1).toFixed(1));
    const severity = riskScore >= 75 ? 'CRITICAL' : riskScore >= 50 ? 'HIGH' : riskScore >= 25 ? 'MEDIUM' : 'LOW';

    quotations.push({
      id: i,
      quoteNumber: `Q-${2026}-${String(1000 + i).padStart(4, '0')}`,
      customer: {
        id: i,
        name: compName,
        code: `CUST-${1000 + i}`,
        email: `procurement@${compName.toLowerCase().replace(/[^a-z]/g, '')}.com`,
        contactEmail: `procurement@${compName.toLowerCase().replace(/[^a-z]/g, '')}.com`,
        destinationRegion: i % 4 === 0 ? 'North America' : i % 4 === 1 ? 'EMEA' : i % 4 === 2 ? 'APAC' : 'LATAM',
        tier: tier
      },
      salesRep: rep,
      status: status,
      subtotalAmount: subtotal,
      totalDiscountAmount: discAmt,
      blendedDiscountPct: discPct,
      shippingAmount: Math.round(1200 + (i * 45)),
      taxAmount: Math.round(total * 0.07),
      totalAmount: total,
      totalCostAmount: Math.round(total * (1 - (margin / 100))),
      marginPct: margin,
      riskScore: riskScore,
      riskSeverity: severity,
      requiresManagerApproval: discPct > 10,
      requiresFinanceApproval: discPct > 15,
      promisedDeliveryDate: new Date(Date.now() + (14 + (i % 20)) * 86400000).toISOString().split('T')[0],
      createdAt: new Date(Date.now() - (i * 24 * 3600000)).toISOString(),
      lines: [
        {
          product: MOCK_PRODUCTS[i % MOCK_PRODUCTS.length],
          quantity: Math.max(1, (i % 8) * 3),
          unitListPrice: MOCK_PRODUCTS[i % MOCK_PRODUCTS.length].basePrice,
          unitDiscountPct: discPct,
          unitDiscountAmount: Math.round(MOCK_PRODUCTS[i % MOCK_PRODUCTS.length].basePrice * (discPct / 100)),
          unitFinalPrice: Math.round(MOCK_PRODUCTS[i % MOCK_PRODUCTS.length].basePrice * (1 - (discPct / 100))),
          lineTotal: Math.round(MOCK_PRODUCTS[i % MOCK_PRODUCTS.length].basePrice * (1 - (discPct / 100)) * Math.max(1, (i % 8) * 3)),
          lineCost: (MOCK_PRODUCTS[i % MOCK_PRODUCTS.length].unitCost || 100) * Math.max(1, (i % 8) * 3),
          lineMarginPct: margin
        }
      ]
    });
  }

  return quotations;
}

// Generate 120 Approval Requests
export function generate120Approvals(quotes: Quotation[]): ApprovalRequest[] {
  return quotes.slice(0, 120).map((q, idx) => ({
    id: idx + 1,
    quotation: q,
    status: q.status === 'PENDING_APPROVAL' ? 'PENDING' : q.status === 'APPROVED' ? 'APPROVED' : 'PENDING',
    currentLevel: (q.blendedDiscountPct || 0) > 15 ? 'LEVEL_2_FINANCE' : 'LEVEL_1_MANAGER',
    maxLevel: (q.blendedDiscountPct || 0) > 15 ? 'LEVEL_2_FINANCE' : 'LEVEL_1_MANAGER',
    requiredTier: (q.blendedDiscountPct || 0) > 15 ? 'VP & CFO Sign-off' : 'Sales Manager Sign-off',
    culpritLineBreakdownJson: JSON.stringify([
      {
        productName: q.lines[0]?.product.name || 'Ground Gateway 4U',
        lineTotal: q.totalAmount,
        revenueWeightPct: 65.4,
        appliedDiscountPct: q.blendedDiscountPct || 0,
        allowedThresholdPct: 15.0,
        overagePct: Math.max(0, (q.blendedDiscountPct || 0) - 15.0),
        weightedContribution: Number((Math.max(0, (q.blendedDiscountPct || 0) - 15.0) * 0.654).toFixed(2))
      }
    ]),
    steps: [
      {
        id: (idx * 2) + 1,
        level: 'LEVEL_1',
        approverRole: 'SALES_MANAGER',
        approver: SALES_REPS[2],
        status: q.status === 'APPROVED' ? 'APPROVED' : 'PENDING',
        stepOrder: 1,
        slaDeadline: '2026-09-06T18:00:00Z',
        comments: (q.blendedDiscountPct || 0) > 10 ? 'Discount over category cap; requires VP concurrence.' : 'Within standard discretion.'
      }
    ]
  }));
}

// Generate 120 Fulfillment Inventory Splits
export function generate120Splits(): FulfillmentSplit[] {
  const warehouses: Warehouse[] = [
    { id: 1, name: 'Austin Central Gigafactory Hub', code: 'WH-ATX-01', locationCity: 'Austin, TX', region: 'North America South', baseFreightCost: 420, weightRatePerKg: 1.8, leadTimeDays: 2 },
    { id: 2, name: 'Chicago Great Lakes Depot', code: 'WH-CHI-02', locationCity: 'Chicago, IL', region: 'North America Central', baseFreightCost: 650, weightRatePerKg: 2.1, leadTimeDays: 3 },
    { id: 3, name: 'Frankfurt European Gateway', code: 'WH-FRA-03', locationCity: 'Frankfurt', region: 'Europe Core', baseFreightCost: 1100, weightRatePerKg: 3.4, leadTimeDays: 4 },
    { id: 4, name: 'Singapore APAC Transshipment', code: 'WH-SIN-04', locationCity: 'Singapore', region: 'APAC Maritime', baseFreightCost: 1450, weightRatePerKg: 4.2, leadTimeDays: 5 }
  ];

  const splits: FulfillmentSplit[] = [];
  for (let i = 1; i <= 120; i++) {
    const wh = warehouses[(i - 1) % warehouses.length];
    const prod = MOCK_PRODUCTS[(i - 1) % MOCK_PRODUCTS.length];
    const qty = Math.max(5, (i * 3) % 45);
    const backorder = i % 5 === 0 ? Math.round(qty * 0.25) : 0;

    splits.push({
      id: i,
      warehouse: wh,
      productId: prod.id,
      productName: prod.name,
      allocatedQuantity: qty - backorder,
      backorderedQuantity: backorder,
      estimatedFreightCost: Math.round(wh.baseFreightCost + ((qty * (prod.weightKg || 5)) * wh.weightRatePerKg)),
      leadTimeDays: wh.leadTimeDays + (i % 2),
      status: backorder > 0 ? 'BACKORDERED' : (i % 2 === 0 ? 'DISPATCHED' : 'ALLOCATED')
    });
  }
  return splits;
}

// Generate 120 Deal Health Anomaly Flags
export function generate120HealthFlags(quotes: Quotation[]): DealHealthFlag[] {
  const flagTypes = ['STATISTICAL_DISCOUNT_OUTLIER', 'STAGE_RESIDENCE_STALL', 'MARGIN_DECAY_ANOMALY', 'SLA_BREACH'];
  const severities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

  return quotes.slice(0, 120).map((q, idx) => {
    const fType = flagTypes[idx % flagTypes.length];
    const sev = severities[idx % severities.length];
    const zScore = Number((1.8 + ((idx % 15) * 0.18)).toFixed(2));
    const days = 6 + (idx % 14);

    const tierStr = q.customer.tier?.tierName || q.customer.tier || 'Enterprise Gold';
    let desc = '';
    if (fType === 'STATISTICAL_DISCOUNT_OUTLIER') {
      desc = `Discount of ${q.blendedDiscountPct || 0}% is ${zScore} standard deviations above median cohort for ${tierStr}.`;
    } else if (fType === 'STAGE_RESIDENCE_STALL') {
      desc = `Opportunity has been stagnant in ${(q.status || 'DRAFT').replace('_', ' ')} stage for ${days} days (> 7 days SLA target).`;
    } else if (fType === 'MARGIN_DECAY_ANOMALY') {
      desc = `Net gross margin of ${q.marginPct || 0}% severely undercuts the ${tierStr} target baseline of 35.0%.`;
    } else {
      desc = `Approval SLA threshold breached by ${idx * 4} minutes. Executive desk notification automatically routed.`;
    }

    return {
      id: idx + 1,
      quotation: q,
      flagType: fType,
      severity: sev,
      description: desc,
      resolved: idx % 6 === 0,
      detectedAt: new Date(Date.now() - (idx * 3600000 * 4)).toISOString()
    };
  });
}

// Generate 120 Subscription & Recurring Contracts
export function generate120Subscriptions(quotes: Quotation[]): SubscriptionContract[] {
  const plans = [
    { name: 'Autonomous CPQ AI Governance Cloud', price: 185, freq: 'ANNUAL' },
    { name: 'Mission Critical 24/7 SRE Telemetry & Ops', price: 120, freq: 'MONTHLY' },
    { name: 'Multi-Cloud Edge Routing & Zero Trust SASE', price: 145, freq: 'MONTHLY' },
    { name: 'Enterprise Fleet Predictive Maintenance Engine', price: 210, freq: 'QUARTERLY' },
    { name: 'Real-Time Financial Risk & Margins Sentinel', price: 160, freq: 'ANNUAL' }
  ];
  const statuses: ('ACTIVE' | 'PENDING_PRORATION' | 'RENEWING' | 'IN_GRACE' | 'CANCELLED')[] = [
    'ACTIVE', 'ACTIVE', 'PENDING_PRORATION', 'ACTIVE', 'RENEWING', 'IN_GRACE'
  ];

  return quotes.slice(0, 120).map((q, idx) => {
    const plan = plans[idx % plans.length];
    const seats = 15 + ((idx * 7) % 250);
    const mrr = Math.round(seats * plan.price);
    const acv = plan.freq === 'ANNUAL' ? mrr * 12 : mrr * 12;
    const status = statuses[idx % statuses.length];
    const prorationDelta = status === 'PENDING_PRORATION' ? Math.round(((idx % 8) + 3) * plan.price * (14 / 30)) : 0;

    return {
      id: idx + 1,
      contractNumber: `SUB-${2026}-${String(5000 + idx + 1).padStart(4, '0')}`,
      customerName: q.customer.name,
      customerTier: q.customer.tier?.tierName || (typeof q.customer.tier === 'string' ? q.customer.tier : 'Enterprise Gold'),
      planName: plan.name,
      billingFrequency: plan.freq as any,
      seatsCount: seats,
      unitSeatPrice: plan.price,
      monthlyRecurringRevenue: mrr,
      annualContractValue: acv,
      startDate: new Date(Date.now() - (idx * 3 * 86400000)).toISOString().split('T')[0],
      nextRenewalDate: new Date(Date.now() + ((30 - (idx % 25)) * 86400000)).toISOString().split('T')[0],
      status: status,
      prorationAmountAvailable: prorationDelta,
      creditNoteId: status === 'PENDING_PRORATION' ? `CR-${1000 + idx}` : undefined
    };
  });
}

