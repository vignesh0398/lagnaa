import { Router } from 'express';
import { processFlowInput } from '../ai/justiziaFlow.js';
import { isOnDnd } from '../contacts/contactsStore.js';
import {
  addEmailRecipients,
  createEmailCampaign,
  deleteEmailCampaign,
  findRecipientByEmail,
  getEmailCampaign,
  listEmailCampaigns,
  markEmailCampaignActive,
  markEmailCampaignSending,
  normalizeEmail,
  updateEmailCampaign,
  updateEmailRecipient,
} from '../ai/emailCampaignStore.js';
import {
  upsertFromEmailSession,
  upsertOnEmailSend,
  getEmailTranscript,
  queryEmailHistory,
} from '../ai/emailChatHistoryStore.js';
import {
  addEmailMessage,
  endEmailSession,
  getEmailCampaignId,
  getEmailSession,
  getOrCreateEmailSession,
} from '../ai/emailSession.js';
import { sendEmail, sendEmailTemplate, testEmailConnection } from '../emailClient.js';
import {
  getActiveEmailProvider,
  isEmailProviderConfigured,
  loadEmailProviderConfig,
  maskSecret,
  saveEmailProviderConfig,
  type EmailProvider,
} from '../emailProviderStore.js';
import { getWebhookBaseUrl } from '../tunnel.js';
import { dispatchWebhook } from '../integrationsStore.js';
import { syncOutcomeToGhl } from '../ghlSync.js';

const router = Router();

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseInboundEmail(body: Record<string, unknown>): { from: string; text: string } | null {
  const from = String(body.from ?? body.sender ?? body.From ?? '');
  const text = String(
    body.text ??
      body['body-plain'] ??
      body['stripped-text'] ??
      body.Text ??
      (body.html ? stripHtml(String(body.html)) : '') ??
      ''
  ).trim();

  if (!from || !text) return null;
  return { from: normalizeEmail(from), text };
}

function buildStatus() {
  const config = loadEmailProviderConfig();
  const webhookBase = getWebhookBaseUrl();
  const provider = getActiveEmailProvider();

  return {
    provider,
    configured: isEmailProviderConfigured(provider),
    fromEmail: config.fromEmail || null,
    fromName: config.fromName || null,
    replyTo: config.replyTo ?? config.fromEmail ?? null,
    smtp: {
      connected: isEmailProviderConfigured('smtp'),
      host: config.smtp.host ?? null,
      port: config.smtp.port ?? 587,
      user: config.smtp.user ?? null,
      hasPassword: Boolean(config.smtp.pass),
    },
    resend: {
      connected: isEmailProviderConfigured('resend'),
      hasApiKey: Boolean(config.resend.apiKey),
      apiKeyMasked: config.resend.apiKey ? maskSecret(config.resend.apiKey) : null,
    },
    sendgrid: {
      connected: isEmailProviderConfigured('sendgrid'),
      hasApiKey: Boolean(config.sendgrid.apiKey),
      apiKeyMasked: config.sendgrid.apiKey ? maskSecret(config.sendgrid.apiKey) : null,
    },
    webhookUrl: webhookBase ? `${webhookBase}/api/email/webhook/inbound` : null,
    webhookReady: Boolean(webhookBase),
    providers: [
      {
        id: 'smtp' as EmailProvider,
        label: 'SMTP',
        description: 'Gmail, Outlook, or any SMTP server — great for testing.',
        connected: isEmailProviderConfigured('smtp'),
        active: provider === 'smtp',
      },
      {
        id: 'resend' as EmailProvider,
        label: 'Resend',
        description: 'Modern email API — fast setup, great deliverability.',
        connected: isEmailProviderConfigured('resend'),
        active: provider === 'resend',
      },
      {
        id: 'sendgrid' as EmailProvider,
        label: 'SendGrid',
        description: 'Twilio SendGrid — enterprise scale with inbound parse.',
        connected: isEmailProviderConfigured('sendgrid'),
        active: provider === 'sendgrid',
      },
    ],
    inboundHint:
      'Set inbound webhook to the URL above (SendGrid Inbound Parse, Mailgun, or Resend forwarding). Replies trigger the AI consent flow.',
  };
}

router.get('/status', (_req, res) => {
  res.json(buildStatus());
});

