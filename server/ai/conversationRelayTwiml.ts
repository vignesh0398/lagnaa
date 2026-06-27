import { escapeXml } from './twiml.js';
import {
  getConversationRelayVoice,
  getSpeechLanguage,
  STT_ENDPOINT_MS,
  STT_LANGUAGE,
  STT_MODEL,
  STT_PROVIDER,
  TTS_PROVIDER,
} from './voiceStack.js';
import { humanizeForSpeech } from './speechHumanizer.js';
import { getVoiceId } from './agentSettings.js';
import { getRelayWebSocketUrl, getWebhookBaseUrl } from '../tunnel.js';

const GATHER_HINTS =
  'yes, no, hello, hi, speaking, interested, date of birth, postcode, january, february, march, april, may, june, july, august, september, october, november, december';

function relayUrl(): string {
  const url = getRelayWebSocketUrl();
  if (!url) throw new Error('No public WebSocket URL for ConversationRelay');
  return url;
}

function connectActionUrl(): string {
  const base = getWebhookBaseUrl();
  if (!base) throw new Error('No public webhook URL');
  return `${base}/api/twilio/voice/relay-end`;
}

export function buildConversationRelayTwiml(hello: string, toNumber?: string): string {
  const wsUrl = relayUrl();
  const voice = getConversationRelayVoice(getVoiceId());
  const lang = getSpeechLanguage(toNumber);

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect action="${connectActionUrl()}">
    <ConversationRelay
      url="${escapeXml(wsUrl)}"
      welcomeGreeting="${escapeXml(humanizeForSpeech(hello))}"
      welcomeGreetingInterruptible="speech"
      language="${lang}"
      ttsLanguage="${STT_LANGUAGE}"
      transcriptionLanguage="${STT_LANGUAGE}"
      transcriptionProvider="${STT_PROVIDER}"
      speechModel="${STT_MODEL}"
      ttsProvider="${TTS_PROVIDER}"
      voice="${escapeXml(voice)}"
      elevenlabsTextNormalization="off"
      speechTimeout="${STT_ENDPOINT_MS}"
      interruptible="speech"
      interruptSensitivity="medium"
      ignoreBackchannel="true"
      hints="${escapeXml(GATHER_HINTS)}"
    />
  </Connect>
</Response>`;
}