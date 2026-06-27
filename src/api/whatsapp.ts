export type WhatsAppProvider = 'twilio' | 'meta';

export interface ProviderOption {
  id: WhatsAppProvider;
  label: string;
  description: string;
  connected: boolean;
  active: boolean;
}

export interface WhatsAppStatus {
  provider: WhatsAppProvider;
  configured: boolean;
  twilio: {
    connected: boolean;
    whatsappNumber: string | null;
    whatsappContentSid: string | null;
  };
  meta: {
    connected: boolean;
    phoneNumberId: string | null;
    businessAccountId: string | null;
    displayPhoneNumber: string | null;
    templateName: string | null;
    templateLanguage: string;
    verifyToken: string | null;
    hasAccessToken: boolean;
    accessTokenMasked: string | null;
  };
  webhookUrl: string | null;
  webhookReady: boolean;
  providers: ProviderOption[];
  sandboxHint: string;
}

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
}

export interface WhatsAppConfigInput {
  provider?: WhatsAppProvider;
  twilio?: { whatsappNumber?: string; whatsappContentSid?: string };
  meta?: {
    phoneNumberId?: string;
    accessToken?: string;
    businessAccountId?: string;
    verifyToken?: string;
    displayPhoneNumber?: string;
    templateName?: string;
    templateLanguage?: string;
  };
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

export function getWhatsAppStatus() {
  return api<WhatsAppStatus>('/api/whatsapp/status');
}

export function updateWhatsAppConfig(config: WhatsAppConfigInput) {
  return api<WhatsAppStatus & { success: boolean }>('/api/whatsapp/config', {
    method: 'PUT',
    body: JSON.stringify(config),
  });
}

export function testWhatsAppConnection(provider?: WhatsAppProvider) {
  return api<{ ok: boolean; message: string }>('/api/whatsapp/test-connection', {
    method: 'POST',
    body: JSON.stringify({ provider }),
  });
}

export function getCampaigns() {
  return api<{ campaigns: WhatsAppCampaign[] }>('/api/whatsapp/campaigns');
}

export function getCampaign(id: string) {
  return api<WhatsAppCampaign>(`/api/whatsapp/campaigns/${id}`);
}

export function createCampaign(name: string, template?: string) {
  return api<{ success: boolean; campaign: WhatsAppCampaign }>('/api/whatsapp/campaigns', {
    method: 'POST',
    body: JSON.stringify({ name, template }),
  });
}

export function updateCampaign(id: string, updates: { name?: string; template?: string }) {
  return api<{ success: boolean; campaign: WhatsAppCampaign }>(`/api/whatsapp/campaigns/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export function deleteCampaign(id: string) {
  return api<{ success: boolean }>(`/api/whatsapp/campaigns/${id}`, { method: 'DELETE' });
}

export function addRecipients(
  campaignId: string,
  recipients: { phone: string; clientName: string; expectedDob?: string; expectedPostcode?: string }[]
) {
  return api<{ success: boolean; campaign: WhatsAppCampaign }>(`/api/whatsapp/campaigns/${campaignId}/recipients`, {
    method: 'POST',
    body: JSON.stringify({ recipients }),
  });
}

export function sendCampaign(campaignId: string) {
  return api<{
    success: boolean;
    sent: number;
    failed: number;
    campaign: WhatsAppCampaign;
  }>(`/api/whatsapp/campaigns/${campaignId}/send`, { method: 'POST' });
}

export interface ChatHistoryStats {
  total: number;
  ended: number;
  awaiting: number;
  successful: number;
  inProgress: number;
  consentGiven: number;
}

export function getChatHistory(params?: {
  dateRange?: string;
  dateFrom?: string;
  dateTo?: string;
  filterColumn?: string;
  filterValue?: string;
  campaignId?: string;
}) {
  const qs = new URLSearchParams();
  if (params?.dateRange) qs.set('dateRange', params.dateRange);
  if (params?.dateFrom) qs.set('dateFrom', params.dateFrom);
  if (params?.dateTo) qs.set('dateTo', params.dateTo);
  if (params?.filterColumn) qs.set('filterColumn', params.filterColumn);
  if (params?.filterValue) qs.set('filterValue', params.filterValue);
  if (params?.campaignId) qs.set('campaignId', params.campaignId);
  const q = qs.toString();
  return api<{ chats: import('../types/chats').ChatHistoryRecord[]; stats: ChatHistoryStats }>(
    `/api/whatsapp/history${q ? `?${q}` : ''}`
  );
}

export function getChatTranscript(sessionId: string) {
  return api<{ transcript: string }>(`/api/whatsapp/history/${sessionId}/transcript`);
}

export function parseRecipientCsv(text: string): {
  phone: string;
  clientName: string;
  expectedDob?: string;
  expectedPostcode?: string;
}[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];

  const header = lines[0].toLowerCase();
  const hasHeader = header.includes('phone') || header.includes('name');

  const rows = hasHeader ? lines.slice(1) : lines;
  return rows
    .map((line) => {
      const parts = line.split(/[,;\t]/).map((p) => p.trim());
      return {
        phone: parts[0] ?? '',
        clientName: parts[1] ?? 'there',
        expectedDob: parts[2],
        expectedPostcode: parts[3],
      };
    })
    .filter((r) => r.phone);
}