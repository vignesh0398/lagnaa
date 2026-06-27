import { scheduleOutboundCall } from '../callQueue.js';
import { getContactById, getContactsByIds, getContactsConfig, listContacts } from './contactsStore.js';

const DEDUPE_MS = 10 * 60 * 1000;
const recentTriggers = new Map<string, number>();

function recentlyTriggered(contactId: string): boolean {
  const last = recentTriggers.get(contactId);
  if (!last) return false;
  if (Date.now() - last < DEDUPE_MS) return true;
  recentTriggers.delete(contactId);
  return false;
}

function shouldTrigger(tags: string[], triggerTag: string): boolean {
  const norm = triggerTag.trim().toLowerCase();
  return tags.some((t) => t.toLowerCase() === norm);
}

export async function triggerCallForContact(
  contactId: string,
  source = 'contact_manual'
): Promise<{ ok: boolean; message: string; callSid?: string; queued?: boolean }> {
  const contact = getContactById(contactId);
  if (!contact) return { ok: false, message: 'Contact not found' };
  if (contact.dnd) return { ok: false, message: 'Contact is on DND — calls disabled' };
  if (!contact.phone?.trim()) return { ok: false, message: 'Contact has no phone number' };

  if (recentlyTriggered(contactId)) {
    return { ok: false, message: 'Call already triggered recently for this contact (10 min window)' };
  }

  try {
    const result = await scheduleOutboundCall(
      {
        to: contact.phone,
        clientName: contact.name,
        clientDob: contact.dob,
        clientPostcode: contact.postcode,
        ghlContactId: contact.ghlContactId,
        contactId: contact.id,
      },
      { source, ghlContactId: contact.ghlContactId, contactId: contact.id, contactName: contact.name }
    );

    recentTriggers.set(contactId, Date.now());

    return {
      ok: true,
      message: result.message,
      callSid: result.callSid,
      queued: result.queued,
    };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Call failed' };
  }
}

export async function tryTriggerOnNewTags(
  contactId: string,
  addedTags: string[]
): Promise<{ triggered: boolean; message?: string }> {
  const config = getContactsConfig();
  if (!config.autoCallOnTag || !config.callTriggerTag.trim()) {
    return { triggered: false };
  }
  if (!shouldTrigger(addedTags, config.callTriggerTag)) {
    return { triggered: false };
  }
  const result = await triggerCallForContact(contactId, 'contact_tag_trigger');
  return { triggered: result.ok, message: result.message };
}

export interface BulkCallResult {
  total: number;
  placed: number;
  queued: number;
  skipped: number;
  errors: string[];
}

export async function callContactsByIds(
  contactIds: string[],
  source = 'contact_bulk'
): Promise<BulkCallResult> {
  const contacts = getContactsByIds(contactIds).filter((c) => c.phone?.trim() && !c.dnd);
  return runBulkCalls(contacts, source);
}

export async function callContactsByTags(
  tags: string[],
  source = 'contact_tag_campaign'
): Promise<BulkCallResult> {
  const wanted = tags.map((t) => t.trim().toLowerCase()).filter(Boolean);
  if (!wanted.length) {
    return { total: 0, placed: 0, queued: 0, skipped: 0, errors: ['No tags specified'] };
  }
  const contacts = listContacts().filter(
    (c) =>
      c.phone?.trim() &&
      !c.dnd &&
      wanted.some((t) => c.tags.some((x) => x.toLowerCase() === t))
  );
  return runBulkCalls(contacts, source);
}

async function runBulkCalls(
  contacts: ReturnType<typeof getContactsByIds>,
  source: string
): Promise<BulkCallResult> {
  const result: BulkCallResult = { total: contacts.length, placed: 0, queued: 0, skipped: 0, errors: [] };

  for (const contact of contacts) {
    const call = await triggerCallForContact(contact.id, source);
    if (call.ok) {
      if (call.queued) result.queued += 1;
      else result.placed += 1;
    } else {
      result.skipped += 1;
      if (result.errors.length < 10) {
        result.errors.push(`${contact.name}: ${call.message}`);
      }
    }
  }

  return result;
}