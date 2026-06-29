export const API_OFFLINE_MESSAGE =
  'Start the backend first — double-click start-lagnaa.bat in the ai-call-crm folder, or run: npm run dev';

export const API_HTML_RESPONSE_MESSAGE =
  'The server returned a web page instead of data. Hard-refresh the page (Ctrl+Shift+R) and try again. If you run locally, start both servers with: npm run dev';

/** Marketing/SEO audits fetch multiple pages and can take 1–2 minutes. */
export const AUDIT_REQUEST_TIMEOUT_MS = 180_000;

function isHtmlResponse(text: string): boolean {
  const trimmed = text.trimStart().toLowerCase();
  return trimmed.startsWith('<!doctype') || trimmed.startsWith('<html') || trimmed.startsWith('<');
}

function mergeHeaders(init?: RequestInit): HeadersInit {
  return {
    Accept: 'application/json',
    ...(init?.headers ?? {}),
  };
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, headers: mergeHeaders(init) });
  } catch (error) {
    if (error instanceof Error && (error.name === 'TimeoutError' || error.message.toLowerCase().includes('timeout'))) {
      throw new Error('The audit took too long. Try again — complex sites can take up to 2 minutes.');
    }
    throw new Error(API_OFFLINE_MESSAGE);
  }

  const text = await res.text();
  let data: unknown = null;

  if (text.trim()) {
    if (isHtmlResponse(text)) {
      throw new Error(res.ok ? API_HTML_RESPONSE_MESSAGE : API_OFFLINE_MESSAGE);
    }
    try {
      data = JSON.parse(text);
    } catch {
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
  let first = true;

  while (Date.now() < deadline) {
    if (!first) {
      await new Promise((resolve) => setTimeout(resolve, AUDIT_POLL_INTERVAL_MS));
    }
    first = false;

    const job = await fetchJson<AuditJobResponse<T>>(`/api/audit-jobs/${encodeURIComponent(jobId)}`);

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
  const start = await fetchJsonAudit<{ jobId?: string; result?: T; audit?: T }>(url, init);
  if (start.jobId) return pollAuditJob<T>(start.jobId);
  if (start.result !== undefined) return start.result;
  if (start.audit !== undefined) return start.audit;
  throw new Error('Audit failed to start.');
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