router.put('/config', (req, res) => {
  const body = req.body as Partial<{
    provider: EmailProvider;
    fromEmail: string;
    fromName: string;
    replyTo: string;
    smtp: { host?: string; port?: number; secure?: boolean; user?: string; pass?: string };
    resend: { apiKey?: string };
    sendgrid: { apiKey?: string };
  }>;

  const current = loadEmailProviderConfig();
  saveEmailProviderConfig({
    provider: body.provider ?? current.provider,
    fromEmail: body.fromEmail?.trim() ?? current.fromEmail,
    fromName: body.fromName?.trim() ?? current.fromName,
    replyTo: body.replyTo?.trim(),
    smtp: body.smtp
      ? {
          host: body.smtp.host?.trim(),
          port: body.smtp.port,
          secure: body.smtp.secure,
          user: body.smtp.user?.trim(),
          pass: body.smtp.pass?.trim() || current.smtp.pass,
        }
      : undefined,
    resend: body.resend?.apiKey !== undefined ? { apiKey: body.resend.apiKey.trim() } : undefined,
    sendgrid: body.sendgrid?.apiKey !== undefined ? { apiKey: body.sendgrid.apiKey.trim() } : undefined,
  });

  res.json({ success: true, ...buildStatus() });
});

router.post('/test-connection', async (_req, res) => {
  res.json(await testEmailConnection());
});

router.get('/history', (req, res) => {
  res.json(
    queryEmailHistory({
      dateRange: (req.query.dateRange as string) || 'all',
      dateFrom: req.query.dateFrom as string | undefined,
      dateTo: req.query.dateTo as string | undefined,
      filterColumn: (req.query.filterColumn as string) || '',
      filterValue: (req.query.filterValue as string) || '',
      campaignId: req.query.campaignId as string | undefined,
    })
  );
});

router.get('/history/:id/transcript', (req, res) => {
  res.json({ transcript: getEmailTranscript(req.params.id) });
});

router.get('/campaigns', (_req, res) => {
  res.json({ campaigns: listEmailCampaigns() });
});

