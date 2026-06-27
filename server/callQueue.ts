import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { PlaceCallOptions } from './placeCall.js';
import { incrementCallsTriggered } from './ghlStore.js';
import { placeOutboundCall } from './placeCall.js';

export interface CallQueueConfig {
  enabled: boolean;
  maxConcurrent: number;
}

export interface QueuedCallJob {
  id: string;
  options: PlaceCallOptions;
  source: string;
  ghlContactId?: string;
  contactName?: string;
  enqueuedAt: string;
}

interface CallQueueStore {
  config: CallQueueConfig;
  pending: QueuedCallJob[];
}

export interface ScheduleCallMeta {
  source?: string;
  ghlContactId?: string;
  contactId?: string;
  contactName?: string;
}

export interface ScheduleCallResult {
  placed: boolean;
  queued: boolean;
  callSid?: string;
  queuePosition?: number;
  jobId?: string;
  message: string;
}

export interface CallQueueStats {
  enabled: boolean;
  maxConcurrent: number;
  active: number;
  pending: number;
  slotsAvailable: number;
}

const QUEUE_PATH = path.join(process.cwd(), 'server', 'data', 'call-queue.json');
const DEFAULT_CONFIG: CallQueueConfig = { enabled: true, maxConcurrent: 5 };

const activeCallSids = new Set<string>();
let processing = false;

function loadStore(): CallQueueStore {
  if (!fs.existsSync(QUEUE_PATH)) {
    const initial: CallQueueStore = { config: { ...DEFAULT_CONFIG }, pending: [] };
    saveStore(initial);
    return initial;
  }
  const raw = JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf-8')) as CallQueueStore;
  return {
    config: {
      enabled: raw.config?.enabled ?? DEFAULT_CONFIG.enabled,
      maxConcurrent: Math.max(1, Math.min(50, raw.config?.maxConcurrent ?? DEFAULT_CONFIG.maxConcurrent)),
    },
    pending: Array.isArray(raw.pending) ? raw.pending : [],
  };
}

function saveStore(store: CallQueueStore): void {
  fs.mkdirSync(path.dirname(QUEUE_PATH), { recursive: true });
  fs.writeFileSync(QUEUE_PATH, JSON.stringify(store, null, 2));
}

function newJobId(): string {
  return `q-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
}

export function getCallQueueConfig(): CallQueueConfig {
  return loadStore().config;
}

export function updateCallQueueConfig(updates: Partial<CallQueueConfig>): CallQueueConfig {
  const store = loadStore();
  if (updates.enabled !== undefined) store.config.enabled = updates.enabled;
  if (updates.maxConcurrent !== undefined) {
    store.config.maxConcurrent = Math.max(1, Math.min(50, updates.maxConcurrent));
  }
  saveStore(store);
  void processQueue();
  return store.config;
}

export function getCallQueueStats(): CallQueueStats {
  const store = loadStore();
  const { enabled, maxConcurrent } = store.config;
  const active = activeCallSids.size;
  return {
    enabled,
    maxConcurrent,
    active,
    pending: store.pending.length,
    slotsAvailable: enabled ? Math.max(0, maxConcurrent - active) : maxConcurrent,
  };
}

export function listPendingJobs(): QueuedCallJob[] {
  return loadStore().pending;
}

function enqueueJob(job: QueuedCallJob): number {
  const store = loadStore();
  store.pending.push(job);
  saveStore(store);
  return store.pending.length;
}

function dequeueNext(): QueuedCallJob | null {
  const store = loadStore();
  const job = store.pending.shift() ?? null;
  saveStore(store);
  return job;
}

export function registerActiveCall(callSid: string): void {
  activeCallSids.add(callSid);
}

export function releaseCallSlot(callSid: string): void {
  if (activeCallSids.delete(callSid)) {
    void processQueue();
  }
}

async function startJob(job: QueuedCallJob): Promise<void> {
  try {
    const result = await placeOutboundCall(job.options);
    registerActiveCall(result.callSid);
    if (job.ghlContactId) incrementCallsTriggered();
    console.log(`[CallQueue] Started ${job.source} → ${job.options.to} (${result.callSid})`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Call failed';
    console.error(`[CallQueue] Failed job ${job.id} (${job.options.to}):`, msg);
  }
}

export async function processQueue(): Promise<void> {
  if (processing) return;
  const config = getCallQueueConfig();
  if (!config.enabled) return;

  processing = true;
  try {
    while (activeCallSids.size < config.maxConcurrent) {
      const job = dequeueNext();
      if (!job) break;
      await startJob(job);
    }
  } finally {
    processing = false;
  }
}

export async function scheduleOutboundCall(
  options: PlaceCallOptions,
  meta: ScheduleCallMeta = {}
): Promise<ScheduleCallResult> {
  const config = getCallQueueConfig();
  const source = meta.source ?? 'manual';

  if (!config.enabled || activeCallSids.size < config.maxConcurrent) {
    const result = await placeOutboundCall(options);
    registerActiveCall(result.callSid);
    void processQueue();
    return {
      placed: true,
      queued: false,
      callSid: result.callSid,
      message: `Call initiated to ${options.to}`,
    };
  }

  const job: QueuedCallJob = {
    id: newJobId(),
    options,
    source,
    ghlContactId: meta.ghlContactId,
    contactName: meta.contactName,
    enqueuedAt: new Date().toISOString(),
  };
  const position = enqueueJob(job);
  console.log(`[CallQueue] Queued ${source} → ${options.to} (position ${position})`);

  return {
    placed: false,
    queued: true,
    queuePosition: position,
    jobId: job.id,
    message: `Call queued for ${options.to} — position ${position} (${activeCallSids.size}/${config.maxConcurrent} lines in use)`,
  };
}