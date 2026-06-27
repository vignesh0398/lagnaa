import { getContact } from './ghlClient.js';
import { extractGhlContactForCall } from './ghlContactExtract.js';
import { appendSyncLog, getGhlConfig, incrementCallsTriggered } from './ghlStore.js';
import { scheduleOutboundCall } from './callQueue.js';

const DEDUPE_MS = 10 * 60 * 1000;
const recentTriggers = new Map<string, number>();

function normalizeTags(input: unknown): string[] {
  if (Array.isArray(input)) return input.map(String).map((t) => t.trim()).filter(Boolean);
  if (typeof input === 'string') {
    return input.split(',').map((t) => t.trim()).filter(Boolean);
  }
  return [];
}

export function parseGhlWebhook(body: Record<string, unknown>): {
  contactId?: string;
  tags: string[];
  locationId?: string;
} {
  const contactId =
    (body.contactId as string) ??
    (body.contact_id as string) ??
    (body.id as string) ??
    ((body.contact as Record<string, unknown> | undefined)?.id as string);

  const tags = normalizeTags(
    body.tags ??
      body.tag ??
      body.addedTags ??
      body.added_tag ??
      (body.contact as Record<string, unknown> | undefined)?.tags
  );

  const locationId =
    (body.locationId as string) ??
    (body.location_id as string) ??
    ((body.location as Record<string, unknown> | undefined)?.id as string);

  return { contactId, tags, locationId };
}

function shouldTrigger(tags: string[], triggerTag: string): boolean {
  const norm = triggerTag.trim().toLowerCase();
  return tags.some((t) => t.toLowerCase() === norm);
}

function recentlyTriggered(contactId: string): boolean {
  const last = recentTriggers.get(contactId);
  if (!last) return false;
  if (Date.now() - last < DEDUPE_MS) return true;
  recentTriggers.delete(contactId);
  return false;
}

export async function triggerCallForGhlContact(
  contactId: string,
  source = 'tag_trigger'
): Promise<{ ok: boolean; message: string; callSid?: string }> {
  const config = getGhlConfig();
  if (!config.connected || !config.apiKey || !config.locationId) {
    return { ok: false, message: 'GoHighLevel not connected' };
  }

  if (recentlyTriggered(contactId)) {
    appendSyncLog({
      direction: 'inbound',
      action: 'call_trigger',
      contactId,
      status: 'skipped',
      message: 'Duplicate trigger ignored (10 min window)',
    });
    return { ok: false, message: 'Call already triggered recently for this contact' };
  }

  try {
    const contact = await getContact(contactId);
    const data = extractGhlContactForCall(contact);

    if (!data.phone) {
      appendSyncLog({
        direction: 'inbound',
        action: 'call_trigger',
        contactId,
        contactName: data.clientName,
        status: 'error',
        message: 'Contact has no phone number',
      });
      return { ok: false, message: 'Contact has no phone number' };
    }

    if (data.missing.length > 0) {
      const warn = `Missing from GHL: ${data.missing.join(', ')} — Mia may not verify correctly`;
      appendSyncLog({
        direction: 'inbound',
        action: 'call_trigger',
        contactId,
        contactName: data.clientName,
        phone: data.phone,
        status: 'skipped',
        message: warn,
      });
      return { ok: false, message: warn };
    }

    const result = await scheduleOutboundCall(
      {
        to: data.phone,
        clientName: data.clientName,
        clientDob: data.clientDob,
        clientPostcode: data.clientPostcode,
        ghlContactId: data.contactId,
      },
      { source, ghlContactId: data.contactId, contactName: data.clientName }
    );

    recentTriggers.set(contactId, Date.now());
    if (result.placed) incrementCallsTriggered();

    const logMessage = result.queued
      ? `${source}: queued ${data.clientName} at position ${result.queuePosition}`
      : `${source}: calling ${data.clientName} (${result.callSid}) · name, DOB & postcode from GHL`;

    appendSyncLog({
      direction: 'inbound',
      action: result.queued ? 'call_queued' : 'call_trigger',
      contactId: data.contactId,
      contactName: data.clientName,
      phone: data.phone,
      status: 'success',
      message: logMessage,
    });

    return {
      ok: true,
      message: result.queued
        ? `Queued call for ${data.clientName} at ${data.phone} (position ${result.queuePosition})`
        : `Call initiated to ${data.clientName} at ${data.phone}`,
      callSid: result.callSid,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Call failed';
    appendSyncLog({
      direction: 'inbound',
      action: 'call_trigger',
      contactId,
      status: 'error',
      message: msg,
    });
    return { ok: false, message: msg };
  }
}

export async function handleGhlWebhook(body: Record<string, unknown>): Promise<void> {
  const config = getGhlConfig();
  if (!config.connected || !config.autoCallOnTag || !config.callTriggerTag) return;

  const { contactId, tags, locationId } = parseGhlWebhook(body);

  if (locationId && config.locationId && locationId !== config.locationId) {
    console.log('[GHL] Webhook ignored — different location');
    return;
  }

  if (!contactId) {
    console.log('[GHL] Webhook ignored — no contact id');
    appendSyncLog({
      direction: 'inbound',
      action: 'call_trigger',
      status: 'skipped',
      message: 'Webhook received but no contact_id in body',
    });
    return;
  }

  if (tags.length > 0 && !shouldTrigger(tags, config.callTriggerTag)) {
    console.log(
      `[GHL] Webhook tags [${tags.join(', ')}] do not include "${config.callTriggerTag}" — still placing call (workflow already filtered)`
    );
  } else {
    console.log(`[GHL] Triggering call for ${contactId}`);
  }
  await triggerCallForGhlContact(contactId, 'ghl_webhook');
}