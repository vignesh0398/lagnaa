import { Router } from 'express';
import twilio from 'twilio';
import {
  clearTwilioConfig,
  loadTwilioConfig,
  maskSid,
  saveTwilioConfig,
  type TwilioConfig,
} from '../config.js';
import { getStoredRecord, upsertFromSession } from '../ai/callHistoryStore.js';
import { getSession, markEnded } from '../ai/conversation.js';
import { getPublishedPrompt } from '../ai/promptStore.js';
import { getDefaultFromNumber, getTwilioClient } from '../twilioClient.js';
import { getWebhookBaseUrl } from '../tunnel.js';
import {
  getCallQueueConfig,
  getCallQueueStats,
  listPendingJobs,
  releaseCallSlot,
  scheduleOutboundCall,
  updateCallQueueConfig,
} from '../callQueue.js';
import { markContactCalled } from '../contacts/contactsStore.js';
import { syncCallCompletionToGhl } from '../ghlSync.js';

const router = Router();

function formatDuration(seconds: number | string | null | undefined): string {
  const total = Number(seconds) || 0;
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function mapTwilioStatus(status: string): string {
  switch (status) {
    case 'completed':
      return 'completed';
    case 'busy':
    case 'no-answer':
    case 'canceled':
    case 'failed':
      return 'interrupted';
    case 'ringing':
    case 'in-progress':
    case 'queued':
      return 'in_progress';
    default:
      return 'queued';
  }
}

function relativeTime(date: Date | null): string {
  if (!date) return '—';
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function buildOutboundTwiml(agentName?: string): string {
  const intro = agentName
    ? `Hello, this is ${agentName} calling from Lagnaa.`
    : 'Hello, this is Lagnaa calling.';
  return `<Response>
  <Say voice="Polly.Joanna">${intro} We are reaching out regarding your inquiry. Please hold while we connect you.</Say>
  <Pause length="1"/>
  <Say voice="Polly.Joanna">Thank you for your time. A team member will follow up with you shortly. Goodbye.</Say>
</Response>`;
}

router.get('/status', async (_req, res) => {
  const config = loadTwilioConfig();
  if (!config) {
    return res.json({
      connected: false,
      message: 'Twilio not configured. Add credentials in Gateway or .env file.',
    });
  }

  const client = getTwilioClient();
  if (!client) {
    return res.json({ connected: false, message: 'Invalid Twilio credentials.' });
  }

  try {
    const account = await client.api.accounts(config.accountSid).fetch();
    let phoneCount = 0;
    try {
      const numbers = await client.incomingPhoneNumbers.list({ limit: 50 });
      phoneCount = numbers.length;
    } catch {
      phoneCount = config.phoneNumber ? 1 : 0;
    }

    return res.json({
      connected: true,
      accountName: account.friendlyName,
      accountSid: maskSid(config.accountSid),
      phoneNumber: config.phoneNumber || null,
      phoneCount,
      status: account.status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Connection failed';
    return res.json({ connected: false, message });
  }
});

router.get('/call-readiness', async (_req, res) => {
  const config = loadTwilioConfig();
  const client = getTwilioClient();
  const published = getPublishedPrompt();
  const webhookBase = getWebhookBaseUrl();
  const issues: string[] = [];

  if (!config?.accountSid || !config?.authToken) {
    issues.push('Twilio not configured — open Connections (Gateway) and add Account SID + Auth Token.');
  } else if (!client) {
    issues.push('Twilio credentials are invalid.');
  } else {
    try {
      await client.api.accounts(config.accountSid).fetch();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Twilio auth failed';
      issues.push(`Twilio authentication failed: ${msg}`);
    }
  }

  if (!config?.phoneNumber?.trim()) {
    issues.push('No Twilio phone number set — add your outbound caller ID in Connections.');
  }

  if (!published) {
    issues.push('No published AI agent — open AI Agents, create one, and click Publish.');
  }

  if (!webhookBase) {
    issues.push('No public webhook URL — on Render this should be automatic; check PUBLIC_WEBHOOK_URL.');
  }

  res.json({
    ready: issues.length === 0,
    issues,
    twilioConnected: issues.every((i) => !i.toLowerCase().includes('twilio')),
    publishedAgent: published?.agentName ?? null,
    phoneNumber: config?.phoneNumber ?? null,
    webhookBase,
  });
});

router.post('/connect', async (req, res) => {
  const { accountSid, authToken, phoneNumber } = req.body as Partial<TwilioConfig>;

  if (!accountSid?.startsWith('AC') || !authToken) {
    return res.status(400).json({ error: 'Valid Account SID (AC...) and Auth Token are required.' });
  }

  const testClient = twilio(accountSid, authToken);

  try {
    const account = await testClient.api.accounts(accountSid).fetch();
    let resolvedPhone = phoneNumber?.trim() ?? '';

    if (!resolvedPhone) {
      const numbers = await testClient.incomingPhoneNumbers.list({ limit: 1 });
      resolvedPhone = numbers[0]?.phoneNumber ?? '';
    }

    const existing = loadTwilioConfig();
    const config: TwilioConfig = {
      accountSid,
      authToken,
      phoneNumber: resolvedPhone,
      whatsappNumber: existing?.whatsappNumber,
      whatsappContentSid: existing?.whatsappContentSid,
    };
    saveTwilioConfig(config);

    return res.json({
      success: true,
      accountName: account.friendlyName,
      phoneNumber: resolvedPhone,
      message: 'Twilio connected successfully.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid credentials';
    return res.status(401).json({ error: message });
  }
});

router.post('/disconnect', (_req, res) => {
  clearTwilioConfig();
  res.json({ success: true, message: 'Twilio disconnected.' });
});

router.get('/phone-numbers', async (_req, res) => {
  const client = getTwilioClient();
  if (!client) {
    return res.status(503).json({ error: 'Twilio not configured.' });
  }

  try {
    const numbers = await client.incomingPhoneNumbers.list({ limit: 50 });
    res.json(
      numbers.map((n) => ({
        sid: n.sid,
        phoneNumber: n.phoneNumber,
        friendlyName: n.friendlyName,
        capabilities: n.capabilities,
      }))
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch numbers';
    res.status(500).json({ error: message });
  }
});

router.post('/call', async (req, res) => {
  const client = getTwilioClient();
  if (!client) {
    return res.status(503).json({ error: 'Twilio not configured. Connect in Gateway first.' });
  }

  const { to, from, agentName, aiVoice, clientName, clientDob, clientPostcode, ghlContactId, contactId } = req.body as {
    to?: string;
    from?: string;
    agentName?: string;
    aiVoice?: boolean;
    clientName?: string;
    clientDob?: string;
    clientPostcode?: string;
    ghlContactId?: string;
    contactId?: string;
  };

  if (!to) {
    return res.status(400).json({ error: 'Destination phone number (to) is required.' });
  }

  const useAiVoice = aiVoice !== false;

  try {
    const result = await scheduleOutboundCall(
      {
        to,
        from,
        agentName,
        aiVoice: useAiVoice,
        clientName,
        clientDob,
        clientPostcode,
        ghlContactId,
        contactId,
      },
      { source: 'manual', ghlContactId, contactId, contactName: clientName }
    );

    res.json({
      success: true,
      queued: result.queued,
      queuePosition: result.queuePosition,
      callSid: result.callSid,
      message: result.queued
        ? result.message
        : result.message + (useAiVoice ? ' — answer and talk to the AI!' : ''),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to place call';
    res.status(500).json({ error: message });
  }
});

function parseDateRange(preset: string, from?: string, to?: string): { start: Date | null; end: Date | null } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  switch (preset) {
    case 'today': {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }
    case '7d': {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }
    case '4w': {
      const start = new Date(now);
      start.setDate(start.getDate() - 28);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }
    case '3m': {
      const start = new Date(now);
      start.setMonth(start.getMonth() - 3);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }
    case 'custom': {
      if (!from) return { start: null, end: null };
      const start = new Date(from);
      const customEnd = to ? new Date(to) : end;
      customEnd.setHours(23, 59, 59, 999);
      return { start, end: customEnd };
    }
    default:
      return { start: null, end: null };
  }
}

router.get('/calls', async (req, res) => {
  const client = getTwilioClient();
  if (!client) {
    return res.status(503).json({ error: 'Twilio not configured.' });
  }

  const limit = Math.min(Number(req.query.limit) || 100, 200);
  const datePreset = (req.query.dateRange as string) || 'all';
  const dateFrom = req.query.dateFrom as string | undefined;
  const dateTo = req.query.dateTo as string | undefined;
  const columnFilter = (req.query.filterColumn as string) || '';
  const filterValue = (req.query.filterValue as string) || '';

  try {
    const twilioCalls = await client.calls.list({ limit });
    const { start: rangeStart, end: rangeEnd } = parseDateRange(datePreset, dateFrom, dateTo);

    const mapped = await Promise.all(
      twilioCalls.map(async (call) => {
        let hasRecording = false;
        try {
          const recordings = await client.recordings.list({ callSid: call.sid, limit: 1 });
          hasRecording = recordings.length > 0;
        } catch {
          hasRecording = false;
        }

        const session = getSession(call.sid);
        const stored = getStoredRecord(call.sid);
        const durationSec = Number(call.duration) || 0;
        const dateCreated = call.dateCreated ?? new Date();

        const enriched =
          stored ??
          upsertFromSession(
            call.sid,
            {
              from: call.from ?? '—',
              to: call.to ?? '—',
              direction: call.direction ?? 'outbound-api',
              status: call.status,
              duration: durationSec,
              price: call.price,
              dateCreated,
              hasRecording,
            },
            session
          );

        return {
          ...enriched,
          id: call.sid,
          queuedAt: relativeTime(dateCreated),
          status: mapTwilioStatus(call.status),
        };
      })
    );

    let filtered = mapped;

    if (rangeStart && rangeEnd) {
      filtered = filtered.filter((c) => {
        const d = new Date(c.time);
        return d >= rangeStart && d <= rangeEnd;
      });
    }

    if (filterValue) {
      const q = filterValue.toLowerCase();
      if (columnFilter) {
        const key = columnFilter as keyof (typeof filtered)[0];
        filtered = filtered.filter((c) => String(c[key] ?? '').toLowerCase().includes(q));
      } else {
        filtered = filtered.filter((c) =>
          Object.values(c).some((v) => String(v ?? '').toLowerCase().includes(q))
        );
      }
    }

    const stats = {
      total: filtered.length,
      ended: filtered.filter((c) => c.sessionStatus === 'Ended').length,
      notConnected: filtered.filter((c) => c.sessionStatus === 'Not Connected').length,
      successful: filtered.filter((c) => c.sessionOutcome === 'Successful').length,
      inProgress: filtered.filter((c) => c.sessionStatus === 'In Progress').length,
    };

    res.json({ calls: filtered, stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch calls';
    res.status(500).json({ error: message });
  }
});

router.get('/recordings/:callSid', async (req, res) => {
  const client = getTwilioClient();
  const config = loadTwilioConfig();
  if (!client || !config?.accountSid || !config?.authToken) {
    return res.status(503).send('Twilio not configured.');
  }

  const callSid = req.params.callSid;
  const forceDownload = req.query.download === '1' || req.query.download === 'true';

  try {
    const recordings = await client.recordings.list({ callSid, limit: 1 });
    const recording = recordings[0];
    if (!recording?.uri) {
      return res.status(404).send('Recording not found for this call.');
    }

    const mediaUrl = `https://api.twilio.com${recording.uri.replace('.json', '.mp3')}`;
    const auth = Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64');
    const mediaRes = await fetch(mediaUrl, {
      headers: { Authorization: `Basic ${auth}` },
    });

    if (!mediaRes.ok) {
      return res.status(502).send('Could not fetch recording from Twilio.');
    }

    const audio = Buffer.from(await mediaRes.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader(
      'Content-Disposition',
      `${forceDownload ? 'attachment' : 'inline'}; filename="lagnaa-${callSid}.mp3"`
    );
    res.send(audio);
  } catch (err) {
    console.warn('[Recording] stream failed:', err);
    res.status(500).send('Recording unavailable.');
  }
});

router.get('/calls/:sid', async (req, res) => {
  const client = getTwilioClient();
  if (!client) {
    return res.status(503).json({ error: 'Twilio not configured.' });
  }

  try {
    const call = await client.calls(req.params.sid).fetch();
    const recordings = await client.recordings.list({ callSid: call.sid, limit: 5 });

    res.json({
      id: call.sid,
      direction: call.direction,
      to: call.to,
      from: call.from,
      status: mapTwilioStatus(call.status),
      duration: formatDuration(call.duration),
      dateCreated: call.dateCreated,
      recordings: recordings.map((r) => ({
        sid: r.sid,
        duration: r.duration,
        url: `${getWebhookBaseUrl() ?? ''}/api/twilio/recordings/${call.sid}`,
        downloadUrl: `${getWebhookBaseUrl() ?? ''}/api/twilio/recordings/${call.sid}?download=1`,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Call not found';
    res.status(404).json({ error: message });
  }
});

router.post('/voice', (req, res) => {
  const agentName = req.body.agentName as string | undefined;
  res.type('text/xml');
  res.send(buildOutboundTwiml(agentName));
});

router.get('/queue', (_req, res) => {
  res.json({
    stats: getCallQueueStats(),
    config: getCallQueueConfig(),
    pending: listPendingJobs().slice(0, 25),
  });
});

router.put('/queue', (req, res) => {
  const { enabled, maxConcurrent } = req.body as { enabled?: boolean; maxConcurrent?: number };
  const config = updateCallQueueConfig({ enabled, maxConcurrent });
  res.json({ success: true, config, stats: getCallQueueStats() });
});

router.post('/status', async (req, res) => {
  const callSid = req.body.CallSid as string;
  const callStatus = req.body.CallStatus as string;
  console.log('[Twilio status]', callSid, callStatus);

  if (callSid && ['completed', 'busy', 'no-answer', 'failed', 'canceled'].includes(callStatus)) {
    releaseCallSlot(callSid);
  }

  const client = getTwilioClient();
  if (client && callSid && ['completed', 'busy', 'no-answer', 'failed', 'canceled'].includes(callStatus)) {
    try {
      const call = await client.calls(callSid).fetch();
      const session = getSession(callSid);
      if (session && !session.endedBy && callStatus === 'completed') {
        markEnded(callSid, 'customer');
      }

      let hasRecording = false;
      try {
        const recordings = await client.recordings.list({ callSid, limit: 1 });
        hasRecording = recordings.length > 0;
      } catch {
        hasRecording = false;
      }

      const activeSession = getSession(callSid);
      upsertFromSession(
        callSid,
        {
          from: call.from ?? activeSession?.fromNumber ?? '—',
          to: call.to ?? activeSession?.toNumber ?? '—',
          direction: call.direction ?? 'outbound-api',
          status: call.status,
          duration: Number(call.duration) || 0,
          price: call.price,
          dateCreated: call.dateCreated ?? new Date(),
          hasRecording,
        },
        activeSession
      );

      if (activeSession?.contactId && callSid) {
        markContactCalled(activeSession.contactId, callSid);
      }

      if (activeSession?.ghlContactId || activeSession?.toNumber) {
        void syncCallCompletionToGhl(callSid, activeSession, Number(call.duration) || 0);
      }
    } catch (err) {
      console.warn('[Twilio status] persist failed:', err);
    }
  }

  res.sendStatus(200);
});

export default router;