import { fetchJson } from './fetchJson';

export interface GhlFieldMapping {
  callOutcomeField: string;
  verificationOutcomeField: string;
  callSummaryField: string;
  callTranscriptField: string;
  recordingUrlField: string;
  nameField: string;
  dobField: string;
  postcodeField: string;
}

export interface GhlSyncLogEntry {
  id: string;
  direction: 'inbound' | 'outbound';
  action: string;
  contactId?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  status: 'success' | 'error' | 'skipped';
  message: string;
  at: string;
}

export interface GhlConfig {
  connected: boolean;
  locationId: string;
  locationName?: string;
  apiKeyMasked: string;
  connectedAt?: string;
  autoSyncOutcomes: boolean;
  addTagsOnSync: boolean;
  importTagFilter: string;
  autoCallOnTag: boolean;
  callTriggerTag: string;
  callsTriggered: number;
  fieldMapping: GhlFieldMapping;
  syncLog: GhlSyncLogEntry[];
  lastInboundSync?: string;
  lastOutboundSync?: string;
  contactsImported: number;
  outcomesPushed: number;
  inboundWebhookUrl?: string | null;
  webhookReady?: boolean;
}

export interface GhlImportedContact {
  id: string;
  name: string;
  phone: string;
  email: string;
  tags: string[];
}

export function getGhlConfig(): Promise<GhlConfig> {
  return fetchJson<GhlConfig>('/api/ghl/config');
}

export function connectGhl(apiKey: string, locationId: string): Promise<{ message: string; config: GhlConfig }> {
  return fetchJson('/api/ghl/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, locationId }),
  });
}

export async function disconnectGhl(): Promise<GhlConfig> {
  const data = await fetchJson<{ config: GhlConfig }>('/api/ghl/disconnect', { method: 'POST' });
  return data.config;
}

export async function updateGhlConfig(data: {
  autoSyncOutcomes?: boolean;
  addTagsOnSync?: boolean;
  importTagFilter?: string;
  autoCallOnTag?: boolean;
  callTriggerTag?: string;
  fieldMapping?: Partial<GhlFieldMapping>;
}): Promise<GhlConfig> {
  const result = await fetchJson<{ config: GhlConfig }>('/api/ghl/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return result.config;
}

export function importGhlContacts(tag?: string): Promise<{
  imported: number;
  contacts: GhlImportedContact[];
  config: GhlConfig;
}> {
  return fetchJson('/api/ghl/sync/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tag }),
  });
}

export function triggerGhlCall(contactId: string): Promise<{ success: boolean; message: string; callSid?: string }> {
  return fetchJson('/api/ghl/trigger/call', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contactId }),
  });
}