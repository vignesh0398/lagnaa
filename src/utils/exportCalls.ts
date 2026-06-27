import { CALL_HISTORY_COLUMNS, type CallHistoryRecord } from '../types/calls';

function escapeCsv(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function rowValue(call: CallHistoryRecord, key: keyof CallHistoryRecord): string {
  const val = call[key];
  if (key === 'time') return new Date(call.time).toLocaleString();
  if (key === 'endToEndLatencyMs') return val != null ? `${val} ms` : '';
  return String(val ?? '');
}

export function exportCallsToExcel(calls: CallHistoryRecord[], filename?: string): void {
  const headers = CALL_HISTORY_COLUMNS.map((c) => c.label);
  const rows = calls.map((call) =>
    CALL_HISTORY_COLUMNS.map((col) => escapeCsv(rowValue(call, col.key))).join(',')
  );

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename ?? `lagnaa-call-history-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}