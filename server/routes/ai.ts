import { Router } from 'express';
import { getCallOutcome, getTranscript, getSession } from '../ai/conversation.js';
import { loadGroqApiKey, saveGroqApiKey } from '../ai/groq.js';
import { VOICE_STACK_LABEL } from '../ai/voiceStack.js';
import { getRelayWebSocketUrl, getWebhookBaseUrl, setWebhookBaseUrl } from '../tunnel.js';

const router = Router();

router.get('/status', (_req, res) => {
  const groqKey = loadGroqApiKey();
  const webhookUrl = getWebhookBaseUrl();

  const relayUrl = getRelayWebSocketUrl();

  res.json({
    groqConnected: !!groqKey,
    groqMode: groqKey ? VOICE_STACK_LABEL.llm : 'Built-in rules (add Groq key in Connections)',
    webhookReady: !!webhookUrl && !!relayUrl,
    webhookUrl: webhookUrl ? `${webhookUrl}/api/twilio/voice/ai-start` : null,
    relayUrl,
    speechEngine: VOICE_STACK_LABEL.stt,
    voiceEngine: VOICE_STACK_LABEL.tts,
    cost: 'Twilio minutes + ConversationRelay (Deepgram/ElevenLabs via Twilio)',
  });
});

router.get('/transcript/:callSid', (req, res) => {
  const session = getSession(req.params.callSid);
  res.json({
    transcript: session ? getTranscript(req.params.callSid) : null,
    messages: session?.messages.filter((m) => m.role !== 'system') ?? [],
    outcome: getCallOutcome(req.params.callSid),
    step: session?.step,
  });
});

router.post('/set-webhook-url', (req, res) => {
  const { url } = req.body as { url?: string };
  if (!url?.trim()) {
    return res.status(400).json({ error: 'Webhook URL is required (e.g. https://xxxx.ngrok-free.app)' });
  }
  try {
    const parsed = new URL(url.trim());
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).json({ error: 'URL must start with http:// or https://' });
    }
    setWebhookBaseUrl(parsed.origin);
    res.json({
      success: true,
      webhookUrl: `${parsed.origin}/api/twilio/voice/ai-start`,
      message: 'Webhook URL saved. Place a new call to use it.',
    });
  } catch {
    res.status(400).json({ error: 'Invalid URL format.' });
  }
});

router.get('/test-webhook', async (_req, res) => {
  const base = getWebhookBaseUrl();
  if (!base) {
    return res.json({ ok: false, message: 'No webhook URL configured. Restart API or set one in Gateway.' });
  }

  const testUrl = `${base}/api/health`;
  try {
    const response = await fetch(testUrl, {
      headers: { 'Bypass-Tunnel-Reminder': 'true', 'User-Agent': 'Lagnaa-Webhook-Test' },
      signal: AbortSignal.timeout(8000),
    });
    const body = await response.text();
    const ok = response.ok && body.includes('"ok"');
    res.json({
      ok,
      webhookUrl: base,
      message: ok
        ? 'Webhook tunnel is reachable — AI voice should work.'
        : 'Tunnel returned an unexpected response. Use ngrok (NGROK_AUTHTOKEN in .env) for reliable webhooks.',
    });
  } catch (error) {
    res.json({
      ok: false,
      webhookUrl: base,
      message: `Tunnel not reachable: ${error instanceof Error ? error.message : 'connection failed'}. Add NGROK_AUTHTOKEN to .env or paste your ngrok URL in Gateway.`,
    });
  }
});

router.post('/connect-groq', (req, res) => {
  const { apiKey } = req.body as { apiKey?: string };
  if (!apiKey?.startsWith('gsk_')) {
    return res.status(400).json({ error: 'Valid Groq API key required (starts with gsk_)' });
  }
  saveGroqApiKey(apiKey);
  res.json({ success: true, message: 'Groq connected — smarter AI replies enabled.' });
});

export default router;