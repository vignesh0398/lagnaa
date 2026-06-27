import fs from 'fs';
import path from 'path';
import { loadTwilioConfig } from './config.js';

export type WhatsAppProvider = 'twilio' | 'meta';

export interface WhatsAppProviderConfig {
  provider: WhatsAppProvider;
  twilio: {
    whatsappNumber?: string;
    whatsappContentSid?: string;
  };
  meta: {
    phoneNumberId?: string;
    accessToken?: string;
    businessAccountId?: string;
    verifyToken?: string;
    displayPhoneNumber?: string;
    templateName?: string;
    templateLanguage?: string;
  };
}

const STORE_PATH = path.join(process.cwd(), 'server', 'data', 'whatsapp-provider.json');

const DEFAULT_CONFIG: WhatsAppProviderConfig = {
  provider: 'twilio',
  twilio: {},
  meta: {
    verifyToken: 'datacrew_wa_verify',
    templateLanguage: 'en',
  },
};

let runtimeConfig: WhatsAppProviderConfig | null = null;

function migrateFromTwilioConfig(): Partial<WhatsAppProviderConfig['twilio']> {
  const twilio = loadTwilioConfig();
  if (!twilio) return {};
  return {
    whatsappNumber: twilio.whatsappNumber,
    whatsappContentSid: twilio.whatsappContentSid,
  };
}

export function loadWhatsAppProviderConfig(): WhatsAppProviderConfig {
  if (runtimeConfig) return runtimeConfig;

  if (fs.existsSync(STORE_PATH)) {
    runtimeConfig = { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8')) };
    runtimeConfig.twilio = { ...DEFAULT_CONFIG.twilio, ...runtimeConfig.twilio };
    runtimeConfig.meta = { ...DEFAULT_CONFIG.meta, ...runtimeConfig.meta };
    return runtimeConfig;
  }

  runtimeConfig = {
    ...DEFAULT_CONFIG,
    twilio: migrateFromTwilioConfig(),
  };
  return runtimeConfig;
}

export function saveWhatsAppProviderConfig(updates: Partial<WhatsAppProviderConfig>): WhatsAppProviderConfig {
  const current = loadWhatsAppProviderConfig();
  const next: WhatsAppProviderConfig = {
    provider: updates.provider ?? current.provider,
    twilio: { ...current.twilio, ...updates.twilio },
    meta: { ...current.meta, ...updates.meta },
  };
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(next, null, 2));
  runtimeConfig = next;
  return next;
}

export function maskToken(token: string): string {
  if (token.length <= 8) return '••••••••';
  return `${token.slice(0, 4)}••••${token.slice(-4)}`;
}

export function isProviderConfigured(provider: WhatsAppProvider): boolean {
  const config = loadWhatsAppProviderConfig();
  if (provider === 'twilio') {
    const twilio = loadTwilioConfig();
    return Boolean(twilio?.accountSid && twilio?.authToken);
  }
  return Boolean(config.meta.phoneNumberId && config.meta.accessToken);
}

export function getActiveProvider(): WhatsAppProvider {
  return loadWhatsAppProviderConfig().provider;
}