export type CallStatus = 'completed' | 'interrupted' | 'in_progress' | 'voicemail' | 'queued';

export interface CallHistoryRecord {
  id: string;
  sessionId: string;
  time: string;
  dateCreated: string;
  duration: string;
  durationSeconds: number;
  channelType: string;
  cost: string;
  endReason: string;
  sessionStatus: string;
  userSentiment: string;
  from: string;
  to: string;
  customerName: string;
  direction: 'inbound' | 'outbound';
  sessionOutcome: string;
  endToEndLatencyMs: number | null;
  summary: string;
  callOutcome: string;
  verificationOutcome: string;
  interestLevel: string;
  consentGiven: string;
  consentOutcome: string;
  clientNotes: string;
  dndRequested: string;
  callbackRequested: string;
  callbackTime: string;
  agent: string;
  hasRecording: boolean;
  queuedAt: string;
  status: string;
}

export type DateRangePreset = 'all' | 'today' | '7d' | '4w' | '3m' | 'custom';

export const CALL_HISTORY_COLUMNS: { key: keyof CallHistoryRecord; label: string }[] = [
  { key: 'customerName', label: 'Customer Name' },
  { key: 'time', label: 'Time' },
  { key: 'duration', label: 'Duration' },
  { key: 'channelType', label: 'Channel Type' },
  { key: 'cost', label: 'Cost' },
  { key: 'sessionId', label: 'Session ID' },
  { key: 'endReason', label: 'End Reason' },
  { key: 'sessionStatus', label: 'Session Status' },
  { key: 'userSentiment', label: 'User Sentiment' },
  { key: 'from', label: 'From' },
  { key: 'to', label: 'To' },
  { key: 'direction', label: 'Direction' },
  { key: 'sessionOutcome', label: 'Session Outcome' },
  { key: 'endToEndLatencyMs', label: 'End to End Latency' },
  { key: 'summary', label: 'Summary' },
  { key: 'callOutcome', label: 'Call Outcome' },
  { key: 'verificationOutcome', label: 'Verification Outcome' },
  { key: 'interestLevel', label: 'Interest Level' },
  { key: 'consentGiven', label: 'Consent Given' },
  { key: 'clientNotes', label: 'Client Notes' },
  { key: 'dndRequested', label: 'DND Requested' },
  { key: 'callbackRequested', label: 'Callback Requested' },
  { key: 'callbackTime', label: 'Callback Time' },
  { key: 'consentOutcome', label: 'Consent Outcome' },
];