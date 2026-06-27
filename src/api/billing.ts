export type PlanTier = 'starter' | 'growth' | 'enterprise';

export interface UsageMeter {
  label: string;
  used: number;
  limit: number;
  unit: string;
  percent: number;
  overage: number;
}

export interface ChannelCost {
  channel: string;
  quantity: number;
  unit: string;
  unitCost: number;
  subtotal: number;
  provider: string;
}

export interface DayUsage {
  date: string;
  voiceMinutes: number;
  whatsapp: number;
  email: number;
  aiInteractions: number;
  cost: number;
}

export interface Invoice {
  id: string;
  period: string;
  issuedAt: string;
  status: 'paid' | 'open' | 'draft';
  subtotal: number;
  tax: number;
  total: number;
  lines: { description: string; amount: number }[];
}

export interface BillingUsageData {
  account: {
    companyName: string;
    billingEmail: string;
    planName: string;
    planTier: PlanTier;
    monthlyPrice: number;
    status: string;
    billingCycleStart: string;
    billingCycleEnd: string;
    daysRemaining: number;
    paymentMethod?: string;
    features: string[];
  };
  summary: {
    estimatedSpend: number;
    platformFee: number;
    providerCosts: number;
    projectedTotal: number;
    voiceMinutes: number;
    whatsappMessages: number;
    emailSends: number;
    aiInteractions: number;
    teamSeats: number;
  };
  meters: UsageMeter[];
  channelCosts: ChannelCost[];
  usagePerDay: DayUsage[];
  invoices: Invoice[];
  rates: {
    voicePerMinute: number;
    whatsappPerMessage: number;
    emailPerSend: number;
    aiPerInteraction: number;
  };
}

export interface PlanDefinition {
  tier: PlanTier;
  name: string;
  monthlyPrice: number;
  limits: Record<string, number>;
  features: string[];
}

export async function getBillingUsage(): Promise<BillingUsageData> {
  const res = await fetch('/api/billing/usage');
  if (!res.ok) throw new Error('Failed to load billing usage');
  return res.json();
}

export async function updateBillingPlan(data: {
  planTier?: PlanTier;
  billingEmail?: string;
  companyName?: string;
}): Promise<{ success: boolean; usage: BillingUsageData }> {
  const res = await fetch('/api/billing/plan', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update plan');
  return res.json();
}

export async function getAvailablePlans(): Promise<{ availablePlans: PlanDefinition[] }> {
  const res = await fetch('/api/billing/plan');
  if (!res.ok) throw new Error('Failed to load plans');
  const data = await res.json();
  return { availablePlans: data.availablePlans };
}