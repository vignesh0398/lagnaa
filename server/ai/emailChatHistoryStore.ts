import fs from 'fs';
import path from 'path';
import type { CallSession } from './conversation.js';
import { enrichCallMeta } from './callAnalytics.js';
import type { EmailCampaignRecipient } from './emailCampaignStore.js';
import { normalizeEmail } from './emailCampaignStore.js';
import { getActiveEmailProvider, loadEmailProviderConfig } from '../emailProviderStore.js';

export interface StoredEmailMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface StoredEmailRecord {
  id: string;
  sessionId: string;
  time: string;
  dateCreated: string;
  duration: string;
  durationSeconds: number;
  channelType: 'Email';
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
  emailOutcome: string;
  verificationOutcome: string;
  interestLevel: string;
  consentGiven: string;
  consentOutcome: string;
  clientNotes: string;
  dndRequested: string;
  callbackRequested: string;
  callbackTime: string;
  transcript: StoredEmailMessage[];
}

const HISTORY_PATH = path.join(process.cwd(), 'server', 'data', 'email-chat-history.json');

function loadAll(): StoredEmailRecord[] {
  if (!fs.existsSync(HISTORY_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8')) as StoredEmailRecord[];
  } catch {
    return [];
  }
}

function saveAll(records: StoredEmailRecord[]): void {
  fs.mkdirSync(path.dirname(HISTORY_PATH), { recursive: true });
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(records, null, 2));
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function recordId(campaignId: string, email: string): string {
  return `em-${normalizeEmail(email).replace(/[^a-z0-9]/g, '')}-${campaignId}`;
}

function mapStatus(status: EmailCampaignRecipient['status']): string {
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

function mapTwilioLikeStatus(status: EmailCampaignRecipient['status'], session?: CallSession): string {
  if (session?.endedAt || status === 'completed' || status === 'opted_out') return 'completed';
  if (status === 'failed') return 'failed';
  if (['replied', 'in_flow'].includes(status)) return 'in-progress';
  if (['sent', 'delivered'].includes(status)) return 'ringing';
  return 'queued';
}

function toStoredMessages(session?: CallSession): StoredEmailMessage[] {
  return (session?.messages ?? []).map((m) => ({
    role: m.role,
    content: m.content,
    timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : String(m.timestamp),
  }));
}

function formatTranscript(messages: StoredEmailMessage[]): string {
  if (messages.length === 0) return 'No messages yet.';
  return messages
    .map((m) => {
      const who = m.role === 'user' ? 'Customer' : 'Mia';
      const time = new Date(m.timestamp).toLocaleString();
      return `[${time}] ${who}:\n${m.content}`;
    })
    .join('\n\n');
}

export function upsertOnEmailSend(
  campaignId: string,
  campaignName: string,
  recipient: EmailCampaignRecipient
): StoredEmailRecord {
  const records = loadAll();
  const id = recordId(campaignId, recipient.email);
  const now = new Date().toISOString();
  const config = loadEmailProviderConfig();

  const record: StoredEmailRecord = {
    id,
    sessionId: id,
    time: recipient.sentAt ?? now,
    dateCreated: recipient.sentAt ?? now,
    duration: '0:00',
    durationSeconds: 0,
    channelType: 'Email',
    campaignId,
    campaignName,
    provider: getActiveEmailProvider(),
    cost: '—',
    from: config.fromEmail || '—',
    to: recipient.email,
    customerName: recipient.clientName,
    direction: 'outbound',
    agent: 'Mia',
    messageCount: 0,
    currentStep: 'template_sent',
    recipientStatus: recipient.status,
    endReason: '—',
    sessionStatus: mapStatus(recipient.status),
    userSentiment: 'Unknown',
    sessionOutcome: 'Unsuccessful',
    endToEndLatencyMs: null,
    summary: `Campaign "${campaignName}" — email sent to ${recipient.clientName}. Awaiting reply.`,
    emailOutcome: '—',
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

export function upsertFromEmailSession(
  campaignId: string,
  campaignName: string,
  recipient: EmailCampaignRecipient,
  session: CallSession
): StoredEmailRecord {
  const records = loadAll();
  const id = recordId(campaignId, recipient.email);
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
  const config = loadEmailProviderConfig();

  const record: StoredEmailRecord = {
    id,
    sessionId: session.callSid,
    time: existing?.time ?? started.toISOString(),
    dateCreated: existing?.dateCreated ?? started.toISOString(),
    duration: formatDuration(durationSec),
    durationSeconds: durationSec,
    channelType: 'Email',
    campaignId,
    campaignName,
    provider: getActiveEmailProvider(),
    cost: '—',
    from: config.fromEmail || '—',
    to: recipient.email,
    customerName: recipient.clientName,
    direction: 'outbound',
    agent: session.agentName,
    messageCount: transcript.length,
    currentStep: session.step,
    recipientStatus: recipient.status,
    transcript,
    ...metaFields,
    emailOutcome: callOutcome,
    endReason: session.endedAt ? meta.endReason : existing?.endReason ?? '—',
    sessionStatus: mapStatus(recipient.status),
    summary: meta.summary.replace('spoke with', 'emailed with').replace('customer turns', 'messages'),
  };

  const idx = records.findIndex((r) => r.id === id);
  if (idx >= 0) records[idx] = record;
  else records.unshift(record);
  saveAll(records.slice(0, 1000));
  return record;
}

export function listEmailRecords(): StoredEmailRecord[] {
  return loadAll();
}

export function getEmailTranscript(id: string): string {
  const record = loadAll().find((r) => r.id === id || r.sessionId === id);
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

export function queryEmailHistory(options: {
  dateRange?: string;
  dateFrom?: string;
  dateTo?: string;
  filterColumn?: string;
  filterValue?: string;
  campaignId?: string;
}): { emails: StoredEmailRecord[]; stats: Record<string, number> } {
  let filtered = loadAll();
  const { start, end } = parseDateRange(options.dateRange ?? 'all', options.dateFrom, options.dateTo);

  if (options.campaignId) filtered = filtered.filter((c) => c.campaignId === options.campaignId);
  if (start && end) {
    filtered = filtered.filter((c) => {
      const d = new Date(c.time);
      return d >= start && d <= end;
    });
  }
  if (options.filterValue) {
    const q = options.filterValue.toLowerCase();
    if (options.filterColumn) {
      const key = options.filterColumn as keyof StoredEmailRecord;
      filtered = filtered.filter((c) => String(c[key] ?? '').toLowerCase().includes(q));
    } else {
      filtered = filtered.filter((c) =>
        Object.values(c).some((v) => String(v ?? '').toLowerCase().includes(q))
      );
    }
  }

  return {
    emails: filtered,
    stats: {
      total: filtered.length,
      ended: filtered.filter((c) => c.sessionStatus === 'Ended').length,
      awaiting: filtered.filter((c) => c.sessionStatus === 'Awaiting Reply').length,
      successful: filtered.filter((c) => c.sessionOutcome === 'Successful').length,
      inProgress: filtered.filter((c) => c.sessionStatus === 'In Progress').length,
      consentGiven: filtered.filter((c) => c.consentGiven === 'Yes').length,
    },
  };
}