import { applyTemplate } from './ai/whatsappCampaignStore.js';
import { loadWhatsAppProviderConfig } from './whatsappProviderStore.js';

const GRAPH_API = 'https://graph.facebook.com/v21.0';

function normalizeTo(phone: string): string {
  return phone.replace(/\D/g, '');
}

export async function sendMetaWhatsAppText(
  toPhone: string,
  body: string
): Promise<{ sid: string; status: string }> {
  const config = loadWhatsAppProviderConfig();
  const { phoneNumberId, accessToken } = config.meta;
  if (!phoneNumberId || !accessToken) {
    throw new Error('Meta WhatsApp Business not configured. Add Phone Number ID and Access Token.');
  }

  const response = await fetch(`${GRAPH_API}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: normalizeTo(toPhone),
      type: 'text',
      text: { body },
    }),
  });

  const data = (await response.json()) as {
    messages?: { id: string }[];
    error?: { message: string };
  };

  if (!response.ok) {
    throw new Error(data.error?.message ?? 'Meta API send failed');
  }

  return {
    sid: data.messages?.[0]?.id ?? `meta-${Date.now()}`,
    status: 'sent',
  };
}

export async function sendMetaWhatsAppTemplate(
  toPhone: string,
  template: string,
  vars: Record<string, string>
): Promise<{ sid: string; status: string }> {
  const config = loadWhatsAppProviderConfig();
  const { phoneNumberId, accessToken, templateName, templateLanguage } = config.meta;
  if (!phoneNumberId || !accessToken) {
    throw new Error('Meta WhatsApp Business not configured.');
  }

  if (templateName) {
    const parameters = Object.values(vars).map((text) => ({ type: 'text', text }));

    const response = await fetch(`${GRAPH_API}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: normalizeTo(toPhone),
        type: 'template',
        template: {
          name: templateName,
          language: { code: templateLanguage || 'en' },
          components: parameters.length
            ? [{ type: 'body', parameters }]
            : undefined,
        },
      }),
    });

    const data = (await response.json()) as {
      messages?: { id: string }[];
      error?: { message: string };
    };

    if (!response.ok) {
      throw new Error(data.error?.message ?? 'Meta template send failed');
    }

    return {
      sid: data.messages?.[0]?.id ?? `meta-${Date.now()}`,
      status: 'sent',
    };
  }

  const body = applyTemplate(template, vars);
  return sendMetaWhatsAppText(toPhone, body);
}

export async function testMetaConnection(): Promise<{ ok: boolean; message: string }> {
  const config = loadWhatsAppProviderConfig();
  const { phoneNumberId, accessToken } = config.meta;
  if (!phoneNumberId || !accessToken) {
    return { ok: false, message: 'Phone Number ID and Access Token are required.' };
  }

  try {
    const response = await fetch(`${GRAPH_API}/${phoneNumberId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = (await response.json()) as { display_phone_number?: string; error?: { message: string } };
    if (!response.ok) {
      return { ok: false, message: data.error?.message ?? 'Connection failed' };
    }
    return {
      ok: true,
      message: `Connected to ${data.display_phone_number ?? 'WhatsApp Business number'}`,
    };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Connection failed' };
  }
}

export function parseMetaInbound(body: unknown): { from: string; text: string } | null {
  const payload = body as {
    object?: string;
    entry?: {
      changes?: {
        value?: {
          messages?: {
            from?: string;
            type?: string;
            text?: { body?: string };
          }[];
        };
      }[];
    }[];
  };

  if (payload.object !== 'whatsapp_business_account') return null;

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const msg of change.value?.messages ?? []) {
        if (msg.type === 'text' && msg.text?.body && msg.from) {
          return { from: `+${msg.from}`, text: msg.text.body };
        }
      }
    }
  }

  return null;
}