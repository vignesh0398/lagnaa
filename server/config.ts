import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
  whatsappNumber?: string;
  whatsappContentSid?: string;
}

const CONFIG_PATH = path.join(process.cwd(), 'server', 'data', 'twilio.json');

let runtimeConfig: TwilioConfig | null = null;

export function loadTwilioConfig(): TwilioConfig | null {
  if (runtimeConfig) return runtimeConfig;

  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    runtimeConfig = {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER ?? '',
    };
    return runtimeConfig;
  }

  if (fs.existsSync(CONFIG_PATH)) {
    runtimeConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')) as TwilioConfig;
    return runtimeConfig;
  }

  return null;
}

export function saveTwilioConfig(config: TwilioConfig): void {
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  runtimeConfig = config;
}

export function clearTwilioConfig(): void {
  runtimeConfig = null;
  if (fs.existsSync(CONFIG_PATH)) {
    fs.unlinkSync(CONFIG_PATH);
  }
}

export function maskSid(sid: string): string {
  if (sid.length <= 8) return '••••••••';
  return `${sid.slice(0, 4)}••••${sid.slice(-4)}`;
}