export interface CallFlowScripts {
  hello: string;
  intro: string;
  explainReason: string;
  askProceed: string;
  recordingNotice: string;
  askPostcode: string;
  consent: string;
  consentRetry: string;
  finalClose: string;
  wrongPersonEnd: string;
  notInterestedEnd: string;
  verificationFailedEnd: string;
  verificationRefusedEnd: string;
  dndEnd: string;
  callbackEnd: string;
  noTimeDuringIntro: string;
  confirmIdentityRetry: string;
  noSpeechRetry: string;
  dobRetry: string;
  postcodeRetry: string;
}

export type PromptStatus = 'draft' | 'published';

export interface CallFlowPrompt {
  id: string;
  name: string;
  description: string;
  type: string;
  active: boolean;
  status: PromptStatus;
  agentName: string;
  scripts: CallFlowScripts;
  behaviorRules: string;
  updatedAt: string;
}

export interface PromptListItem {
  id: string;
  name: string;
  description: string;
  type: string;
  version: string;
  versions: number;
  updated: string;
  active: boolean;
  status: PromptStatus;
  agentName: string;
}

export async function getPrompts(): Promise<{
  prompts: PromptListItem[];
  activeId: string | null;
  stats: {
    total: number;
    addedThisWeek: number;
    activeVersions: number;
    invocations24h: number | null;
    avgTokens: number | null;
  };
}> {
  const res = await fetch('/api/prompts');
  if (!res.ok) throw new Error('Failed to load prompts');
  return res.json();
}

export async function getPrompt(id: string): Promise<CallFlowPrompt> {
  const res = await fetch(`/api/prompts/${id}`);
  if (!res.ok) throw new Error('Failed to load prompt');
  return res.json();
}

export async function savePrompt(
  id: string,
  data: Partial<Pick<CallFlowPrompt, 'name' | 'description' | 'agentName' | 'scripts' | 'behaviorRules'>>
): Promise<CallFlowPrompt> {
  const res = await fetch(`/api/prompts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to save prompt');
  const result = await res.json();
  return result.prompt;
}

export async function activatePrompt(id: string): Promise<void> {
  return publishPrompt(id);
}

export async function publishPrompt(id: string): Promise<void> {
  const res = await fetch(`/api/prompts/${id}/publish`, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || 'Failed to publish agent');
  }
}

export async function draftPrompt(id: string): Promise<void> {
  const res = await fetch(`/api/prompts/${id}/draft`, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || 'Failed to move agent to draft');
  }
}

export async function createPrompt(data: {
  name: string;
  description?: string;
  agentName?: string;
}): Promise<CallFlowPrompt> {
  const res = await fetch('/api/prompts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || 'Failed to create prompt');
  }
  const result = await res.json();
  return result.prompt;
}

export async function duplicatePrompt(id: string, name?: string): Promise<CallFlowPrompt> {
  const res = await fetch(`/api/prompts/${id}/duplicate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('Failed to duplicate prompt');
  const result = await res.json();
  return result.prompt;
}

export interface PromptAiChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface PromptAiUpdates {
  name?: string;
  description?: string;
  agentName?: string;
  behaviorRules?: string;
  scripts?: Partial<CallFlowScripts>;
}

export interface PromptAiChatResult {
  reply: string;
  updates?: PromptAiUpdates;
  usedGroq: boolean;
}

export async function promptAiChat(
  id: string,
  message: string,
  history: PromptAiChatMessage[] = []
): Promise<PromptAiChatResult> {
  const res = await fetch(`/api/prompts/${id}/ai-chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || 'AI chat failed');
  }
  return res.json();
}