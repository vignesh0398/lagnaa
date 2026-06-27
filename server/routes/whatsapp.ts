import { Router } from 'express';
import twilio from 'twilio';
import { processFlowInput } from '../ai/justiziaFlow.js';
import {
  addRecipients,
  createCampaign,
  deleteCampaign,
  findRecipientByPhone,
  getCampaign,
  listCampaigns,
  markCampaignActive,
  markCampaignSending,
  updateCampaign,
  updateRecipient,
} from '../ai/whatsappCampaignStore.js';
import {
  upsertFromChatSession,
  upsertOnCampaignSend,
  getChatTranscript,
  queryChatHistory,
} from '../ai/whatsappChatHistoryStore.js';
import {
  addWhatsAppMessage,
  endWhatsAppSession,
  getCampaignId,
  getOrCreateWhatsAppSession,
  getWhatsAppSession,
} from '../ai/whatsappSession.js';
import { isOnDnd } from '../contacts/contactsStore.js';
import { loadTwilioConfig } from '../config.js';
import { parseMetaInbound, testMetaConnection } from '../metaWhatsAppClient.js';
import { getWebhookBaseUrl } from '../tunnel.js';
import { getWhatsAppFromNumber, sendWhatsAppMessage, sendWhatsAppTemplate } from '../whatsappClient.js';
import {
  getActiveProvider,
  isProviderConfigured,
  loadWhatsAppProviderConfig,
  maskToken,
  saveWhatsAppProviderConfig,
  type WhatsAppProvider,
} from '../whatsappProviderStore.js';
import { getTwilioClient } from '../twilioClient.js';
import { dispatchWebhook } from '../integrationsStore.js';
import { syncOutcomeToGhl } from '../ghlSync.js';

const router = Router();
const MessagingResponse = twilio.twiml.MessagingResponse;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function stripWhatsAppPrefix(from: string): string {
  return from.replace(/^whatsapp:/i, '');
}

function buildStatus() {
  const config = loadWhatsAppProviderConfig();
  const webhookBase = getWebhookBaseUrl();
  const provider = getActiveProvider();
  const twilioConnected = isProviderConfigured('twilio');
  const metaConnected = isProviderConfigured('meta');

  return {
    provider,
    configured: isProviderConfigured(provider),
    twilio: {
      connected: twilioConnected,
      whatsappNumber: provider === 'twilio' ? getWhatsAppFromNumber() : config.twilio.whatsappNumber ?? null,
      whatsappContentSid: config.twilio.whatsappContentSid ?? null,
    },
    meta: {
      connected: metaConnected,
      phoneNumberId: config.meta.phoneNumberId ?? null,
      businessAccountId: config.meta.businessAccountId ?? null,
      displayPhoneNumber: config.meta.displayPhoneNumber ?? null,
      templateName: config.meta.templateName ?? null,
      templateLanguage: config.meta.templateLanguage ?? 'en',
      verifyToken: config.meta.verifyToken ?? null,
      hasAccessToken: Boolean(config.meta.accessToken),
      accessTokenMasked: config.meta.accessToken ? maskToken(config.meta.accessToken) : null,
    },
    webhookUrl: webhookBase ? `${webhookBase}/api/whatsapp/webhook` : null,
    webhookReady: Boolean(webhookBase),
    providers: [
      {
        id: 'twilio' as WhatsAppProvider,
        label: 'Twilio WhatsApp',
        description: 'Use your Twilio account — sandbox for testing, approved sender for production.',
        connected: twilioConnected,
        active: provider === 'twilio',
      },
      {
        id: 'meta' as WhatsAppProvider,
        label: 'WhatsApp Business (Meta Cloud API)',
        description: 'Connect your Meta Business account directly — no Twilio middleman.',
        connected: metaConnected,
        active: provider === 'meta',
      },
    ],
    sandboxHint:
      provider === 'twilio'
        ? 'Twilio: join sandbox by sending join code to +1 415 523 8886 from your phone.'
        : 'Meta: create app at developers.facebook.com → WhatsApp → API Setup, then paste credentials below.',
  };
}

router.get('/status', (_req, res) => {
  res.json(buildStatus());
});

router.put('/config', (req, res) => {
  const body = req.body as {
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
  };

  const current = loadWhatsAppProviderConfig();
  const updates: Parameters<typeof saveWhatsAppProviderConfig>[0] = {};

  if (body.provider) updates.provider = body.provider;

  if (body.twilio) {
    updates.twilio = {
      whatsappNumber: body.twilio.whatsappNumber?.trim(),
      whatsappContentSid: body.twilio.whatsappContentSid?.trim(),
    };
  }

  if (body.meta) {
    updates.meta = {
      phoneNumberId: body.meta.phoneNumberId?.trim(),
      businessAccountId: body.meta.businessAccountId?.trim(),
      verifyToken: body.meta.verifyToken?.trim(),
      displayPhoneNumber: body.meta.displayPhoneNumber?.trim(),
      templateName: body.meta.templateName?.trim(),
      templateLanguage: body.meta.templateLanguage?.trim() || 'en',
    };
    if (body.meta.accessToken?.trim()) {
      updates.meta.accessToken = body.meta.accessToken.trim();
    } else {
      updates.meta.accessToken = current.meta.accessToken;
    }
  }

  saveWhatsAppProviderConfig(updates);
  res.json({ success: true, ...buildStatus() });
});

