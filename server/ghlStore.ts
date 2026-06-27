import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

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
  apiKey: string;
  locationId: string;
  locationName?: string;
  connected: boolean;
  connectedAt?: string;
  autoSyncOutcomes: boolean;
  addTagsOnSync: boolean;
  importTagFilter: string;
  fieldMapping: GhlFieldMapping;
  syncLog: GhlSyncLogEntry[];
  lastInboundSync?: string;
  lastOutboundSync?: string;
  contactsImported: number;
  outcomesPushed: number;
  autoCallOnTag: boolean;
  callTriggerTag: string;
  callsTriggered: number;
}

const STORE_PATH = path.join(process.cwd(), 'server', 'data', 'ghl.json');

const DEFAULT_MAPPING: GhlFieldMapping = {
  callOutcomeField: 'lagnaa_call_outcome',
  verificationOutcomeField: 'lagnaa_verification_outcome',
  callSummaryField: 'lagnaa_call_summary',
  callTranscriptField: 'lagnaa_call_transcript',
  recordingUrlField: 'lagnaa_recording_url',
  nameField: 'customer_name',
  dobField: 'customer_dob',
  postcodeField: 'customer_postcode',
};

function migrateFieldMapping(raw: Record<string, string | undefined>): GhlFieldMapping {
  const nameField = raw.nameField?.trim();
  const dobField = raw.dobField?.trim();
  const postcodeField = raw.postcodeField?.trim();

  return {
    callOutcomeField: raw.callOutcomeField ?? raw.outcomeField ?? DEFAULT_MAPPING.callOutcomeField,
    verificationOutcomeField: raw.verificationOutcomeField ?? DEFAULT_MAPPING.verificationOutcomeField,
    callSummaryField: raw.callSummaryField ?? DEFAULT_MAPPING.callSummaryField,
    callTranscriptField: raw.callTranscriptField ?? DEFAULT_MAPPING.callTranscriptField,
    recordingUrlField: raw.recordingUrlField ?? raw.recordingField ?? DEFAULT_MAPPING.recordingUrlField,
    nameField: nameField || DEFAULT_MAPPING.nameField,
    dobField: !dobField || dobField === 'date_of_birth' ? DEFAULT_MAPPING.dobField : dobField,
    postcodeField: !postcodeField || postcodeField === 'postcode' ? DEFAULT_MAPPING.postcodeField : postcodeField,
  };
}

function defaultConfig(): GhlConfig {
  return {
    apiKey: '',
    locationId: '',
    connected: false,
    autoSyncOutcomes: true,
    addTagsOnSync: true,
    importTagFilter: '',
    fieldMapping: { ...DEFAULT_MAPPING },
    syncLog: [],
    contactsImported: 0,
    outcomesPushed: 0,
    autoCallOnTag: true,
    callTriggerTag: 'lagnaa-call',
    callsTriggered: 0,
  };
}

function loadConfig(): GhlConfig {
  if (fs.existsSync(STORE_PATH)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8')) as GhlConfig;
      return {
        ...defaultConfig(),
        ...parsed,
        fieldMapping: migrateFieldMapping((parsed.fieldMapping ?? {}) as Record<string, string | undefined>),
      };
    } catch {
      /* fall through */
    }
  }
  return defaultConfig();
}

function saveConfig(config: GhlConfig): void {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(config, null, 2));
}

export function getGhlConfig(): GhlConfig {
  return loadConfig();
}

export function maskGhlKey(key: string): string {
  if (!key || key.length <= 12) return '••••••••';
  return `${key.slice(0, 6)}••••${key.slice(-4)}`;
}

export function updateGhlConfig(updates: Partial<GhlConfig> & { fieldMapping?: Partial<GhlFieldMapping> }): GhlConfig {
  const config = loadConfig();
  if (updates.fieldMapping) {
    config.fieldMapping = { ...config.fieldMapping, ...updates.fieldMapping };
    delete (updates as { fieldMapping?: Partial<GhlFieldMapping> }).fieldMapping;
  }
  Object.assign(config, updates);
  saveConfig(config);
  return config;
}

export function setGhlConnected(connected: boolean, locationName?: string): GhlConfig {
  const config = loadConfig();
  config.connected = connected;
  if (connected) {
    config.connectedAt = new Date().toISOString();
    if (locationName) config.locationName = locationName;
  } else {
    config.locationName = undefined;
    config.connectedAt = undefined;
  }
  saveConfig(config);
  return config;
}

export function disconnectGhl(): GhlConfig {
  const config = loadConfig();
  config.apiKey = '';
  config.locationId = '';
  config.connected = false;
  config.locationName = undefined;
  config.connectedAt = undefined;
  saveConfig(config);
  return config;
}

export function appendSyncLog(entry: Omit<GhlSyncLogEntry, 'id' | 'at'>): GhlSyncLogEntry {
  const config = loadConfig();
  const full: GhlSyncLogEntry = {
    ...entry,
    id: `ghl-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    at: new Date().toISOString(),
  };
  config.syncLog.unshift(full);
  config.syncLog = config.syncLog.slice(0, 100);
  if (entry.direction === 'inbound' && entry.status === 'success') {
    config.lastInboundSync = full.at;
  }
  if (entry.direction === 'outbound' && entry.status === 'success') {
    config.lastOutboundSync = full.at;
    config.outcomesPushed += 1;
  }
  saveConfig(config);
  return full;
}

export function getPublicGhlConfig() {
  const config = loadConfig();
  return {
    connected: config.connected,
    locationId: config.locationId,
    locationName: config.locationName,
    apiKeyMasked: maskGhlKey(config.apiKey),
    connectedAt: config.connectedAt,
    autoSyncOutcomes: config.autoSyncOutcomes,
    addTagsOnSync: config.addTagsOnSync,
    importTagFilter: config.importTagFilter,
    fieldMapping: config.fieldMapping,
    syncLog: config.syncLog.slice(0, 30),
    lastInboundSync: config.lastInboundSync,
    lastOutboundSync: config.lastOutboundSync,
    contactsImported: config.contactsImported,
    outcomesPushed: config.outcomesPushed,
    autoCallOnTag: config.autoCallOnTag,
    callTriggerTag: config.callTriggerTag,
    callsTriggered: config.callsTriggered,
  };
}

export function incrementCallsTriggered(): void {
  const config = loadConfig();
  config.callsTriggered += 1;
  saveConfig(config);
}