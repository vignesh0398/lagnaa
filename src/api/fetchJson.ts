export const API_OFFLINE_MESSAGE =
  'Start the backend first — double-click start-lagnaa.bat in the ai-call-crm folder, or run: npm run dev';

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
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