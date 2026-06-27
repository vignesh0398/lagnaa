import { getVoiceId } from './agentSettings.js';
import { CLIENT_SILENCE_TIMEOUT_SEC } from './voiceStack.js';
import { getWebhookBaseUrl } from '../tunnel.js';

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function gatherUrl(path: string): string {
  const base = getWebhookBaseUrl();
  if (!base) throw new Error('No public webhook URL');
  return `${base}${path}`;
}

export function getSpeechLanguage(toNumber?: string): string {
  if (toNumber?.replace(/\s/g, '').startsWith('+91')) return 'en-IN';
  if (toNumber?.startsWith('+1')) return 'en-US';
  return 'en-GB';
}

function sayChunks(text: string): string {
  const voice = getVoiceId();
  const escaped = escapeXml(text);
  if (escaped.length <= 350) {
    return `<Say voice="${voice}">${escaped}</Say>`;
  }
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  return sentences.map((s) => `<Say voice="${voice}">${escapeXml(s.trim())}</Say><Pause length="1"/>`).join('\n  ');
}

function gatherAttrs(lang: string, timeout: number, hints: string): string {
  return [
    'input="speech"',
    'method="POST"',
    'speechTimeout="auto"',
    'actionOnEmptyResult="true"',
    'profanityFilter="false"',
    `language="${lang}"`,
    `timeout="${timeout}"`,
    `hints="${hints}"`,
  ].join(' ');
}

function gatherBlock(
  lang: string,
  timeout = CLIENT_SILENCE_TIMEOUT_SEC,
  hints = 'yes, no, hello, hi, speaking, interested, date of birth, postcode, january, february, march, april, may, june, july, august, september, october, november, december'
): string {
  const respondUrl = gatherUrl('/api/twilio/voice/ai-respond');
  return `<Gather ${gatherAttrs(lang, timeout, hints)} action="${respondUrl}"/>`;
}

/** Opening: greeting + intro, then listen for identity confirmation */
export function buildOpeningTwiml(hello: string, intro: string, toNumber?: string): string {
  const lang = getSpeechLanguage(toNumber);
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${sayChunks(hello)}
  <Pause length="1"/>
  ${sayChunks(intro)}
  ${gatherBlock(lang, CLIENT_SILENCE_TIMEOUT_SEC, 'yes, no, hello, hi, speaking, this is, correct, wrong number')}
  <Redirect method="POST">${gatherUrl('/api/twilio/voice/ai-no-speech')}</Redirect>
</Response>`;
}

export function buildContinueTwiml(reply: string, toNumber?: string, pauseBeforeListen = 1): string {
  const lang = getSpeechLanguage(toNumber);
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${sayChunks(reply)}
  <Pause length="${pauseBeforeListen}"/>
  ${gatherBlock(lang, CLIENT_SILENCE_TIMEOUT_SEC)}
  <Redirect method="POST">${gatherUrl('/api/twilio/voice/ai-no-speech')}</Redirect>
</Response>`;
}

export function buildRepromptTwiml(message: string, toNumber?: string): string {
  const lang = getSpeechLanguage(toNumber);
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${sayChunks(message)}
  ${gatherBlock(lang, CLIENT_SILENCE_TIMEOUT_SEC)}
  <Redirect method="POST">${gatherUrl('/api/twilio/voice/ai-no-speech')}</Redirect>
</Response>`;
}

export function buildGoodbyeTwiml(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${sayChunks(message)}
  <Hangup/>
</Response>`;
}

export function buildHangupTwiml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Hangup/>
</Response>`;
}

export function buildOutboundTwiml(agentName?: string): string {
  const intro = agentName
    ? `Hello, this is ${agentName} calling from Lagnaa.`
    : 'Hello, this is Lagnaa calling.';
  return `<Response>
  <Say voice="Polly.Joanna">${intro} We are reaching out regarding your inquiry. Please hold while we connect you.</Say>
  <Pause length="1"/>
  <Say voice="Polly.Joanna">Thank you for your time. A team member will follow up with you shortly. Goodbye.</Say>
</Response>`;
}