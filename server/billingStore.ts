import fs from 'fs';
import path from 'path';

export type PlanTier = 'starter' | 'growth' | 'enterprise';

export interface PlanLimits {
  voiceMinutes: number;
  whatsappMessages: number;
  emailSends: number;
  teamSeats: number;
  aiInteractions: number;
}

export interface PlanDefinition {
  tier: PlanTier;
  name: string;
  monthlyPrice: number;
  limits: PlanLimits;
  features: string[];
}

export const PLANS: Record<PlanTier, PlanDefinition> = {
  starter: {
    tier: 'starter',
    name: 'Starter',
    monthlyPrice: 99,
    limits: {
      voiceMinutes: 500,
      whatsappMessages: 1000,
      emailSends: 2000,
      teamSeats: 3,
      aiInteractions: 2500,
    },
    features: ['Voice + WhatsApp + Email', 'Analytics Hub', 'Knowledge Base', '3 team seats'],
  },
  growth: {
    tier: 'growth',
    name: 'Growth',
    monthlyPrice: 299,
    limits: {
      voiceMinutes: 2000,
      whatsappMessages: 5000,
      emailSends: 10000,
      teamSeats: 10,
      aiInteractions: 15000,
    },
    features: ['Everything in Starter', 'API & Webhooks', 'Priority support', '10 team seats'],
  },
  enterprise: {
    tier: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: 0,
    limits: {
      voiceMinutes: 999999,
      whatsappMessages: 999999,
      emailSends: 999999,
      teamSeats: 999,
      aiInteractions: 999999,
    },
    features: ['Unlimited usage', 'Custom SLA', 'Dedicated onboarding', 'SSO & audit logs'],
  },
};

export interface BillingAccount {
  planTier: PlanTier;
  billingEmail: string;
  companyName: string;
  billingCycleStart: string;
  paymentMethodLast4?: string;
  paymentMethodBrand?: string;
  status: 'active' | 'past_due' | 'trialing';
  trialEndsAt?: string;
}

const STORE_PATH = path.join(process.cwd(), 'server', 'data', 'billing.json');

function defaultAccount(): BillingAccount {
  const now = new Date();
  const cycleStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    planTier: 'growth',
    billingEmail: 'admin@datacrew.ai',
    companyName: 'DataCrew',
    billingCycleStart: cycleStart.toISOString(),
    paymentMethodLast4: '4242',
    paymentMethodBrand: 'Visa',
    status: 'active',
  };
}

function loadAccount(): BillingAccount {
  if (fs.existsSync(STORE_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8')) as BillingAccount;
    } catch {
      /* fall through */
    }
  }
  const account = defaultAccount();
  saveAccount(account);
  return account;
}

function saveAccount(account: BillingAccount): void {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(account, null, 2));
}

export function getBillingAccount(): BillingAccount {
  return loadAccount();
}

export function updateBillingAccount(updates: Partial<BillingAccount>): BillingAccount {
  const account = loadAccount();
  Object.assign(account, updates);
  saveAccount(account);
  return account;
}

export function getPlanDefinition(tier: PlanTier): PlanDefinition {
  return PLANS[tier];
}