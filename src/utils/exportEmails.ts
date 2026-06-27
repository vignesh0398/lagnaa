import { EMAIL_HISTORY_COLUMNS, type EmailHistoryRecord } from '../types/emails';

function escapeCsv(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export function exportEmailsToExcel(emails: EmailHistoryRecord[], filename?: string): void {
  const headers = EMAIL_HISTORY_COLUMNS.map((c) => c.label);
  const rows = emails.map((e) =>
    EMAIL_HISTORY_COLUMNS.map((col) => {
      const val = e[col.key];
      if (col.key === 'time') return escapeCsv(new Date(e.time).toLocaleString());
      if (col.key === 'endToEndLatencyMs') return val != null ? `${val} ms` : '';
      return escapeCsv(String(val ?? ''));
    }).join(',')
  );
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename ?? `lagnaa-email-history-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}