import { fetchJson } from './fetchJson';

export interface WorkerBeeChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface WorkerBeeChatContext {
  pathname?: string;
  userName?: string;
  isAdmin?: boolean;
}

export interface WorkerBeeChatResult {
  reply: string;
  usedGroq: boolean;
}

export async function workerBeeChat(
  message: string,
  history: WorkerBeeChatMessage[],
  context?: WorkerBeeChatContext
): Promise<WorkerBeeChatResult> {
  return fetchJson<WorkerBeeChatResult>('/api/workerbee/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history, context }),
  });
}