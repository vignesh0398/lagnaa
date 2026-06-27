export interface Agent {
  id: string;
  name: string;
  workflow: string;
  llm: string;
  llmModel: string;
  fallback: string;
  tts: string;
  voiceId: string;
  phone: string;
  status: 'draft' | 'published';
  callsToday: number;
}

export interface VoiceOption {
  id: string;
  label: string;
  locale: string;
}

export interface LlmOption {
  id: string;
  label: string;
  provider: 'groq' | 'builtin';
}

export interface AgentsResponse {
  agents: Agent[];
  stats: {
    total: number;
    conversation: number;
    inference: number;
    chat: number;
    embedding: number;
  };
  connected: boolean;
  publishedId?: string | null;
  publishedAgentName?: string | null;
  voices?: VoiceOption[];
  llms?: LlmOption[];
}

export async function getAgents(): Promise<AgentsResponse> {
  const res = await fetch('/api/agents');
  if (!res.ok) throw new Error('Failed to load agents');
  return res.json();
}

export async function getAgentSettings(agentId: string): Promise<{
  agentId: string;
  voiceId: string;
  llmModel: string;
  groqConnected: boolean;
}> {
  const res = await fetch(`/api/agents/${agentId}/settings`);
  if (!res.ok) throw new Error('Failed to load agent settings');
  return res.json();
}

export async function saveAgentSettings(
  agentId: string,
  data: { voiceId?: string; llmModel?: string }
): Promise<void> {
  const res = await fetch(`/api/agents/${agentId}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || 'Failed to save settings');
  }
}