import type { Server as HttpServer, IncomingMessage } from 'http';
import { WebSocketServer, type WebSocket } from 'ws';
import twilio from 'twilio';
import {
  addMessage,
  getSession,
  initSession,
  markEnded,
  setStep,
  type CallSession,
} from './conversation.js';
import { processFlowInput } from './justiziaFlow.js';
import { applyTemplate } from './promptStore.js';
import { isTwilioMachineAnswer, isVoicemailSpeech } from './voicemailDetect.js';
import { dispatchWebhook } from '../integrationsStore.js';
import { syncOutcomeToGhl } from '../ghlSync.js';
import { loadTwilioConfig } from '../config.js';
import { splitIntoSpeakPhrases } from './speechHumanizer.js';
import { getRelayWebSocketUrl } from '../tunnel.js';

const MAX_NO_SPEECH_RETRIES = 3;
const LISTEN_TIMEOUT_SEC = 22;

type RelaySocket = WebSocket & { callSid?: string; silenceTimer?: ReturnType<typeof setTimeout> };

interface SetupMessage {
  type: 'setup';
  callSid: string;
  from?: string;
  to?: string;
}

interface PromptMessage {
  type: 'prompt';
  voicePrompt: string;
  last?: boolean;
}

type RelayInbound = SetupMessage | PromptMessage | { type: string };