router.get('/campaigns/:id', (req, res) => {
  const campaign = getEmailCampaign(req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
  res.json(campaign);
});

router.post('/campaigns', (req, res) => {
  try {
    const { name, subject, template } = req.body as { name?: string; subject?: string; template?: string };
    if (!name?.trim()) return res.status(400).json({ error: 'Campaign name is required' });
    const campaign = createEmailCampaign(name, subject, template);
    res.json({ success: true, campaign });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Create failed' });
  }
});

router.put('/campaigns/:id', (req, res) => {
  try {
    const campaign = updateEmailCampaign(req.params.id, req.body);
    res.json({ success: true, campaign });
  } catch (err) {
    res.status(404).json({ error: err instanceof Error ? err.message : 'Update failed' });
  }
});

router.delete('/campaigns/:id', (req, res) => {
  deleteEmailCampaign(req.params.id);
  res.json({ success: true });
});

router.post('/campaigns/:id/recipients', (req, res) => {
  try {
    const { recipients } = req.body as {
      recipients?: { email: string; clientName: string; expectedDob?: string; expectedPostcode?: string }[];
    };
    if (!recipients?.length) return res.status(400).json({ error: 'At least one recipient is required' });
    const campaign = addEmailRecipients(req.params.id, recipients);
    res.json({ success: true, campaign });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to add recipients' });
  }
});

router.post('/campaigns/:id/send', async (req, res) => {
  const campaign = getEmailCampaign(req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

  if (!isEmailProviderConfigured(getActiveEmailProvider())) {
    return res.status(400).json({ error: 'Email provider not configured.' });
  }

  const pending = campaign.recipients.filter((r) => r.status === 'pending');
  if (pending.length === 0) {
    return res.status(400).json({ error: 'No pending recipients.' });
  }

  markEmailCampaignSending(campaign.id);
  const results: { email: string; success: boolean; error?: string }[] = [];

  for (const recipient of pending) {
    if (isOnDnd(undefined, recipient.email)) {
      updateEmailRecipient(campaign.id, recipient.id, {
        status: 'opted_out',
        errorMessage: 'Contact on DND',
      });
      results.push({ email: recipient.email, success: false, error: 'Contact on DND' });
      continue;
    }
    try {
      const { id } = await sendEmailTemplate(
        recipient.email,
        campaign.subject,
        campaign.template,
        { clientName: recipient.clientName }
      );
      const sentAt = new Date().toISOString();
      const updated = updateEmailRecipient(campaign.id, recipient.id, {
        status: 'sent',
        messageId: id,
        sentAt,
      });
      upsertOnEmailSend(campaign.id, campaign.name, updated);
      results.push({ email: recipient.email, success: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Send failed';
      updateEmailRecipient(campaign.id, recipient.id, { status: 'failed', errorMessage: msg });
      results.push({ email: recipient.email, success: false, error: msg });
    }
    await sleep(300);
  }

  markEmailCampaignActive(campaign.id);

  const sentCount = results.filter((r) => r.success).length;
  if (sentCount > 0) {
    void dispatchWebhook('campaign_sent', {
      channel: 'email',
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
    campaign: getEmailCampaign(campaign.id),
  });
});

function persistEmailHistory(email: string): void {
  const match = findRecipientByEmail(email);
  if (!match) return;
  const session = getEmailSession(email);
  if (!session) return;
  upsertFromEmailSession(match.campaign.id, match.campaign.name, match.recipient, session);
}

async function handleInboundEmail(from: string, text: string): Promise<void> {
  const email = normalizeEmail(from);
  if (!text) return;

  const match = findRecipientByEmail(email);
  const clientName = match?.recipient.clientName ?? 'there';
  const campaignId = match?.campaign.id;

  const session = getOrCreateEmailSession(
    email,
    clientName,
    match?.recipient.expectedDob,
    match?.recipient.expectedPostcode,
    campaignId
  );

  addEmailMessage(email, 'user', text);

  if (match && ['sent', 'delivered'].includes(match.recipient.status)) {
    updateEmailRecipient(match.campaign.id, match.recipient.id, {
      status: 'replied',
      repliedAt: new Date().toISOString(),
      lastMessage: text.slice(0, 200),
    });
  } else if (match) {
    updateEmailRecipient(match.campaign.id, match.recipient.id, {
      status: 'in_flow',
      lastMessage: text.slice(0, 200),
    });
  }

  persistEmailHistory(email);

  const lower = text.toLowerCase();
  if (/\b(stop|unsubscribe|opt out|optout)\b/.test(lower)) {
    if (match) {
      updateEmailRecipient(match.campaign.id, match.recipient.id, {
        status: 'opted_out',
        outcome: 'DND Requested',
        completedAt: new Date().toISOString(),
      });
    }
    const reply = 'Understood. You will not be contacted again by email. Thank you.';
    await sendEmail(email, 'Re: Your request', reply);
    addEmailMessage(email, 'assistant', reply);
    session.outcomes.dnd = true;
    session.outcomes.finalOutcome = 'DND Requested';
    session.endedAt = new Date();
    session.endedBy = 'customer';
    if (match) upsertFromEmailSession(match.campaign.id, match.campaign.name, match.recipient, session);
    const dndPayload = {
      channel: 'email',
      customerName: session.clientName,
      email,
      outcome: 'DND Requested',
      campaignId: match?.campaign.id,
    };
    void dispatchWebhook('dnd_requested', dndPayload);
    void syncOutcomeToGhl(dndPayload);
    endEmailSession(email);
    return;
  }

  const action = await processFlowInput(session, text);
  addEmailMessage(email, 'assistant', action.say);

  const replySubject =
    action.type === 'end' ? 'Re: Justizia Law — next steps' : 'Re: Justizia Law — follow up';
  await sendEmail(email, replySubject, action.say);

  const cid = getEmailCampaignId(session) ?? match?.campaign.id;
  const rid = match?.recipient.id;

  if (action.type === 'end' && cid && rid) {
    const completed = updateEmailRecipient(cid, rid, {
      status: 'completed',
      outcome: action.outcome,
      completedAt: new Date().toISOString(),
    });
    session.outcomes.finalOutcome = action.outcome;
    if (action.outcome === 'Consent Given') session.outcomes.consentGiven = true;
    session.endedAt = new Date();
    session.endedBy = 'agent';
    upsertFromEmailSession(cid, match!.campaign.name, completed, session);
    const syncPayload = {
      channel: 'email',
      customerName: session.clientName,
      email,
      outcome: action.outcome,
      campaignId: cid,
    };
    void dispatchWebhook(action.outcome === 'Consent Given' ? 'consent_given' : 'chat_completed', syncPayload);
    void syncOutcomeToGhl(syncPayload);
    endEmailSession(email);
  } else if (cid && rid) {
    const updated = updateEmailRecipient(cid, rid, { status: 'in_flow' });
    upsertFromEmailSession(cid, match!.campaign.name, updated, session);
  }
}

router.post('/webhook/inbound', async (req, res) => {
  const inbound = parseInboundEmail(req.body as Record<string, unknown>);
  if (inbound) {
    console.log(`[Email] Inbound from ${inbound.from}: ${inbound.text.slice(0, 120)}`);
    try {
      await handleInboundEmail(inbound.from, inbound.text);
    } catch (err) {
      console.error('[Email] Inbound error:', err);
    }
  }
  res.sendStatus(200);
});

export default router;