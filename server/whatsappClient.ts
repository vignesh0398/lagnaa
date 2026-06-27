import { loadTwilioConfig } from './config.js';
import { applyTemplate } from './ai/whatsappCampaignStore.js';
import { sendMetaWhatsAppTemplate, sendMetaWhatsAppText } from './metaWhatsAppClient.js';
import { getActiveProvider, loadWhatsAppProviderConfig } from './whatsappProviderStore.js';
import { getTwilioClient } from './twilioClient.js';

const SANDBOX_WHATSAPP = 'whatsapp:+14155238886';

export function getWhatsAppFromNumber(): string | null {
  const provider = getActiveProvider();
  const waConfig = loadWhatsAppProviderConfig();

  if (provider === 'meta') {
    return waConfig.meta.displayPhoneNumber ?? null;
  }

  const twilioConfig = loadTwilioConfig();
  if (!twilioConfig) return null;

  const wa = waConfig.twilio.whatsappNumber?.trim() || twilioConfig.whatsappNumber?.trim();
  if (wa) {
    return wa.startsWith('whatsapp:') ? wa : `whatsapp:${wa}`;
  }

  if (twilioConfig.phoneNumber) {
    return `whatsapp:${twilioConfig.phoneNumber}`;
  }

  return SANDBOX_WHATSAPP;
}

export function formatWhatsAppTo(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const e164 = phone.startsWith('+') ? `+${digits}` : `+${digits}`;
  return `whatsapp:${e164}`;
}

async function sendViaTwilio(toPhone: string, body: string): Promise<{ sid: string; status: string }> {
  const client = getTwilioClient();
  const from = getWhatsAppFromNumber();
  if (!client || !from) {
    throw new Error('Twilio not configured. Connect in Connections or switch provider.');
  }

  const message = await client.messages.create({
    from,
    to: formatWhatsAppTo(toPhone),
    body,
  });

  return { sid: message.sid, status: message.status };
}

async function sendTemplateViaTwilio(
  toPhone: string,
  template: string,
  vars: Record<string, string>
): Promise<{ sid: string; status: string }> {
  const twilioConfig = loadTwilioConfig();
  const waConfig = loadWhatsAppProviderConfig();
  const contentSid = waConfig.twilio.whatsappContentSid || twilioConfig?.whatsappContentSid;
  const body = applyTemplate(template, vars);

  if (contentSid) {
    const client = getTwilioClient();
    const from = getWhatsAppFromNumber();
    if (!client || !from) {
      throw new Error('Twilio WhatsApp sender not configured.');
    }

    const variables: Record<string, string> = {};
    let i = 1;
    for (const val of Object.values(vars)) {
      variables[String(i++)] = val;
    }

    const message = await client.messages.create({
      from,
      to: formatWhatsAppTo(toPhone),
      contentSid,
      contentVariables: JSON.stringify(variables),
    });

    return { sid: message.sid, status: message.status };
  }

  return sendViaTwilio(toPhone, body);
}

export async function sendWhatsAppMessage(
  toPhone: string,
  body: string
): Promise<{ sid: string; status: string }> {
  if (getActiveProvider() === 'meta') {
    return sendMetaWhatsAppText(toPhone, body);
  }
  return sendViaTwilio(toPhone, body);
}

export async function sendWhatsAppTemplate(
  toPhone: string,
  template: string,
  vars: Record<string, string>
): Promise<{ sid: string; status: string }> {
  if (getActiveProvider() === 'meta') {
    return sendMetaWhatsAppTemplate(toPhone, template, vars);
  }
  return sendTemplateViaTwilio(toPhone, template, vars);
}