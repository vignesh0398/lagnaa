import fs from 'fs';
import path from 'path';
import type { CallSession } from './conversation.js';
import { enrichCallMeta, type EnrichedCallMeta } from './callAnalytics.js';

export interface StoredCallRecord extends EnrichedCallMeta {
  sessionId: string;
  time: string;
  dateCreated: string;
  duration: string;
  durationSeconds: number;
  channelType: 'Voice';
  cost: string;
  from: string;
  to: string;
  direction: 'inbound' | 'outbound';
  agent: string;
  customerName: string;
  hasRecording: boolean;
  twilioStatus: string;
}

const HISTORY_PATH = path.join(process.cwd(), 'server', 'data', 'call-history.json');

function loadAll(): StoredCallRecord[] {
  if (!fs.existsSync(HISTORY_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8')) as StoredCallRecord[];
  } catch {
    return [];
  }
}

function saveAll(records: StoredCallRecord[]): void {
  fs.mkdirSync(path.dirname(HISTORY_PATH), { recursive: true });
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(records, null, 2));
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function upsertFromSession(
  callSid: string,
  twilioData: {
    from: string;
    to: string;
    direction: string;
    status: string;
    duration: number;
    price?: string | null;
    dateCreated: Date;
    hasRecording?: boolean;
  },
  session?: CallSession
): StoredCallRecord {
  const records = loadAll();
  const existing = records.find((r) => r.sessionId === callSid);
  const meta = enrichCallMeta(
    twilioData.status,
    twilioData.duration,
    session,
    session?.startedAt,
    session?.endedAt
  );

  const record: StoredCallRecord = {
    sessionId: callSid,
    time: twilioData.dateCreated.toISOString(),
    dateCreated: twilioData.dateCreated.toISOString(),
    duration: formatDuration(twilioData.duration),
    durationSeconds: twilioData.duration,
    channelType: 'Voice',
    cost: twilioData.price ? `$${twilioData.price}` : '—',
    from: twilioData.from,
    to: twilioData.to,
    direction: twilioData.direction.includes('inbound') ? 'inbound' : 'outbound',
    agent: session?.agentName ?? 'Mia',
    customerName:
      session?.clientName && session.clientName !== 'the client'
        ? session.clientName
        : existing?.customerName ?? '—',
    hasRecording: twilioData.hasRecording ?? false,
    twilioStatus: twilioData.status,
    ...meta,
  };

  const idx = records.findIndex((r) => r.sessionId === callSid);
  if (idx >= 0) records[idx] = record;
  else records.unshift(record);

  saveAll(records.slice(0, 500));
  return record;
}

export function getStoredRecord(callSid: string): StoredCallRecord | undefined {
  return loadAll().find((r) => r.sessionId === callSid);
}

export function listStoredRecords(): StoredCallRecord[] {
  return loadAll();
}

export function anonymizeCallHistoryForPhones(matchPhone: (phone: string) => boolean): number {
  const records = loadAll();
  let count = 0;
  const next = records.map((record) => {
    const phoneHit = matchPhone(record.from) || matchPhone(record.to);
    if (!phoneHit) return record;
    count += 1;
    return {
      ...record,
      customerName: 'Erased',
      from: matchPhone(record.from) ? 'erased' : record.from,
      to: matchPhone(record.to) ? 'erased' : record.to,
      summary: '[GDPR erased]',
    };
  });
  if (count) saveAll(next);
  return count;
}