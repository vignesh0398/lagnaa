import { NoPublishedPromptError, getPublishedPrompt } from './ai/promptStore.js';
import { buildOutboundTwiml } from './ai/twiml.js';
import { getDefaultFromNumber, getTwilioClient } from './twilioClient.js';
import { getWebhookBaseUrl } from './tunnel.js';

export interface PlaceCallOptions {
  to: string;
  from?: string;
  agentName?: string;
  aiVoice?: boolean;
  clientName?: string;
  clientDob?: string;
  clientPostcode?: string;
  ghlContactId?: string;
  contactId?: string;
}

export interface PlaceCallResult {
  callSid: string;
  status: string;
  to: string;
  from: string;
  aiVoice: boolean;
}

export async function placeOutboundCall(options: PlaceCallOptions): Promise<PlaceCallResult> {
  const client = getTwilioClient();
  if (!client) {
    throw new Error('Twilio not configured. Connect in Connections first.');
  }

  const published = getPublishedPrompt();
  if (!published) {
    throw new NoPublishedPromptError();
  }

  const {
    to,
    from,
    agentName = published.agentName,
    aiVoice = true,
    clientName = 'the client',
    clientDob,
    clientPostcode,
    ghlContactId,
    contactId,
  } = options;

  const fromNumber = from || getDefaultFromNumber();
  if (!fromNumber) {
    throw new Error('No Twilio phone number configured.');
  }

  const webhookBase = getWebhookBaseUrl();
  if (aiVoice && !webhookBase) {
    throw new Error(
      'AI voice requires a public webhook URL. Set NGROK_AUTHTOKEN or PUBLIC_WEBHOOK_URL in .env.'
    );
  }

  const callParams: Parameters<typeof client.calls.create>[0] = {
    to,
    from: fromNumber,
    record: true,
    statusCallbackEvent: ['completed'],
    machineDetection: 'Enable',
    machineDetectionTimeout: 8,
    machineDetectionSpeechThreshold: 2400,
    machineDetectionSpeechEndThreshold: 1200,
  };

  if (aiVoice && webhookBase) {
    const params = new URLSearchParams({
      agentName,
      clientName,
      to,
    });
    if (clientDob) params.set('clientDob', clientDob);
    if (clientPostcode) params.set('clientPostcode', clientPostcode);
    if (ghlContactId) params.set('ghlContactId', ghlContactId);
    if (contactId) params.set('contactId', contactId);
    callParams.url = `${webhookBase}/api/twilio/voice/ai-start?${params.toString()}`;
    callParams.statusCallback = `${webhookBase}/api/twilio/status`;
  } else {
    callParams.twiml = buildOutboundTwiml(agentName);
  }

  const call = await client.calls.create(callParams);
  return {
    callSid: call.sid,
    status: call.status,
    to: call.to,
    from: call.from,
    aiVoice,
  };
}