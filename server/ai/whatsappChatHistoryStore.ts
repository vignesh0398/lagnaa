import fs from 'fs';
import path from 'path';
import type { CallSession } from './conversation.js';
import { enrichCallMeta } from './callAnalytics.js';
import type { CampaignRecipient } from './whatsappCampaignStore.js';
import { normalizePhone } from './whatsappCampaignStore.js';
import { getActiveProvider } from '../whatsappProviderStore.js';
import { getWhatsAppFromNumber } from '../whatsappClient.js';

export interface StoredChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface StoredChatRecord {
  id: string;
  sessionId: string;
  time: string;
  dateCreated: string;
  duration: string;
  durationSeconds: number;
  channelType: 'WhatsApp';
  campaignId: string;
  campaignName: string;
  provider: string;
  cost: string;
  from: string;
  to: string;
  customerName: string;
  direction: 'outbound';
  agent: string;
  messageCount: number;
  currentStep: string;
  recipientStatus: string;
  endReason: string;
  sessionStatus: string;
  userSentiment: string;
  sessionOutcome: string;
  endToEndLatencyMs: number | null;
  summary: string;
  chatOutcome: string;
  verificationOutcome: string;
  interestLevel: string;
  consentGiven: string;
  consentOutcome: string;
  clientNotes: string;
  dndRequested: string;
  callbackRequested: string;
  callbackTime: string;
  transcript: StoredChatMessage[];
}

const HISTORY_PATH = path.join(process.cwd(), 'server', 'data', 'whatsapp-chat-history.json');

function loadAll(): StoredChatRecord[] {
  if (!fs.existsSync(HISTORY_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8')) as StoredChatRecord[];
  } catch {
    return [];
  }
}

function saveAll(records: StoredChatRecord[]): void {
  fs.mkdirSync(path.dirname(HISTORY_PATH), { recursive: true });
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(records, null, 2));
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function recordId(campaignId: string, phone: string): string {
  return `wa-${normalizePhone(phone).replace(/\D/g, '')}-${campaignId}`;
}

function mapRecipientStatus(status: CampaignRecipient['status']): string {
  switch (status) {
    case 'pending':
      return 'Queued';
    case 'sent':
    case 'delivered':
      return 'Awaiting Reply';
    case 'replied':
    case 'in_flow':
      return 'In Progress';
    case 'completed':
      return 'Ended';
    case 'failed':
      return 'Error';
    case 'opted_out':
      return 'Ended';
    default:
      return 'In Progress';
  }
}

function mapTwilioLikeStatus(recipientStatus: CampaignRecipient['status'], session?: CallSession): string {
  if (session?.endedAt || recipientStatus === 'completed' || recipientStatus === 'opted_out') {
    return 'completed';
  }
  if (recipientStatus === 'failed') return 'failed';
  if (['replied', 'in_flow'].includes(recipientStatus)) return 'in-progress';
  if (['sent', 'delivered'].includes(recipientStatus)) return 'ringing';
  return 'queued';
}

function toStoredMessages(session?: CallSession): StoredChatMessage[] {
  return (session?.messages ?? []).map((m) => ({
    role: m.role,
    content: m.content,
    timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : String(m.timestamp),
  }));
}

function formatTranscript(messages: StoredChatMessage[]): string {
  if (messages.length === 0) return 'No messages yet.';
  return messages
    .map((m) => {
      const who = m.role === 'user' ? 'Customer' : 'Mia';
      const time = new Date(m.timestamp).toLocaleTimeString();
      return `[${time}] ${who}: ${m.content}`;
    })
    .join('\n');
}

export function upsertOnCampaignSend(
  campaignId: string,
  campaignName: string,
  recipient: CampaignRecipient
): StoredChatRecord {
  const records = loadAll();
  const id = recordId(campaignId, recipient.phone);
  const now = new Date().toISOString();
  const provider = getActiveProvider();
  const business = getWhatsAppFromNumber()?.replace('whatsapp:', '') ?? '—';

  const record: StoredChatRecord = {
    id,
    sessionId: id,
    time: recipient.sentAt ?? now,
    dateCreated: recipient.sentAt ?? now,
    duration: '0:00',
    durationSeconds: 0,
    channelType: 'WhatsApp',
    campaignId,
    campaignName,
    provider,
    cost: '—',
    from: recipient.phone,
    to: business,
    customerName: recipient.clientName,
    direction: 'outbound',
    agent: 'Mia',
    messageCount: 0,
    currentStep: 'template_sent',
    recipientStatus: recipient.status,
    endReason: '—',
    sessionStatus: mapRecipientStatus(recipient.status),
    userSentiment: 'Unknown',
    sessionOutcome: 'Unsuccessful',
    endToEndLatencyMs: null,
    summary: `Campaign "${campaignName}" — template sent to ${recipient.clientName}. Awaiting reply.`,
    chatOutcome: '—',
    verificationOutcome: 'Not Attempted',
    interestLevel: 'Unknown',
    consentGiven: '—',
    consentOutcome: 'No Answer',
    clientNotes: '—',
    dndRequested: 'No',
    callbackRequested: 'No',
    callbackTime: '—',
    transcript: [],
  };

  const idx = records.findIndex((r) => r.id === id);
  if (idx >= 0) records[idx] = { ...records[idx], ...record };
  else records.unshift(record);

  saveAll(records.slice(0, 1000));
  return record;
}

export function upsertFromChatSession(
  campaignId: string,
  campaignName: string,
  recipient: CampaignRecipient,
  session: CallSession
): StoredChatRecord {
  const records = loadAll();
  const id = recordId(campaignId, recipient.phone);
  const existing = records.find((r) => r.id === id);
  const twilioStatus = mapTwilioLikeStatus(recipient.status, session);
  const started = session.startedAt ?? new Date(existing?.dateCreated ?? Date.now());
  const ended = session.endedAt;
  const durationSec = ended
    ? Math.max(0, Math.floor((ended.getTime() - started.getTime()) / 1000))
    : Math.max(0, Math.floor((Date.now() - started.getTime()) / 1000));

  const meta = enrichCallMeta(twilioStatus, durationSec, session, started, ended);
  const { callOutcome, ...metaFields } = meta;
  const transcript = toStoredMessages(session);
  const provider = getActiveProvider();
  const business = getWhatsAppFromNumber()?.replace('whatsapp:', '') ?? '—';

  const record: StoredChatRecord = {
    id,
    sessionId: session.callSid,
    time: existing?.time ?? started.toISOString(),
    dateCreated: existing?.dateCreated ?? started.toISOString(),
    duration: formatDuration(durationSec),
    durationSeconds: durationSec,
    channelType: 'WhatsApp',
    campaignId,
    campaignName,
    provider,
    cost: '—',
    from: recipient.phone,
    to: business,
    customerName: recipient.clientName,
    direction: 'outbound',
    agent: session.agentName,
    messageCount: transcript.length,
    currentStep: session.step,
    recipientStatus: recipient.status,
    transcript,
    ...metaFields,
    chatOutcome: callOutcome,
    endReason: session.endedAt ? meta.endReason : existing?.endReason ?? '—',
    sessionStatus: mapRecipientStatus(recipient.status),
    summary: meta.summary.replace('spoke with', 'chatted with').replace('customer turns', 'messages'),
  };

  const idx = records.findIndex((r) => r.id === id);
  if (idx >= 0) records[idx] = record;
  else records.unshift(record);

  saveAll(records.slice(0, 1000));
  return record;
}

export function listChatRecords(): StoredChatRecord[] {
  return loadAll();
}

export function getChatRecord(id: string): StoredChatRecord | undefined {
  return loadAll().find((r) => r.id === id || r.sessionId === id);
}

export function getChatTranscript(id: string): string {
  const record = getChatRecord(id);
  if (!record) return 'Session not found.';
  return formatTranscript(record.transcript);
}

export function parseDateRange(preset: string, from?: string, to?: string): { start: Date | null; end: Date | null } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  switch (preset) {
    case 'today': {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }
    case '7d': {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }
    case '4w': {
      const start = new Date(now);
      start.setDate(start.getDate() - 28);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }
    case '3m': {
      const start = new Date(now);
      start.setMonth(start.getMonth() - 3);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }
    case 'custom': {
      if (!from) return { start: null, end: null };
      const start = new Date(from);
      const customEnd = to ? new Date(to) : end;
      customEnd.setHours(23, 59, 59, 999);
      return { start, end: customEnd };
    }
    default:
      return { start: null, end: null };
  }
}