router.post('/test-connection', async (req, res) => {
  const { provider } = req.body as { provider?: WhatsAppProvider };
  const active = provider ?? getActiveProvider();

  if (active === 'meta') {
    const result = await testMetaConnection();
    return res.json(result);
  }

  const client = getTwilioClient();
  const config = loadTwilioConfig();
  if (!client || !config) {
    return res.json({ ok: false, message: 'Twilio not connected. Go to Connections first.' });
  }

  try {
    const account = await client.api.accounts(config.accountSid).fetch();
    return res.json({
      ok: true,
      message: `Twilio connected — ${account.friendlyName}. WhatsApp sender: ${getWhatsAppFromNumber() ?? 'not set'}`,
    });
  } catch (err) {
    return res.json({ ok: false, message: err instanceof Error ? err.message : 'Twilio test failed' });
  }
});

router.get('/history', (req, res) => {
  const result = queryChatHistory({
    dateRange: (req.query.dateRange as string) || 'all',
    dateFrom: req.query.dateFrom as string | undefined,
    dateTo: req.query.dateTo as string | undefined,
    filterColumn: (req.query.filterColumn as string) || '',
    filterValue: (req.query.filterValue as string) || '',
    campaignId: req.query.campaignId as string | undefined,
  });
  res.json(result);
});

router.get('/history/:id/transcript', (req, res) => {
  const transcript = getChatTranscript(req.params.id);
  res.json({ transcript });
});

router.get('/campaigns', (_req, res) => {
  res.json({ campaigns: listCampaigns() });
});

