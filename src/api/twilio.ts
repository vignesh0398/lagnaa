export interface TwilioStatus {
  connected: boolean;
  message?: string;
  accountName?: string;
  accountSid?: string;
  phoneNumber?: string | null;
  phoneCount?: number;
  status?: string;
}

import type { CallHistoryRecord, DateRangePreset } from '../types/calls';

export interface TwilioCallsResponse {
  calls: CallHistoryRecord[];
  stats: {
    total: number;
    ended: number;
    notConnected: number;
    successful: number;
    inProgress: number;
  };
}

import { fetchJson } from './fetchJson';

function api<T>(path: string, options?: RequestInit): Promise<T> {
  return fetchJson<T>(path, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
}

export function getTwilioStatus() {
  return api<TwilioStatus>('/api/twilio/status');
}

export interface CallReadiness {
  ready: boolean;
  issues: string[];
  twilioConnected: boolean;
  publishedAgent: string | null;
  phoneNumber: string | null;
  webhookBase: string | null;
}

export function getCallReadiness() {
  return api<CallReadiness>('/api/twilio/call-readiness');
}

export function connectTwilio(credentials: {
  accountSid: string;
  authToken: string;
  phoneNumber?: string;
}) {
  return api<{ success: boolean; message: string; accountName?: string; phoneNumber?: string }>(
    '/api/twilio/connect',
    { method: 'POST', body: JSON.stringify(credentials) }
  );
}

export function disconnectTwilio() {
  return api<{ success: boolean; message: string }>('/api/twilio/disconnect', { method: 'POST' });
}

export interface AiVoiceStatus {
  groqConnected: boolean;
  groqMode: string;
  webhookReady: boolean;
  webhookUrl: string | null;
  relayUrl: string | null;
  speechEngine: string;
  voiceEngine: string;
  cost: string;
}

export function getAiVoiceStatus() {
  return api<AiVoiceStatus>('/api/ai/status');
}

export function connectGroq(apiKey: string) {
  return api<{ success: boolean; message: string }>('/api/ai/connect-groq', {
    method: 'POST',
    body: JSON.stringify({ apiKey }),
  });
}

export function setWebhookUrl(url: string) {
  return api<{ success: boolean; message: string; webhookUrl: string }>('/api/ai/set-webhook-url', {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
}

export function testWebhook() {
  return api<{ ok: boolean; message: string; webhookUrl: string | null }>('/api/ai/test-webhook');
}

export function getCallTranscript(callSid: string) {
  return api<{
    transcript: string | null;
    messages: { role: string; content: string }[];
    outcome?: Record<string, unknown> | null;
    step?: string;
  }>(`/api/ai/transcript/${callSid}`);
}

export interface CallQueueStats {
  enabled: boolean;
  maxConcurrent: number;
  active: number;
  pending: number;
  slotsAvailable: number;
}

export interface CallQueueConfig {
  enabled: boolean;
  maxConcurrent: number;
}

export function getCallQueue() {
  return api<{
    stats: CallQueueStats;
    config: CallQueueConfig;
    pending: { id: string; contactName?: string; options: { to: string }; enqueuedAt: string }[];
  }>('/api/twilio/queue');
}

export function updateCallQueue(config: Partial<CallQueueConfig>) {
  return api<{ success: boolean; config: CallQueueConfig; stats: CallQueueStats }>('/api/twilio/queue', {
    method: 'PUT',
    body: JSON.stringify(config),
  });
}

export function placeCall(payload: {
  to: string;
  from?: string;
  agentName?: string;
  aiVoice?: boolean;
  clientName?: string;
  clientDob?: string;
  clientPostcode?: string;
}) {
  return api<{
    success: boolean;
    callSid?: string;
    message: string;
    queued?: boolean;
    queuePosition?: number;
    aiVoice?: boolean;
  }>(
    '/api/twilio/call',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
}

export function getTwilioCalls(options?: {
  limit?: number;
  dateRange?: DateRangePreset;
  dateFrom?: string;
  dateTo?: string;
  filterColumn?: string;
  filterValue?: string;
}) {
  const params = new URLSearchParams();
  params.set('limit', String(options?.limit ?? 100));
  if (options?.dateRange) params.set('dateRange', options.dateRange);
  if (options?.dateFrom) params.set('dateFrom', options.dateFrom);
  if (options?.dateTo) params.set('dateTo', options.dateTo);
  if (options?.filterColumn) params.set('filterColumn', options.filterColumn);
  if (options?.filterValue) params.set('filterValue', options.filterValue);
  return api<TwilioCallsResponse>(`/api/twilio/calls?${params.toString()}`);
}

export function getTwilioPhoneNumbers() {
  return api<{ sid: string; phoneNumber: string; friendlyName: string }[]>('/api/twilio/phone-numbers');
}