function sendJson(ws: WebSocket, payload: Record<string, unknown>): void {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function speak(ws: RelaySocket, text: string, last = true): void {
  const trimmed = text.trim();
  if (!trimmed) return;

  const phrases = splitIntoSpeakPhrases(trimmed);
  phrases.forEach((token, index) => {
    if (!token.trim()) return;
    sendJson(ws, {
      type: 'text',
      token,
      last: last && index === phrases.length - 1,
      interruptible: index === phrases.length - 1,
      preemptible: false,
    });
  });
}

function clearSilenceTimer(ws: RelaySocket): void {
  if (ws.silenceTimer) {
    clearTimeout(ws.silenceTimer);
    ws.silenceTimer = undefined;
  }
}

function armSilenceTimer(ws: RelaySocket, session: CallSession): void {
  clearSilenceTimer(ws);
  ws.silenceTimer = setTimeout(() => {
    void handleNoSpeech(ws, session);
  }, LISTEN_TIMEOUT_SEC * 1000);
}

function finalizeVoicemail(callSid: string, session: CallSession, source: 'amd' | 'speech'): void {
  if (session.outcomes.voicemail) return;
  session.outcomes.voicemail = true;
  session.outcomes.finalOutcome = 'Voicemail';
  markEnded(callSid, 'agent');
  console.log(`[Relay] Voicemail detected (${source}) — ending ${callSid}`);
  const syncPayload = {
    channel: 'voice',
    customerName: session.clientName,
    phone: session.toNumber,
    outcome: 'Voicemail',
    callSid,
    ghlContactId: session.ghlContactId,
  };
  void dispatchWebhook('call_completed', syncPayload);
  if (!session.ghlContactId) {
    void syncOutcomeToGhl(syncPayload);
  }
}

async function handleEnd(ws: RelaySocket, session: CallSession, say: string, outcome: string): Promise<void> {
  if (say) {
    addMessage(session.callSid, 'assistant', say);
    speak(ws, say);
  }
  markEnded(session.callSid, 'agent');
  setStep(session.callSid, 'ended');

  const event =
    outcome === 'Consent Given'
      ? 'consent_given'
      : outcome === 'DND Requested'
        ? 'dnd_requested'
        : 'call_completed';

  const syncPayload = {
    channel: 'voice',
    customerName: session.clientName,
    phone: session.toNumber,
    outcome,
    callSid: session.callSid,
    ghlContactId: session.ghlContactId,
  };
  void dispatchWebhook(event, syncPayload);
  if (!session.ghlContactId) {
    void syncOutcomeToGhl(syncPayload);
  }

  clearSilenceTimer(ws);
  sendJson(ws, { type: 'end' });
}

async function handleNoSpeech(ws: RelaySocket, session: CallSession): Promise<void> {
  session.noSpeechRetries += 1;
  console.log(`[Relay] No speech ${session.callSid} retries=${session.noSpeechRetries}`);

  if (session.noSpeechRetries >= MAX_NO_SPEECH_RETRIES) {
    const msg = 'I am having trouble hearing you. Thank you for your time. Goodbye.';
    await handleEnd(ws, session, msg, 'No Response');
    return;
  }

  const reprompt = session.scripts.noSpeechRetry;
  addMessage(session.callSid, 'assistant', reprompt);
  speak(ws, reprompt);
  armSilenceTimer(ws, session);
}

async function handlePrompt(ws: RelaySocket, session: CallSession, speech: string): Promise<void> {
  session.noSpeechRetries = 0;
  clearSilenceTimer(ws);

  console.log(`[Relay] prompt ${session.callSid} step=${session.step} speech="${speech}"`);

  if (speech && isVoicemailSpeech(speech)) {
    addMessage(session.callSid, 'user', speech);
    finalizeVoicemail(session.callSid, session, 'speech');
    sendJson(ws, { type: 'end' });
    return;
  }

  if (!speech.trim()) {
    await handleNoSpeech(ws, session);
    return;
  }

  addMessage(session.callSid, 'user', speech);

  try {
    const action = await processFlowInput(session, speech);
    setStep(session.callSid, action.type === 'continue' ? action.nextStep : 'ended');

    if (action.type === 'end') {
      session.outcomes.finalOutcome = action.outcome;
      console.log(`[Relay] Call ${session.callSid} ended — ${action.outcome}`);
      if (action.outcome === 'Voicemail') {
        finalizeVoicemail(session.callSid, session, 'speech');
        sendJson(ws, { type: 'end' });
        return;
      }
      await handleEnd(ws, session, action.say, action.outcome);
      return;
    }

    addMessage(session.callSid, 'assistant', action.say);
    console.log(`[Relay] ${session.callSid} → step ${action.nextStep}`);
    speak(ws, action.say);
    armSilenceTimer(ws, session);
  } catch (error) {
    console.error(`[Relay] Error processing ${session.callSid}:`, error);
    const fallback = "I'm sorry, could you please repeat that?";
    addMessage(session.callSid, 'assistant', fallback);
    speak(ws, fallback);
    armSilenceTimer(ws, session);
  }
}

async function handleSetup(ws: RelaySocket, message: SetupMessage): Promise<void> {
  const callSid = message.callSid;
  ws.callSid = callSid;

  let session = getSession(callSid);
  if (!session) {
    console.warn(`[Relay] No session for ${callSid} — creating fallback session`);
    session = initSession(callSid, 'Mia', 'the client', undefined, undefined, message.to);
  }

  if (message.from) session.fromNumber = message.from;
  if (message.to) session.toNumber = message.to;

  console.log(`[Relay] setup ${callSid} step=${session.step}`);

  const intro = applyTemplate(session.scripts.intro, { clientName: session.clientName });
  if (session.step === 'intro_confirm') {
    speak(ws, intro);
    armSilenceTimer(ws, session);
  }
}

function validateTwilioWs(req: IncomingMessage): boolean {
  const config = loadTwilioConfig();
  if (!config?.authToken) return true;

  const signature = req.headers['x-twilio-signature'];
  if (!signature || typeof signature !== 'string') {
    console.warn('[Relay] Missing X-Twilio-Signature — allowing in dev');
    return true;
  }

  const relayUrl = getRelayWebSocketUrl();
  if (!relayUrl) return false;

  return twilio.validateRequest(config.authToken, signature, relayUrl, {});
}

export function attachConversationRelay(server: HttpServer): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const path = req.url?.split('?')[0];
    if (path !== '/api/twilio/voice/relay') {
      socket.destroy();
      return;
    }

    if (!validateTwilioWs(req)) {
      console.warn('[Relay] Invalid Twilio signature — rejecting WebSocket');
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });

  wss.on('connection', (ws: RelaySocket) => {
    console.log('[Relay] WebSocket connected');

    ws.on('message', (raw) => {
      void (async () => {
        let message: RelayInbound;
        try {
          message = JSON.parse(raw.toString()) as RelayInbound;
        } catch {
          console.warn('[Relay] Invalid JSON message');
          return;
        }

        switch (message.type) {
          case 'setup':
            await handleSetup(ws, message as SetupMessage);
            break;
          case 'prompt': {
            const prompt = message as PromptMessage;
            if (!prompt.last) return;
            const session = ws.callSid ? getSession(ws.callSid) : undefined;
            if (!session) return;
            await handlePrompt(ws, session, prompt.voicePrompt?.trim() ?? '');
            break;
          }
          case 'interrupt':
            console.log(`[Relay] interrupt ${ws.callSid ?? 'unknown'}`);
            break;
          case 'error':
            console.error('[Relay] error from Twilio:', message);
            break;
          default:
            break;
        }
      })();
    });

    ws.on('close', () => {
      clearSilenceTimer(ws);
      if (ws.callSid) {
        const session = getSession(ws.callSid);
        if (session && !session.endedAt) {
          console.log(`[Relay] WebSocket closed mid-call ${ws.callSid}`);
        }
      }
    });
  });

  console.log('[Relay] ConversationRelay WebSocket ready at /api/twilio/voice/relay');
}