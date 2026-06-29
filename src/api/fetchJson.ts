export const API_OFFLINE_MESSAGE =
  'Start the backend first — double-click start-lagnaa.bat in the ai-call-crm folder, or run: npm run dev';

/** Marketing/SEO audits fetch multiple pages and can take 1–2 minutes. */
export const AUDIT_REQUEST_TIMEOUT_MS = 180_000;

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (error) {
    if (error instanceof Error && (error.name === 'TimeoutError' || error.message.toLowerCase().includes('timeout'))) {
      throw new Error('The audit took too long. Try again — complex sites can take up to 2 minutes.');
    }
    throw new Error(API_OFFLINE_MESSAGE);
  }

  const text = await res.text();
  let data: unknown = null;

  if (text.trim()) {
    try {
      data = JSON.parse(text);
    } catch {
      if (text.trimStart().startsWith('<')) {
        throw new Error(API_OFFLINE_MESSAGE);
      }
      throw new Error('Invalid response from API server');
    }
  } else if (!res.ok || res.status === 502 || res.status === 504) {
    throw new Error(API_OFFLINE_MESSAGE);
  }

  if (!res.ok) {
    const message = (data as { error?: string; message?: string } | null)?.error
      ?? (data as { message?: string } | null)?.message
      ?? `Request failed (${res.status})`;
    throw new Error(message);
  }

  return data as T;
}

export async function fetchJsonAudit<T>(url: string, init?: RequestInit): Promise<T> {
  return fetchJson<T>(url, {
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(AUDIT_REQUEST_TIMEOUT_MS),
  });
}

export type AuditJobStatus = 'pending' | 'running' | 'done' | 'error';

interface AuditJobResponse<T> {
  id: string;
  status: AuditJobStatus;
  result?: T;
  error?: string;
}

const AUDIT_POLL_INTERVAL_MS = 1500;

export async function pollAuditJob<T>(jobId: string): Promise<T> {
  const deadline = Date.now() + AUDIT_REQUEST_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, AUDIT_POLL_INTERVAL_MS));
    const job = await fetchJson<AuditJobResponse<T>>(`/api/audit-jobs/${jobId}`);

    if (job.status === 'done') {
      if (job.result === undefined) throw new Error('Audit finished without a result.');
      return job.result;
    }
    if (job.status === 'error') {
      throw new Error(job.error || 'Audit failed');
    }
  }

  throw new Error('The audit took too long. Try again — complex sites can take up to 2 minutes.');
}

export async function startAuditJob<T>(url: string, init?: RequestInit): Promise<T> {
  const start = await fetchJsonAudit<{ jobId: string }>(url, init);
  if (!start.jobId) throw new Error('Audit failed to start.');
  return pollAuditJob<T>(start.jobId);
}

export async function checkApiHealth(): Promise<boolean> {
  try {
    const data = await fetchJson<{ ok?: boolean }>('/api/health', {
      signal: AbortSignal.timeout(4000),
    });
    return data.ok === true;
  } catch {
    return false;
  }
}