import { getWebhookBaseUrl } from './tunnel.js';

/** Public Lagnaa URL — opens/plays in browser without Twilio login. */
export function buildPublicRecordingUrl(callSid: string): string | null {
  const base = getWebhookBaseUrl();
  if (!base || !callSid) return null;
  return `${base}/api/twilio/recordings/${callSid}`;
}