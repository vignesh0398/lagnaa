import { Router } from 'express';
import {
  getIntegrationsConfig,
  maskApiKey,
  regenerateApiKey,
  regenerateWebhookSecret,
  testOutboundWebhook,
  updateIntegrationsConfig,
  type WebhookEvent,
} from '../integrationsStore.js';
import { getWebhookBaseUrl } from '../tunnel.js';

const router = Router();

const API_ENDPOINTS = [
  { method: 'GET', path: '/api/health', description: 'Service health check' },
  { method: 'GET', path: '/api/analytics/hub', description: 'Full analytics dashboard data', auth: true },
  { method: 'GET', path: '/api/twilio/calls', description: 'Call history with filters', auth: true },
  { method: 'POST', path: '/api/twilio/call', description: 'Place outbound AI voice call', auth: true },
  { method: 'GET', path: '/api/whatsapp/campaigns', description: 'List WhatsApp campaigns', auth: true },
  { method: 'POST', path: '/api/whatsapp/campaigns/:id/send', description: 'Send WhatsApp campaign', auth: true },
  { method: 'GET', path: '/api/whatsapp/history', description: 'WhatsApp chat history', auth: true },
  { method: 'GET', path: '/api/email/campaigns', description: 'List email campaigns', auth: true },
  { method: 'POST', path: '/api/email/campaigns/:id/send', description: 'Send email campaign', auth: true },
  { method: 'GET', path: '/api/email/history', description: 'Email conversation history', auth: true },
  { method: 'GET', path: '/api/knowledge', description: 'Knowledge bases', auth: true },
  { method: 'GET', path: '/api/prompts', description: 'Agent prompts', auth: true },
  { method: 'GET', path: '/api/billing/usage', description: 'Billing usage and cost breakdown', auth: true },
  { method: 'GET', path: '/api/billing/plan', description: 'Current plan and available tiers', auth: true },
  { method: 'GET', path: '/api/ghl/config', description: 'GoHighLevel sync configuration', auth: true },
  { method: 'POST', path: '/api/ghl/sync/import', description: 'Import contacts from GoHighLevel', auth: true },
];

function buildInboundWebhooks() {
  const base = getWebhookBaseUrl();
  if (!base) return [];
  return [
    { name: 'AI Voice (Twilio)', url: `${base}/api/twilio/voice/ai-start`, provider: 'Twilio' },
    { name: 'Voice Status', url: `${base}/api/twilio/status`, provider: 'Twilio' },
    { name: 'WhatsApp Inbound', url: `${base}/api/whatsapp/webhook`, provider: 'Twilio / Meta' },
    { name: 'Email Inbound', url: `${base}/api/email/webhook/inbound`, provider: 'SendGrid / Mailgun' },
    { name: 'GoHighLevel Tag Trigger', url: `${base}/api/ghl/webhook/inbound`, provider: 'GoHighLevel' },
  ];
}

router.get('/config', (_req, res) => {
  const config = getIntegrationsConfig();
  res.json({
    apiKeyMasked: maskApiKey(config.apiKey),
    apiKeyCreatedAt: config.apiKeyCreatedAt,
    outboundWebhookUrl: config.outboundWebhookUrl,
    webhookSecretMasked: maskApiKey(config.outboundWebhookSecret),
    enabledEvents: config.enabledEvents,
    deliveries: config.deliveries.slice(0, 20),
    inboundWebhooks: buildInboundWebhooks(),
    webhookReady: Boolean(getWebhookBaseUrl()),
    endpoints: API_ENDPOINTS,
    authHeader: 'Authorization: Bearer <your-api-key>',
  });
});

router.get('/api-key', (_req, res) => {
  const config = getIntegrationsConfig();
  res.json({ apiKey: config.apiKey });
});

router.post('/api-key/regenerate', (_req, res) => {
  const config = regenerateApiKey();
  res.json({ success: true, apiKey: config.apiKey, apiKeyCreatedAt: config.apiKeyCreatedAt });
});

router.put('/config', (req, res) => {
  const { outboundWebhookUrl, enabledEvents } = req.body as {
    outboundWebhookUrl?: string;
    enabledEvents?: WebhookEvent[];
  };
  const config = updateIntegrationsConfig({ outboundWebhookUrl, enabledEvents });
  res.json({ success: true, outboundWebhookUrl: config.outboundWebhookUrl, enabledEvents: config.enabledEvents });
});

router.post('/webhook-secret/regenerate', (_req, res) => {
  const config = regenerateWebhookSecret();
  res.json({ success: true, webhookSecret: config.outboundWebhookSecret });
});

router.post('/webhook/test', async (_req, res) => {
  res.json(await testOutboundWebhook());
});

export default router;