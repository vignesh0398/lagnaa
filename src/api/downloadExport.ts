import { API_HTML_RESPONSE_MESSAGE, API_OFFLINE_MESSAGE } from './fetchJson';

function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const match = /filename="?([^";\n]+)"?/i.exec(header);
  return match?.[1] ?? null;
}

export async function downloadExportFile(url: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new Error(API_OFFLINE_MESSAGE);
  }

  const contentType = res.headers.get('content-type') ?? '';
  const blob = await res.blob();

  if (!res.ok || contentType.includes('application/json')) {
    const text = await blob.text();
    if (text.trimStart().startsWith('<')) throw new Error(API_HTML_RESPONSE_MESSAGE);
    try {
      const data = JSON.parse(text) as { error?: string };
      throw new Error(data.error || `Download failed (${res.status})`);
    } catch (error) {
      if (error instanceof Error && !(error instanceof SyntaxError)) throw error;
      throw new Error(`Download failed (${res.status})`);
    }
  }

  const filename = filenameFromDisposition(res.headers.get('content-disposition'))
    ?? (contentType.includes('pdf') ? 'lagnaa-report.pdf' : 'lagnaa-export');
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}