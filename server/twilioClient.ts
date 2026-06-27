import twilio from 'twilio';
import { loadTwilioConfig } from './config.js';

export function getTwilioClient() {
  const config = loadTwilioConfig();
  if (!config?.accountSid || !config?.authToken) return null;
  return twilio(config.accountSid, config.authToken);
}

export function getDefaultFromNumber(): string | null {
  const config = loadTwilioConfig();
  return config?.phoneNumber || null;
}