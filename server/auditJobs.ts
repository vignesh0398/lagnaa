import { randomUUID } from 'crypto';

export type AuditJobStatus = 'pending' | 'running' | 'done' | 'error';

export interface AuditJob<T = unknown> {
  id: string;
  status: AuditJobStatus;
  result?: T;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

const jobs = new Map<string, AuditJob>();
const MAX_AGE_MS = 30 * 60 * 1000;

function pruneOldJobs(): void {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (now - job.createdAt > MAX_AGE_MS) jobs.delete(id);
  }
}

export function createAuditJob<T>(): string {
  pruneOldJobs();
  const id = `job-${Date.now()}-${randomUUID().slice(0, 8)}`;
  jobs.set(id, { id, status: 'pending', createdAt: Date.now(), updatedAt: Date.now() });
  return id;
}

export function getAuditJob<T>(id: string): AuditJob<T> | undefined {
  return jobs.get(id) as AuditJob<T> | undefined;
}

export function runAuditJob<T>(id: string, work: () => Promise<T>, onSuccess?: (result: T) => void): void {
  const job = jobs.get(id);
  if (!job) return;

  job.status = 'running';
  job.updatedAt = Date.now();

  void work()
    .then((result) => {
      job.status = 'done';
      job.result = result;
      job.updatedAt = Date.now();
      onSuccess?.(result);
    })
    .catch((error) => {
      job.status = 'error';
      job.error = error instanceof Error ? error.message : 'Audit failed';
      job.updatedAt = Date.now();
    });
}