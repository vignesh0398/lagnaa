import fs from 'fs';
import path from 'path';

export type EmailRecipientStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'replied'
  | 'in_flow'
  | 'completed'
  | 'failed'
  | 'opted_out';

export interface EmailCampaignRecipient {
  id: string;
  email: string;
  clientName: string;
  expectedDob?: string;
  expectedPostcode?: string;
  status: EmailRecipientStatus;
  outcome?: string;
  lastMessage?: string;
  messageId?: string;
  errorMessage?: string;
  sentAt?: string;
  repliedAt?: string;
  completedAt?: string;
}

export interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  template: string;
  status: 'draft' | 'sending' | 'active' | 'completed' | 'paused';
  recipients: EmailCampaignRecipient[];
  sentCount: number;
  repliedCount: number;
  completedCount: number;
  consentCount: number;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
}

const STORE_PATH = path.join(process.cwd(), 'server', 'data', 'email-campaigns.json');

export const DEFAULT_EMAIL_SUBJECT = 'Important update regarding your Plevin claim — {{clientName}}';

export const DEFAULT_EMAIL_TEMPLATE = `Dear {{clientName}},

I'm Mia from Justizia Law.

You previously had a Plevin claim handled by Sandstone Legal, which has since gone into administration. Because of this, your case may qualify for a free professional negligence review conducted by Hugh James Solicitors.

May I speak with you regarding this? Simply reply YES to this email to continue, or reply STOP to opt out.

Kind regards,
Mia
Justizia Law`;

function loadAll(): EmailCampaign[] {
  if (!fs.existsSync(STORE_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8')) as EmailCampaign[];
  } catch {
    return [];
  }
}

function saveAll(campaigns: EmailCampaign[]): void {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(campaigns, null, 2));
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'email-campaign';
}

export function applyTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '');
}

export function normalizeEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const match = trimmed.match(/<([^>]+)>/);
  return (match ? match[1] : trimmed).trim();
}

export function listEmailCampaigns(): EmailCampaign[] {
  return loadAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getEmailCampaign(id: string): EmailCampaign | undefined {
  return loadAll().find((c) => c.id === id);
}

export function createEmailCampaign(name: string, subject?: string, template?: string): EmailCampaign {
  const campaigns = loadAll();
  let id = slugify(name);
  let n = 1;
  while (campaigns.some((c) => c.id === id)) id = `${slugify(name)}-${n++}`;

  const campaign: EmailCampaign = {
    id,
    name: name.trim(),
    subject: subject?.trim() || DEFAULT_EMAIL_SUBJECT,
    template: template?.trim() || DEFAULT_EMAIL_TEMPLATE,
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

export function updateEmailCampaign(
  id: string,
  updates: Partial<Pick<EmailCampaign, 'name' | 'subject' | 'template' | 'status'>>
): EmailCampaign {
  const campaigns = loadAll();
  const idx = campaigns.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error('Campaign not found');
  if (updates.name) campaigns[idx].name = updates.name.trim();
  if (updates.subject) campaigns[idx].subject = updates.subject.trim();
  if (updates.template) campaigns[idx].template = updates.template.trim();
  if (updates.status) campaigns[idx].status = updates.status;
  campaigns[idx].updatedAt = new Date().toISOString();
  saveAll(campaigns);
  return campaigns[idx];
}

export function deleteEmailCampaign(id: string): void {
  saveAll(loadAll().filter((c) => c.id !== id));
}

export function addEmailRecipients(
  campaignId: string,
  rows: { email: string; clientName: string; expectedDob?: string; expectedPostcode?: string }[]
): EmailCampaign {
  const campaigns = loadAll();
  const idx = campaigns.findIndex((c) => c.id === campaignId);
  if (idx === -1) throw new Error('Campaign not found');

  const existing = new Set(campaigns[idx].recipients.map((r) => normalizeEmail(r.email)));

  for (const row of rows) {
    const email = normalizeEmail(row.email);
    if (!email || !email.includes('@') || existing.has(email)) continue;
    existing.add(email);
    campaigns[idx].recipients.push({
      id: `ercp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      email,
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

export function findRecipientByEmail(email: string): { campaign: EmailCampaign; recipient: EmailCampaignRecipient } | null {
  const norm = normalizeEmail(email);
  for (const campaign of loadAll()) {
    const recipient = campaign.recipients.find((r) => normalizeEmail(r.email) === norm);
    if (recipient) return { campaign, recipient };
  }
  return null;
}

export function updateEmailRecipient(
  campaignId: string,
  recipientId: string,
  updates: Partial<EmailCampaignRecipient>
): EmailCampaignRecipient {
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

export function markEmailCampaignSending(id: string): EmailCampaign {
  const campaigns = loadAll();
  const campaign = campaigns.find((c) => c.id === id);
  if (!campaign) throw new Error('Campaign not found');
  campaign.status = 'sending';
  campaign.startedAt = campaign.startedAt ?? new Date().toISOString();
  campaign.updatedAt = new Date().toISOString();
  saveAll(campaigns);
  return campaign;
}

export function markEmailCampaignActive(id: string): EmailCampaign {
  const campaigns = loadAll();
  const campaign = campaigns.find((c) => c.id === id);
  if (!campaign) throw new Error('Campaign not found');
  campaign.status = 'active';
  campaign.updatedAt = new Date().toISOString();
  saveAll(campaigns);
  return campaign;
}