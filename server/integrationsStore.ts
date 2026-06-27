import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export type WebhookEvent =
  | 'consent_given'
  | 'call_completed'
  | 'chat_completed'
  | 'campaign_sent'
  | 'dnd_requested';

export interface WebhookDelivery {
  id: string;
  event: WebhookEvent;
  url: string;
  status: number | 'error';
  at: string;
  payloadPreview: string;
}

export interface IntegrationsConfig {
  apiKey: string;
  apiKeyCreatedAt: string;
  outboundWebhookUrl: string;
  outboundWebhookSecret: string;
  enabledEvents: WebhookEvent[];
  deliveries: WebhookDelivery[];
}

const STORE_PATH = path.join(process.cwd(), 'server', 'data', 'integrations.json');

const DEFAULT_EVENTS: WebhookEvent[] = ['consent_given', 'call_completed', 'chat_completed'];

function generateApiKey(): string {
  return `lg_${crypto.randomBytes(24).toString('hex')}`;
}

function generateSecret(): string {
  return crypto.randomBytes(16).toString('hex');
}

function loadConfig(): IntegrationsConfig {
  if (fs.existsSync(STORE_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8')) as IntegrationsConfig;
    } catch {
      /* fall through */
    }
  }
  const now = new Date().toISOString();
  return {
    apiKey: generateApiKey(),
    apiKeyCreatedAt: now,
    outboundWebhookUrl: '',
    outboundWebhookSecret: generateSecret(),
    enabledEvents: [...DEFAULT_EVENTS],
    deliveries: [],
  };
}

function saveConfig(config: IntegrationsConfig): void {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(config, null, 2));
}

export function getIntegrationsConfig(): IntegrationsConfig {
  const config = loadConfig();
  if (!fs.existsSync(STORE_PATH)) saveConfig(config);
  return config;
}

export function updateIntegrationsConfig(updates: {
  outboundWebhookUrl?: string;
  enabledEvents?: WebhookEvent[];
}): IntegrationsConfig {
  const config = getIntegrationsConfig();
  if (updates.outboundWebhookUrl !== undefined) {
    config.outboundWebhookUrl = updates.outboundWebhookUrl.trim();
  }
  if (updates.enabledEvents) config.enabledEvents = updates.enabledEvents;
  saveConfig(config);
  return config;
}

export function regenerateApiKey(): IntegrationsConfig {
  const config = getIntegrationsConfig();
  config.apiKey = generateApiKey();
  config.apiKeyCreatedAt = new Date().toISOString();
  saveConfig(config);
  return config;
}

export function regenerateWebhookSecret(): IntegrationsConfig {
  const config = getIntegrationsConfig();
  config.outboundWebhookSecret = generateSecret();
  saveConfig(config);
  return config;
}

export function maskApiKey(key: string): string {
  if (key.length <= 12) return '••••••••';
  return `${key.slice(0, 6)}••••${key.slice(-4)}`;
}

export async function dispatchWebhook(
  event: WebhookEvent,
  payload: Record<string, unknown>
): Promise<WebhookDelivery | null> {
  const config = getIntegrationsConfig();
  if (!config.outboundWebhookUrl || !config.enabledEvents.includes(event)) return null;

  const delivery: WebhookDelivery = {
    id: `wh-${Date.now()}`,
    event,
    url: config.outboundWebhookUrl,
    status: 0,
    at: new Date().toISOString(),
    payloadPreview: JSON.stringify(payload).slice(0, 120),
  };

  try {
    const response = await fetch(config.outboundWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Lagnaa-Event': event,
        'X-Lagnaa-Signature': config.outboundWebhookSecret,
      },
      body: JSON.stringify({ event, timestamp: delivery.at, data: payload }),
    });
    delivery.status = response.status;
  } catch {
    delivery.status = 'error';
  }

  config.deliveries.unshift(delivery);
  config.deliveries = config.deliveries.slice(0, 50);
  saveConfig(config);
  return delivery;
}

export async function testOutboundWebhook(): Promise<{ ok: boolean; message: string; delivery?: WebhookDelivery }> {
  const config = getIntegrationsConfig();
  if (!config.outboundWebhookUrl) {
    return { ok: false, message: 'Set an outbound webhook URL first.' };
  }

  const delivery = await dispatchWebhook('consent_given', {
    test: true,
    message: 'Lagnaa webhook test — your integration is working.',
    customerName: 'Test Customer',
    channel: 'test',
  });

  if (!delivery) return { ok: false, message: 'Webhook event not enabled.' };
  if (delivery.status === 'error') return { ok: false, message: 'Request failed — check URL is reachable.', delivery };
  if (typeof delivery.status === 'number' && delivery.status >= 200 && delivery.status < 300) {
    return { ok: true, message: `Delivered successfully (HTTP ${delivery.status}).`, delivery };
  }
  return { ok: false, message: `Remote returned HTTP ${delivery.status}.`, delivery };
}