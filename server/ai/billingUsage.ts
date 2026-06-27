import { listStoredRecords } from './callHistoryStore.js';
import { listChatRecords } from './whatsappChatHistoryStore.js';
import { listEmailRecords } from './emailChatHistoryStore.js';
import { listCampaigns } from './whatsappCampaignStore.js';
import { listEmailCampaigns } from './emailCampaignStore.js';
import { listTeam } from '../teamStore.js';
import {
  getBillingAccount,
  getPlanDefinition,
  type PlanTier,
} from '../billingStore.js';

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

export interface InvoiceLine {
  description: string;
  amount: number;
}

export interface Invoice {
  id: string;
  period: string;
  issuedAt: string;
  status: 'paid' | 'open' | 'draft';
  subtotal: number;
  tax: number;
  total: number;
  lines: InvoiceLine[];
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

const VOICE_RATE = 0.014;
const WHATSAPP_RATE = 0.008;
const EMAIL_RATE = 0.001;
const AI_RATE = 0.002;

function parseTwilioCost(cost: string): number {
  if (!cost || cost === '—') return 0;
  const n = parseFloat(cost.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? Math.abs(n) : 0;
}

function isInBillingPeriod(iso: string, start: Date, end: Date): boolean {
  const d = new Date(iso);
  return d >= start && d < end;
}

function dayKey(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function buildDayBuckets(days: number): Map<string, DayUsage> {
  const map = new Map<string, DayUsage>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    map.set(key, { date: key, voiceMinutes: 0, whatsapp: 0, email: 0, aiInteractions: 0, cost: 0 });
  }
  return map;
}

function pct(used: number, limit: number): number {
  if (limit <= 0 || limit >= 999999) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

export function getBillingUsage(): BillingUsageData {
  const account = getBillingAccount();
  const plan = getPlanDefinition(account.planTier);

  const cycleStart = new Date(account.billingCycleStart);
  const cycleEnd = new Date(cycleStart.getFullYear(), cycleStart.getMonth() + 1, 1);
  const now = new Date();
  const daysRemaining = Math.max(0, Math.ceil((cycleEnd.getTime() - now.getTime()) / 86400000));

  const calls = listStoredRecords().filter((c) => isInBillingPeriod(c.time, cycleStart, cycleEnd));
  const waChats = listChatRecords().filter((c) => isInBillingPeriod(c.time, cycleStart, cycleEnd));
  const emailChats = listEmailRecords().filter((c) => isInBillingPeriod(c.time, cycleStart, cycleEnd));
  const waCampaigns = listCampaigns();
  const emailCampaigns = listEmailCampaigns();
  const team = listTeam();

  const voiceMinutes = Math.ceil(calls.reduce((s, c) => s + c.durationSeconds, 0) / 60);
  const twilioVoiceCost = calls.reduce((s, c) => s + parseTwilioCost(c.cost), 0);

  const waCampaignSent = waCampaigns.reduce((s, c) => {
    return (
      s +
      c.recipients.filter(
        (r) => r.sentAt && isInBillingPeriod(r.sentAt, cycleStart, cycleEnd)
      ).length
    );
  }, 0);
  const waMessages = waCampaignSent + waChats.length;

  const emailCampaignSent = emailCampaigns.reduce((s, c) => {
    return (
      s +
      c.recipients.filter(
        (r) => r.sentAt && isInBillingPeriod(r.sentAt, cycleStart, cycleEnd)
      ).length
    );
  }, 0);
  const emailSends = emailCampaignSent + emailChats.filter((e) => e.sessionStatus !== 'Awaiting Reply').length;

  const aiInteractions = calls.length + waChats.length + emailChats.length;

  const voiceCostEst = twilioVoiceCost > 0 ? twilioVoiceCost : voiceMinutes * VOICE_RATE;
  const whatsappCost = waMessages * WHATSAPP_RATE;
  const emailCost = emailSends * EMAIL_RATE;
  const aiCost = aiInteractions * AI_RATE;
  const providerCosts = voiceCostEst + whatsappCost + emailCost + aiCost;
  const platformFee = account.planTier === 'enterprise' ? 0 : plan.monthlyPrice;
  const estimatedSpend = providerCosts;
  const projectedTotal = platformFee + estimatedSpend;

  const meters: UsageMeter[] = [
    {
      label: 'Voice minutes',
      used: voiceMinutes,
      limit: plan.limits.voiceMinutes,
      unit: 'min',
      percent: pct(voiceMinutes, plan.limits.voiceMinutes),
      overage: Math.max(0, voiceMinutes - plan.limits.voiceMinutes),
    },
    {
      label: 'WhatsApp messages',
      used: waMessages,
      limit: plan.limits.whatsappMessages,
      unit: 'msgs',
      percent: pct(waMessages, plan.limits.whatsappMessages),
      overage: Math.max(0, waMessages - plan.limits.whatsappMessages),
    },
    {
      label: 'Email sends',
      used: emailSends,
      limit: plan.limits.emailSends,
      unit: 'emails',
      percent: pct(emailSends, plan.limits.emailSends),
      overage: Math.max(0, emailSends - plan.limits.emailSends),
    },
    {
      label: 'AI interactions',
      used: aiInteractions,
      limit: plan.limits.aiInteractions,
      unit: 'sessions',
      percent: pct(aiInteractions, plan.limits.aiInteractions),
      overage: Math.max(0, aiInteractions - plan.limits.aiInteractions),
    },
    {
      label: 'Team seats',
      used: team.length,
      limit: plan.limits.teamSeats,
      unit: 'seats',
      percent: pct(team.length, plan.limits.teamSeats),
      overage: Math.max(0, team.length - plan.limits.teamSeats),
    },
  ];

  const channelCosts: ChannelCost[] = [
    {
      channel: 'Voice (Twilio)',
      quantity: voiceMinutes,
      unit: 'min',
      unitCost: voiceMinutes > 0 ? voiceCostEst / voiceMinutes : VOICE_RATE,
      subtotal: voiceCostEst,
      provider: 'Twilio',
    },
    {
      channel: 'WhatsApp',
      quantity: waMessages,
      unit: 'msgs',
      unitCost: WHATSAPP_RATE,
      subtotal: whatsappCost,
      provider: 'Twilio / Meta',
    },
    {
      channel: 'Email',
      quantity: emailSends,
      unit: 'sends',
      unitCost: EMAIL_RATE,
      subtotal: emailCost,
      provider: 'SMTP / Resend',
    },
    {
      channel: 'AI (Groq)',
      quantity: aiInteractions,
      unit: 'sessions',
      unitCost: AI_RATE,
      subtotal: aiCost,
      provider: 'Groq',
    },
  ];

  const dayMap = buildDayBuckets(30);
  for (const c of calls) {
    const k = dayKey(c.time);
    const bucket = dayMap.get(k);
    if (bucket) {
      const mins = Math.ceil(c.durationSeconds / 60);
      bucket.voiceMinutes += mins;
      bucket.aiInteractions += 1;
      bucket.cost += parseTwilioCost(c.cost) || mins * VOICE_RATE;
    }
  }
  for (const c of waChats) {
    const k = dayKey(c.time);
    const bucket = dayMap.get(k);
    if (bucket) {
      bucket.whatsapp += 1;
      bucket.aiInteractions += 1;
      bucket.cost += WHATSAPP_RATE;
    }
  }
  for (const c of emailChats) {
    const k = dayKey(c.time);
    const bucket = dayMap.get(k);
    if (bucket) {
      bucket.email += 1;
      bucket.aiInteractions += 1;
      bucket.cost += EMAIL_RATE;
    }
  }

  const invoices = buildInvoices(account.planTier, platformFee, providerCosts, cycleStart);

  return {
    account: {
      companyName: account.companyName,
      billingEmail: account.billingEmail,
      planName: plan.name,
      planTier: account.planTier,
      monthlyPrice: plan.monthlyPrice,
      status: account.status,
      billingCycleStart: cycleStart.toISOString(),
      billingCycleEnd: cycleEnd.toISOString(),
      daysRemaining,
      paymentMethod:
        account.paymentMethodBrand && account.paymentMethodLast4
          ? `${account.paymentMethodBrand} •••• ${account.paymentMethodLast4}`
          : undefined,
      features: plan.features,
    },
    summary: {
      estimatedSpend: round2(estimatedSpend),
      platformFee: round2(platformFee),
      providerCosts: round2(providerCosts),
      projectedTotal: round2(projectedTotal),
      voiceMinutes,
      whatsappMessages: waMessages,
      emailSends,
      aiInteractions,
      teamSeats: team.length,
    },
    meters,
    channelCosts: channelCosts.map((c) => ({ ...c, subtotal: round2(c.subtotal), unitCost: round4(c.unitCost) })),
    usagePerDay: [...dayMap.values()],
    invoices,
    rates: {
      voicePerMinute: VOICE_RATE,
      whatsappPerMessage: WHATSAPP_RATE,
      emailPerSend: EMAIL_RATE,
      aiPerInteraction: AI_RATE,
    },
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function buildInvoices(
  tier: PlanTier,
  platformFee: number,
  currentProviderCosts: number,
  cycleStart: Date
): Invoice[] {
  const invoices: Invoice[] = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let i = 1; i <= 3; i++) {
    const d = new Date(cycleStart.getFullYear(), cycleStart.getMonth() - i, 1);
    const period = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    const providerEst = currentProviderCosts * (1 - i * 0.15);
    const subtotal = (tier === 'enterprise' ? 0 : platformFee) + providerEst;
    const tax = round2(subtotal * 0.2);
    invoices.push({
      id: `inv-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`,
      period,
      issuedAt: new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString(),
      status: 'paid',
      subtotal: round2(subtotal),
      tax,
      total: round2(subtotal + tax),
      lines: [
        { description: `${getPlanDefinition(tier).name} platform fee`, amount: tier === 'enterprise' ? 0 : platformFee },
        { description: 'Provider usage (Twilio, WhatsApp, Email, AI)', amount: round2(providerEst) },
      ],
    });
  }

  const currentPeriod = `${monthNames[cycleStart.getMonth()]} ${cycleStart.getFullYear()}`;
  const currentSubtotal = platformFee + currentProviderCosts;
  invoices.unshift({
    id: `inv-${cycleStart.getFullYear()}${String(cycleStart.getMonth() + 1).padStart(2, '0')}`,
    period: currentPeriod,
    issuedAt: nowIso(),
    status: 'open',
    subtotal: round2(currentSubtotal),
    tax: round2(currentSubtotal * 0.2),
    total: round2(currentSubtotal * 1.2),
    lines: [
      { description: `${getPlanDefinition(tier).name} platform fee`, amount: platformFee },
      { description: 'Provider usage (Twilio, WhatsApp, Email, AI)', amount: round2(currentProviderCosts) },
    ],
  });

  return invoices;
}

function nowIso(): string {
  return new Date().toISOString();
}