export function queryChatHistory(options: {
  dateRange?: string;
  dateFrom?: string;
  dateTo?: string;
  filterColumn?: string;
  filterValue?: string;
  campaignId?: string;
}): { chats: StoredChatRecord[]; stats: Record<string, number> } {
  let filtered = listChatRecords();
  const { start, end } = parseDateRange(options.dateRange ?? 'all', options.dateFrom, options.dateTo);

  if (options.campaignId) {
    filtered = filtered.filter((c) => c.campaignId === options.campaignId);
  }

  if (start && end) {
    filtered = filtered.filter((c) => {
      const d = new Date(c.time);
      return d >= start && d <= end;
    });
  }

  if (options.filterValue) {
    const q = options.filterValue.toLowerCase();
    if (options.filterColumn) {
      const key = options.filterColumn as keyof StoredChatRecord;
      filtered = filtered.filter((c) => String(c[key] ?? '').toLowerCase().includes(q));
    } else {
      filtered = filtered.filter((c) =>
        Object.values(c).some((v) => String(v ?? '').toLowerCase().includes(q))
      );
    }
  }

  const stats = {
    total: filtered.length,
    ended: filtered.filter((c) => c.sessionStatus === 'Ended').length,
    awaiting: filtered.filter((c) => c.sessionStatus === 'Awaiting Reply').length,
    successful: filtered.filter((c) => c.sessionOutcome === 'Successful').length,
    inProgress: filtered.filter((c) => c.sessionStatus === 'In Progress').length,
    consentGiven: filtered.filter((c) => c.consentGiven === 'Yes').length,
  };

  return { chats: filtered, stats };
}