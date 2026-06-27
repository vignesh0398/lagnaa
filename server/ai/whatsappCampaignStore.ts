import fs from 'fs';
import path from 'path';

export type RecipientStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'replied'
  | 'in_flow'
  | 'completed'
  | 'failed'
  | 'opted_out';

export interface CampaignRecipient {
  id: string;
  phone: string;
  clientName: string;
  expectedDob?: string;
  expectedPostcode?: string;
  status: RecipientStatus;
  outcome?: string;
  lastMessage?: string;
  messageSid?: string;
  errorMessage?: string;
  sentAt?: string;
  repliedAt?: string;
  completedAt?: string;
}

export interface WhatsAppCampaign {
  id: string;
  name: string;
  template: string;
  status: 'draft' | 'sending' | 'active' | 'completed' | 'paused';
  recipients: CampaignRecipient[];
  sentCount: number;
  repliedCount: number;
  completedCount: number;
  consentCount: number;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
}

const STORE_PATH = path.join(process.cwd(), 'server', 'data', 'whatsapp-campaigns.json');

export const DEFAULT_WHATSAPP_TEMPLATE = `Hi {{clientName}}, I'm Mia from Justizia Law.

You previously had a Plevin claim handled by Sandstone Legal. Because of this, your case may qualify for a free professional negligence review by Hugh James Solicitors.

May I speak with {{clientName}}? Reply YES to continue or STOP to opt out.`;

function loadAll(): WhatsAppCampaign[] {
  if (!fs.existsSync(STORE_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8')) as WhatsAppCampaign[];
  } catch {
    return [];
  }
}

function saveAll(campaigns: WhatsAppCampaign[]): void {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(campaigns, null, 2));
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'campaign';
}

export function applyTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '');
}

export function listCampaigns(): WhatsAppCampaign[] {
  return loadAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getCampaign(id: string): WhatsAppCampaign | undefined {
  return loadAll().find((c) => c.id === id);
}

export function createCampaign(name: string, template?: string): WhatsAppCampaign {
  const campaigns = loadAll();
  let id = slugify(name);
  let n = 1;
  while (campaigns.some((c) => c.id === id)) id = `${slugify(name)}-${n++}`;

  const campaign: WhatsAppCampaign = {
    id,
    name: name.trim(),
    template: template?.trim() || DEFAULT_WHATSAPP_TEMPLATE,
    status: 'draft',
    recipients: [],
    sentCount: 0,
    repliedCount: 0,
    completedCount: 0,
    consentCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  campaigns.push(campaign);
  saveAll(campaigns);
  return campaign;
}

export function updateCampaign(
  id: string,
  updates: Partial<Pick<WhatsAppCampaign, 'name' | 'template' | 'status'>>
): WhatsAppCampaign {
  const campaigns = loadAll();
  const idx = campaigns.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error('Campaign not found');

  if (updates.name) campaigns[idx].name = updates.name.trim();
  if (updates.template) campaigns[idx].template = updates.template.trim();
  if (updates.status) campaigns[idx].status = updates.status;
  campaigns[idx].updatedAt = new Date().toISOString();
  saveAll(campaigns);
  return campaigns[idx];
}

export function deleteCampaign(id: string): void {
  saveAll(loadAll().filter((c) => c.id !== id));
}

export function addRecipients(
  campaignId: string,
  rows: { phone: string; clientName: string; expectedDob?: string; expectedPostcode?: string }[]
): WhatsAppCampaign {
  const campaigns = loadAll();
  const idx = campaigns.findIndex((c) => c.id === campaignId);
  if (idx === -1) throw new Error('Campaign not found');

  const existing = new Set(campaigns[idx].recipients.map((r) => normalizePhone(r.phone)));

  for (const row of rows) {
    const phone = normalizePhone(row.phone);
    if (!phone || existing.has(phone)) continue;
    existing.add(phone);
    campaigns[idx].recipients.push({
      id: `rcp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      phone,
      clientName: row.clientName.trim() || 'there',
      expectedDob: row.expectedDob?.trim(),
      expectedPostcode: row.expectedPostcode?.trim(),
      status: 'pending',
    });
  }

  campaigns[idx].updatedAt = new Date().toISOString();
  saveAll(campaigns);
  return campaigns[idx];
}

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('00')) return `+${digits.slice(2)}`;
  if (phone.trim().startsWith('+')) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}

export function findRecipientByPhone(phone: string): { campaign: WhatsAppCampaign; recipient: CampaignRecipient } | null {
  const norm = normalizePhone(phone);
  for (const campaign of loadAll()) {
    const recipient = campaign.recipients.find((r) => normalizePhone(r.phone) === norm);
    if (recipient) return { campaign, recipient };
  }
  return null;
}

export function updateRecipient(
  campaignId: string,
  recipientId: string,
  updates: Partial<CampaignRecipient>
): CampaignRecipient {
  const campaigns = loadAll();
  const campaign = campaigns.find((c) => c.id === campaignId);
  if (!campaign) throw new Error('Campaign not found');
  const recipient = campaign.recipients.find((r) => r.id === recipientId);
  if (!recipient) throw new Error('Recipient not found');

  Object.assign(recipient, updates);
  campaign.updatedAt = new Date().toISOString();

  campaign.sentCount = campaign.recipients.filter((r) =>
    ['sent', 'delivered', 'replied', 'in_flow', 'completed'].includes(r.status)
  ).length;
  campaign.repliedCount = campaign.recipients.filter((r) =>
    ['replied', 'in_flow', 'completed'].includes(r.status)
  ).length;
  campaign.completedCount = campaign.recipients.filter((r) => r.status === 'completed').length;
  campaign.consentCount = campaign.recipients.filter((r) => r.outcome === 'Consent Given').length;

  if (campaign.recipients.every((r) => ['completed', 'failed', 'opted_out'].includes(r.status))) {
    campaign.status = 'completed';
    campaign.completedAt = new Date().toISOString();
  }

  saveAll(campaigns);
  return recipient;
}

export function markCampaignSending(id: string): WhatsAppCampaign {
  const campaigns = loadAll();
  const campaign = campaigns.find((c) => c.id === id);
  if (!campaign) throw new Error('Campaign not found');
  campaign.status = 'sending';
  campaign.startedAt = campaign.startedAt ?? new Date().toISOString();
  campaign.updatedAt = new Date().toISOString();
  saveAll(campaigns);
  return campaign;
}

export function markCampaignActive(id: string): WhatsAppCampaign {
  const campaigns = loadAll();
  const campaign = campaigns.find((c) => c.id === id);
  if (!campaign) throw new Error('Campaign not found');
  campaign.status = 'active';
  campaign.updatedAt = new Date().toISOString();
  saveAll(campaigns);
  return campaign;
}