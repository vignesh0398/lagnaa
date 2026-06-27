import { CHAT_HISTORY_COLUMNS, type ChatHistoryRecord } from '../types/chats';

function escapeCsv(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function rowValue(chat: ChatHistoryRecord, key: keyof ChatHistoryRecord): string {
  const val = chat[key];
  if (key === 'time') return new Date(chat.time).toLocaleString();
  if (key === 'endToEndLatencyMs') return val != null ? `${val} ms` : '';
  return String(val ?? '');
}

export function exportChatsToExcel(chats: ChatHistoryRecord[], filename?: string): void {
  const headers = CHAT_HISTORY_COLUMNS.map((c) => c.label);
  const rows = chats.map((chat) =>
    CHAT_HISTORY_COLUMNS.map((col) => escapeCsv(rowValue(chat, col.key))).join(',')
  );

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename ?? `lagnaa-whatsapp-chats-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}