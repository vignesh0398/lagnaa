export type DateRangePreset = 'all' | 'today' | '7d' | '4w' | '3m' | 'custom';

export interface EmailHistoryRecord {
  id: string;
  sessionId: string;
  time: string;
  dateCreated: string;
  duration: string;
  durationSeconds: number;
  channelType: string;
  campaignId: string;
  campaignName: string;
  provider: string;
  cost: string;
  from: string;
  to: string;
  customerName: string;
  direction: string;
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
}

export const EMAIL_HISTORY_COLUMNS: { key: keyof EmailHistoryRecord; label: string }[] = [
  { key: 'customerName', label: 'Customer Name' },
  { key: 'time', label: 'Time' },
  { key: 'campaignName', label: 'Campaign' },
  { key: 'to', label: 'Email' },
  { key: 'duration', label: 'Duration' },
  { key: 'channelType', label: 'Channel' },
  { key: 'messageCount', label: 'Messages' },
  { key: 'provider', label: 'Provider' },
  { key: 'sessionStatus', label: 'Session Status' },
  { key: 'currentStep', label: 'Flow Step' },
  { key: 'emailOutcome', label: 'Email Outcome' },
  { key: 'verificationOutcome', label: 'Verification' },
  { key: 'interestLevel', label: 'Interest Level' },
  { key: 'consentGiven', label: 'Consent Given' },
  { key: 'consentOutcome', label: 'Consent Outcome' },
  { key: 'userSentiment', label: 'User Sentiment' },
  { key: 'sessionOutcome', label: 'Session Outcome' },
  { key: 'summary', label: 'Summary' },
  { key: 'clientNotes', label: 'Client Notes' },
  { key: 'dndRequested', label: 'DND Requested' },
  { key: 'callbackRequested', label: 'Callback Requested' },
  { key: 'agent', label: 'Agent' },
  { key: 'recipientStatus', label: 'Delivery Status' },
];