import { enrichCallMeta } from './ai/callAnalytics.js';
import { getSession, getTranscript } from './ai/conversation.js';
import type { CallSession } from './ai/conversation.js';
import {
  addContactNote,
  findContactByPhoneOrEmail,
  getContact,
  searchContacts,
  updateContactFields,
  type GhlContact,
} from './ghlClient.js';
import { appendSyncLog, getGhlConfig, updateGhlConfig, type GhlFieldMapping } from './ghlStore.js';
import { buildPublicRecordingUrl } from './recordingUrl.js';

const TRANSCRIPT_MAX = 5000;

export interface OutcomeSyncPayload {
  channel: string;
  customerName?: string;
  phone?: string;
  email?: string;
  outcome: string;
  callSid?: string;
  campaignId?: string;
  ghlContactId?: string;
  recordingUrl?: string;
  durationSeconds?: number;
}

function tagForOutcome(outcome: string): string {
  const slug = outcome.toLowerCase().replace(/\s+/g, '-');
  return `lagnaa-${slug}`;
}

function truncateTranscript(text: string): string {
  if (text.length <= TRANSCRIPT_MAX) return text;
  return `${text.slice(0, TRANSCRIPT_MAX - 3)}...`;
}

function buildVoiceCallFields(
  mapping: GhlFieldMapping,
  session: CallSession,
  durationSeconds: number,
  recordingUrl?: string
): { key: string; value: string }[] {
  const meta = enrichCallMeta('completed', durationSeconds, session);
  const transcript = truncateTranscript(getTranscript(session.callSid));

  const fields: { key: string; value: string }[] = [
    { key: mapping.callOutcomeField, value: meta.callOutcome },
    { key: mapping.verificationOutcomeField, value: meta.verificationOutcome },
    { key: mapping.callSummaryField, value: meta.summary },
    { key: mapping.callTranscriptField, value: transcript },
  ];

  if (recordingUrl) {
    fields.push({ key: mapping.recordingUrlField, value: recordingUrl });
  }

  return fields.filter((f) => f.key && f.value && f.value !== '—');
}

function buildSimpleOutcomeFields(mapping: GhlFieldMapping, outcome: string): { key: string; value: string }[] {
  return [{ key: mapping.callOutcomeField, value: outcome }].filter((f) => f.key && f.value);
}

async function resolveContact(payload: OutcomeSyncPayload): Promise<GhlContact | null> {
  if (payload.ghlContactId) {
    try {
      return await getContact(payload.ghlContactId);
    } catch {
      /* fall through */
    }
  }
  return findContactByPhoneOrEmail(payload.phone, payload.email);
}

async function fetchRecordingUrl(callSid: string): Promise<string | undefined> {
  return buildPublicRecordingUrl(callSid) ?? undefined;
}

export async function syncOutcomeToGhl(payload: OutcomeSyncPayload): Promise<void> {
  const config = getGhlConfig();
  if (!config.connected || !config.autoSyncOutcomes || !config.apiKey || !config.locationId) return;

  try {
    const contact = await resolveContact(payload);
    if (!contact) {
      appendSyncLog({
        direction: 'outbound',
        action: 'push_outcome',
        contactName: payload.customerName,
        phone: payload.phone,
        email: payload.email,
        status: 'skipped',
        message: `No GHL contact found for ${payload.phone ?? payload.email ?? payload.ghlContactId ?? 'unknown'}`,
      });
      return;
    }

    const session = payload.callSid ? getSession(payload.callSid) : undefined;
    let fields: { key: string; value: string }[];

    if (payload.channel === 'voice' && session) {
      fields = buildVoiceCallFields(
        config.fieldMapping,
        session,
        payload.durationSeconds ?? 0,
        payload.recordingUrl
      );
    } else {
      fields = buildSimpleOutcomeFields(config.fieldMapping, payload.outcome);
    }

    const existingTags = contact.tags ?? [];
    const newTag = config.addTagsOnSync ? tagForOutcome(payload.outcome) : undefined;
    const tags = newTag && !existingTags.includes(newTag) ? [...existingTags, newTag] : undefined;

    await updateContactFields(contact.id, fields, tags);

    const noteLines = [
      `[Lagnaa] ${payload.channel} session ended`,
      `Call outcome: ${payload.outcome}`,
      session ? `Verification: ${enrichCallMeta('completed', payload.durationSeconds ?? 0, session).verificationOutcome}` : null,
      payload.recordingUrl ? `Recording: ${payload.recordingUrl}` : null,
      `Synced: ${new Date().toISOString()}`,
    ].filter(Boolean);

    await addContactNote(contact.id, noteLines.join('\n'));

    appendSyncLog({
      direction: 'outbound',
      action: 'push_outcome',
      contactId: contact.id,
      contactName: contactName(contact),
      phone: contact.phone ?? payload.phone,
      email: contact.email ?? payload.email,
      status: 'success',
      message:
        payload.channel === 'voice' && session
          ? `Updated 5 call fields in GHL${payload.recordingUrl ? ' (incl. recording)' : ''}`
          : `Updated call outcome → ${payload.outcome}`,
    });
  } catch (err) {
    appendSyncLog({
      direction: 'outbound',
      action: 'push_outcome',
      contactName: payload.customerName,
      phone: payload.phone,
      email: payload.email,
      status: 'error',
      message: err instanceof Error ? err.message : 'Sync failed',
    });
  }
}

export async function syncCallCompletionToGhl(
  callSid: string,
  session: CallSession | undefined,
  durationSeconds: number
): Promise<void> {
  if (!session) return;

  const recordingUrl = await fetchRecordingUrl(callSid);
  const outcome = session.outcomes.finalOutcome ?? 'Call Completed';

  await syncOutcomeToGhl({
    channel: 'voice',
    customerName: session.clientName,
    phone: session.toNumber,
    outcome,
    callSid,
    ghlContactId: session.ghlContactId,
    recordingUrl,
    durationSeconds,
  });
}

export async function importContactsFromGhl(options?: {
  tag?: string;
  limit?: number;
}): Promise<{ contacts: GhlContact[]; imported: number }> {
  const config = getGhlConfig();
  if (!config.connected || !config.apiKey || !config.locationId) {
    throw new Error('Connect GoHighLevel first');
  }

  const tag = options?.tag ?? config.importTagFilter;
  const contacts = await searchContacts({ tag: tag || undefined, limit: options?.limit ?? 100 });
  const withPhoneOrEmail = contacts.filter((c) => c.phone || c.email);

  appendSyncLog({
    direction: 'inbound',
    action: 'import_contacts',
    status: 'success',
    message: `Imported ${withPhoneOrEmail.length} contacts${tag ? ` (tag: ${tag})` : ''}`,
  });

  const current = getGhlConfig();
  updateGhlConfig({ contactsImported: current.contactsImported + withPhoneOrEmail.length });

  return { contacts: withPhoneOrEmail, imported: withPhoneOrEmail.length };
}

function contactName(c: GhlContact): string {
  if (c.name) return c.name;
  const parts = [c.firstName, c.lastName].filter(Boolean);
  return parts.length ? parts.join(' ') : 'Unknown';
}