router.get('/campaigns/:id', (req, res) => {
  const campaign = getCampaign(req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
  res.json(campaign);
});

router.post('/campaigns', (req, res) => {
  try {
    const { name, template } = req.body as { name?: string; template?: string };
    if (!name?.trim()) return res.status(400).json({ error: 'Campaign name is required' });
    const campaign = createCampaign(name, template);
    res.json({ success: true, campaign });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Create failed' });
  }
});

router.put('/campaigns/:id', (req, res) => {
  try {
    const campaign = updateCampaign(req.params.id, req.body);
    res.json({ success: true, campaign });
  } catch (err) {
    res.status(404).json({ error: err instanceof Error ? err.message : 'Update failed' });
  }
});

router.delete('/campaigns/:id', (req, res) => {
  deleteCampaign(req.params.id);
  res.json({ success: true });
});

router.post('/campaigns/:id/recipients', (req, res) => {
  try {
    const { recipients } = req.body as {
      recipients?: { phone: string; clientName: string; expectedDob?: string; expectedPostcode?: string }[];
    };
    if (!recipients?.length) return res.status(400).json({ error: 'At least one recipient is required' });
    const campaign = addRecipients(req.params.id, recipients);
    res.json({ success: true, campaign });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to add recipients' });
  }
});

router.post('/campaigns/:id/send', async (req, res) => {
  const campaign = getCampaign(req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

  if (!isProviderConfigured(getActiveProvider())) {
    return res.status(400).json({ error: 'WhatsApp provider not configured. Complete setup below first.' });
  }

  const pending = campaign.recipients.filter((r) => r.status === 'pending');
  if (pending.length === 0) {
    return res.status(400).json({ error: 'No pending recipients. Add customers first.' });
  }

  markCampaignSending(campaign.id);

  const results: { phone: string; success: boolean; error?: string }[] = [];

  for (const recipient of pending) {
    if (isOnDnd(recipient.phone)) {
      updateRecipient(campaign.id, recipient.id, {
        status: 'opted_out',
        errorMessage: 'Contact on DND',
      });
      results.push({ phone: recipient.phone, success: false, error: 'Contact on DND' });
      continue;
    }
    try {
      const { sid } = await sendWhatsAppTemplate(recipient.phone, campaign.template, {
        clientName: recipient.clientName,
      });

      const sentAt = new Date().toISOString();
      const updated = updateRecipient(campaign.id, recipient.id, {
        status: 'sent',
        messageSid: sid,
        sentAt,
      });
      upsertOnCampaignSend(campaign.id, campaign.name, updated);
      results.push({ phone: recipient.phone, success: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Send failed';
      updateRecipient(campaign.id, recipient.id, {
        status: 'failed',
        errorMessage: msg,
      });
      results.push({ phone: recipient.phone, success: false, error: msg });
    }
    await sleep(400);
  }

  markCampaignActive(campaign.id);

  const sentCount = results.filter((r) => r.success).length;
  if (sentCount > 0) {
    void dispatchWebhook('campaign_sent', {
      channel: 'whatsapp',
      campaignId: campaign.id,
      campaignName: campaign.name,
      sent: sentCount,
      failed: results.filter((r) => !r.success).length,
    });
  }

  res.json({
    success: true,
    sent: sentCount,
    failed: results.filter((r) => !r.success).length,
    results,
    campaign: getCampaign(campaign.id),
  });
});

function persistChatHistory(phone: string): void {
  const fresh = findRecipientByPhone(phone);
  if (!fresh) return;
  const session = getWhatsAppSession(phone);
  if (!session) return;
  upsertFromChatSession(fresh.campaign.id, fresh.campaign.name, fresh.recipient, session);
}

async function handleInboundMessage(from: string, body: string): Promise<void> {
  const phone = stripWhatsAppPrefix(from);
  const text = body.trim();
  if (!text) return;

  const match = findRecipientByPhone(phone);
  const clientName = match?.recipient.clientName ?? 'there';
  const campaignId = match?.campaign.id;

  const session = getOrCreateWhatsAppSession(
    phone,
    clientName,
    match?.recipient.expectedDob,
    match?.recipient.expectedPostcode,
    campaignId
  );

  addWhatsAppMessage(phone, 'user', text);

  if (match && ['sent', 'delivered'].includes(match.recipient.status)) {
    updateRecipient(match.campaign.id, match.recipient.id, {
      status: 'replied',
      repliedAt: new Date().toISOString(),
      lastMessage: text,
    });
  } else if (match) {
    updateRecipient(match.campaign.id, match.recipient.id, {
      status: 'in_flow',
      lastMessage: text,
    });
  }

  persistChatHistory(phone);

  const lower = text.toLowerCase();
  if (/\b(stop|unsubscribe|opt out|optout)\b/.test(lower)) {
    if (match) {
      updateRecipient(match.campaign.id, match.recipient.id, {
        status: 'opted_out',
        outcome: 'DND Requested',
        completedAt: new Date().toISOString(),
      });
    }
    await sendWhatsAppMessage(phone, 'Understood. You will not be contacted again via WhatsApp. Thank you.');
    addWhatsAppMessage(phone, 'assistant', 'Understood. You will not be contacted again via WhatsApp. Thank you.');
    session.outcomes.dnd = true;
    session.outcomes.finalOutcome = 'DND Requested';
    session.endedAt = new Date();
    session.endedBy = 'customer';
    if (match) {
      upsertFromChatSession(match.campaign.id, match.campaign.name, match.recipient, session);
    }
    const dndPayload = {
      channel: 'whatsapp',
      customerName: session.clientName,
      phone,
      outcome: 'DND Requested',
      campaignId: match?.campaign.id,
    };
    void dispatchWebhook('dnd_requested', dndPayload);
    void syncOutcomeToGhl(dndPayload);
    endWhatsAppSession(phone);
    return;
  }

  const action = await processFlowInput(session, text);
  addWhatsAppMessage(phone, 'assistant', action.say);
  await sendWhatsAppMessage(phone, action.say);

  const cid = getCampaignId(session) ?? match?.campaign.id;
  const rid = match?.recipient.id;

  if (action.type === 'end' && cid && rid) {
    const completed = updateRecipient(cid, rid, {
      status: 'completed',
      outcome: action.outcome,
      completedAt: new Date().toISOString(),
    });
    session.outcomes.finalOutcome = action.outcome;
    if (action.outcome === 'Consent Given') session.outcomes.consentGiven = true;
    session.endedAt = new Date();
    session.endedBy = 'agent';
    upsertFromChatSession(cid, match!.campaign.name, completed, session);
    const syncPayload = {
      channel: 'whatsapp',
      customerName: session.clientName,
      phone,
      outcome: action.outcome,
      campaignId: cid,
    };
    void dispatchWebhook(action.outcome === 'Consent Given' ? 'consent_given' : 'chat_completed', syncPayload);
    void syncOutcomeToGhl(syncPayload);
    endWhatsAppSession(phone);
  } else if (cid && rid) {
    const updated = updateRecipient(cid, rid, { status: 'in_flow' });
    upsertFromChatSession(cid, match!.campaign.name, updated, session);
  } else {
    persistChatHistory(phone);
  }
}

router.get('/webhook', (req, res) => {
  const config = loadWhatsAppProviderConfig();
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === config.meta.verifyToken) {
    console.log('[WhatsApp] Meta webhook verified');
    return res.status(200).send(challenge);
  }

  return res.status(403).send('Forbidden');
});

router.post('/webhook', async (req, res) => {
  const metaInbound = parseMetaInbound(req.body);

  if (metaInbound) {
    console.log(`[WhatsApp/Meta] Inbound from ${metaInbound.from}: ${metaInbound.text.slice(0, 120)}`);
    try {
      await handleInboundMessage(metaInbound.from, metaInbound.text);
    } catch (err) {
      console.error('[WhatsApp/Meta] Webhook error:', err);
    }
    return res.sendStatus(200);
  }

  const from = (req.body.From as string) ?? '';
  const body = (req.body.Body as string) ?? '';

  if (from && body) {
    console.log(`[WhatsApp/Twilio] Inbound from ${from}: ${body.slice(0, 120)}`);
    try {
      await handleInboundMessage(from, body);
    } catch (err) {
      console.error('[WhatsApp/Twilio] Webhook error:', err);
    }
  }

  const twiml = new MessagingResponse();
  res.type('text/xml').send(twiml.toString());
});

export default router;