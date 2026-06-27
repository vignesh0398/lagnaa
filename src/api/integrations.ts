export type WebhookEvent = 'consent_given' | 'call_completed' | 'chat_completed' | 'campaign_sent' | 'dnd_requested';

export interface IntegrationsConfig {
  apiKeyMasked: string;
  apiKeyCreatedAt: string;
  outboundWebhookUrl: string;
  webhookSecretMasked: string;
  enabledEvents: WebhookEvent[];
  deliveries: {
    id: string;
    event: WebhookEvent;
    url: string;
    status: number | 'error';
    at: string;
    payloadPreview: string;
  }[];
  inboundWebhooks: { name: string; url: string; provider: string }[];
  webhookReady: boolean;
  endpoints: { method: string; path: string; description: string; auth?: boolean }[];
  authHeader: string;
}

export const WEBHOOK_EVENTS: { id: WebhookEvent; label: string }[] = [
  { id: 'consent_given', label: 'Consent Given' },
  { id: 'call_completed', label: 'Call Completed' },
  { id: 'chat_completed', label: 'Chat / Email Completed' },
  { id: 'campaign_sent', label: 'Campaign Sent' },
  { id: 'dnd_requested', label: 'DND Requested' },
];

export function getIntegrationsConfig() {
  return fetch('/api/integrations/config').then((r) => {
    if (!r.ok) throw new Error('Failed to load');
    return r.json() as Promise<IntegrationsConfig>;
  });
}

export function revealApiKey() {
  return fetch('/api/integrations/api-key').then((r) => r.json() as Promise<{ apiKey: string }>);
}

export function regenerateApiKey() {
  return fetch('/api/integrations/api-key/regenerate', { method: 'POST' }).then((r) => r.json());
}

export function updateIntegrationsConfig(data: { outboundWebhookUrl?: string; enabledEvents?: WebhookEvent[] }) {
  return fetch('/api/integrations/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then((r) => {
    if (!r.ok) throw new Error('Save failed');
    return r.json();
  });
}

export function testOutboundWebhook() {
  return fetch('/api/integrations/webhook/test', { method: 'POST' }).then((r) => r.json()) as Promise<{
    ok: boolean;
    message: string;
  }>;
}