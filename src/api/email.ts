export type EmailProvider = 'smtp' | 'resend' | 'sendgrid';

export interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  template: string;
  status: 'draft' | 'sending' | 'active' | 'completed' | 'paused';
  recipients: EmailRecipient[];
  sentCount: number;
  repliedCount: number;
  completedCount: number;
  consentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface EmailRecipient {
  id: string;
  email: string;
  clientName: string;
  expectedDob?: string;
  expectedPostcode?: string;
  status: string;
  outcome?: string;
  lastMessage?: string;
  errorMessage?: string;
  sentAt?: string;
  repliedAt?: string;
  completedAt?: string;
}

export interface EmailStatus {
  provider: EmailProvider;
  configured: boolean;
  fromEmail: string | null;
  fromName: string | null;
  replyTo: string | null;
  webhookUrl: string | null;
  webhookReady: boolean;
  inboundHint: string;
  providers: { id: EmailProvider; label: string; description: string; connected: boolean; active: boolean }[];
  smtp: { connected: boolean; host: string | null; port: number; user: string | null; hasPassword: boolean };
  resend: { connected: boolean; hasApiKey: boolean; apiKeyMasked: string | null };
  sendgrid: { connected: boolean; hasApiKey: boolean; apiKeyMasked: string | null };
}

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data as T;
}

export function getEmailStatus() {
  return api<EmailStatus>('/api/email/status');
}

export function updateEmailConfig(config: Record<string, unknown>) {
  return api<EmailStatus & { success: boolean }>('/api/email/config', {
    method: 'PUT',
    body: JSON.stringify(config),
  });
}

export function testEmailConnection() {
  return api<{ ok: boolean; message: string }>('/api/email/test-connection', { method: 'POST' });
}

export function getEmailCampaigns() {
  return api<{ campaigns: EmailCampaign[] }>('/api/email/campaigns');
}

export function createEmailCampaign(name: string, subject?: string, template?: string) {
  return api<{ success: boolean; campaign: EmailCampaign }>('/api/email/campaigns', {
    method: 'POST',
    body: JSON.stringify({ name, subject, template }),
  });
}

export function updateEmailCampaign(id: string, updates: { name?: string; subject?: string; template?: string }) {
  return api<{ success: boolean; campaign: EmailCampaign }>(`/api/email/campaigns/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export function deleteEmailCampaign(id: string) {
  return api<{ success: boolean }>(`/api/email/campaigns/${id}`, { method: 'DELETE' });
}

export function addEmailRecipients(
  campaignId: string,
  recipients: { email: string; clientName: string; expectedDob?: string; expectedPostcode?: string }[]
) {
  return api<{ success: boolean; campaign: EmailCampaign }>(`/api/email/campaigns/${campaignId}/recipients`, {
    method: 'POST',
    body: JSON.stringify({ recipients }),
  });
}

export function sendEmailCampaign(campaignId: string) {
  return api<{ success: boolean; sent: number; failed: number; campaign: EmailCampaign }>(
    `/api/email/campaigns/${campaignId}/send`,
    { method: 'POST' }
  );
}

export function getEmailHistory(params?: Record<string, string | undefined>) {
  const qs = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([k, v]) => v && qs.set(k, v));
  const q = qs.toString();
  return api<{ emails: import('../types/emails').EmailHistoryRecord[]; stats: Record<string, number> }>(
    `/api/email/history${q ? `?${q}` : ''}`
  );
}

export function getEmailTranscript(id: string) {
  return api<{ transcript: string }>(`/api/email/history/${id}/transcript`);
}

export function parseEmailRecipientCsv(text: string) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const header = lines[0].toLowerCase();
  const hasHeader = header.includes('email') || header.includes('name');
  const rows = hasHeader ? lines.slice(1) : lines;
  return rows
    .map((line) => {
      const parts = line.split(/[,;\t]/).map((p) => p.trim());
      return {
        email: parts[0] ?? '',
        clientName: parts[1] ?? 'there',
        expectedDob: parts[2],
        expectedPostcode: parts[3],
      };
    })
    .filter((r) => r.email.includes('@'));
}