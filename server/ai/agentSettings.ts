import fs from 'fs';
import path from 'path';

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

export interface AgentSettings {
  agentId: string;
  voiceId: string;
  llmModel: string;
  updatedAt: string;
}

export const VOICE_OPTIONS: VoiceOption[] = [
  { id: 'elevenlabs:emilia', label: 'Emilia — Young British, warm & natural (recommended)', locale: 'en-GB' },
  { id: 'elevenlabs:amelia', label: 'Amelia — Young British, upbeat & expressive', locale: 'en-GB' },
  { id: 'elevenlabs:grace', label: 'Grace — British female (calmer tone)', locale: 'en-GB' },
];

export const LLM_OPTIONS: LlmOption[] = [
  { id: 'llama-3.3-70b-versatile', label: 'Groq Llama 3.3 70B (best quality)', provider: 'groq' },
  { id: 'llama-3.1-8b-instant', label: 'Groq Llama 3.1 8B (faster)', provider: 'groq' },
  { id: 'gemma2-9b-it', label: 'Groq Gemma 2 9B', provider: 'groq' },
  { id: 'builtin-rules', label: 'Built-in rules only (no Groq)', provider: 'builtin' },
];

const SETTINGS_PATH = path.join(process.cwd(), 'server', 'data', 'agent-settings.json');

const DEFAULTS: AgentSettings = {
  agentId: 'mia-justizia',
  voiceId: 'elevenlabs:emilia',
  llmModel: 'llama-3.3-70b-versatile',
  updatedAt: new Date().toISOString(),
};

function loadAll(): Record<string, AgentSettings> {
  if (!fs.existsSync(SETTINGS_PATH)) {
    const initial = { [DEFAULTS.agentId]: DEFAULTS };
    saveAll(initial);
    return initial;
  }
  return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8')) as Record<string, AgentSettings>;
}

function saveAll(data: Record<string, AgentSettings>): void {
  fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(data, null, 2));
}

export function getAgentSettings(agentId = 'mia-justizia'): AgentSettings {
  const all = loadAll();
  const settings = all[agentId] ?? { ...DEFAULTS, agentId };
  if (settings.voiceId.startsWith('Polly.')) {
    settings.voiceId = DEFAULTS.voiceId;
  }
  return settings;
}

export function updateAgentSettings(
  agentId: string,
  updates: Partial<Pick<AgentSettings, 'voiceId' | 'llmModel'>>
): AgentSettings {
  const all = loadAll();
  const current = all[agentId] ?? { ...DEFAULTS, agentId };

  if (updates.voiceId && VOICE_OPTIONS.some((v) => v.id === updates.voiceId)) {
    current.voiceId = updates.voiceId;
  }
  if (updates.llmModel && LLM_OPTIONS.some((l) => l.id === updates.llmModel)) {
    current.llmModel = updates.llmModel;
  }
  current.updatedAt = new Date().toISOString();

  all[agentId] = current;
  saveAll(all);
  return current;
}

export function getVoiceId(agentId = 'mia-justizia'): string {
  return getAgentSettings(agentId).voiceId;
}

export function getLlmModel(agentId = 'mia-justizia'): string {
  return getAgentSettings(agentId).llmModel;
}

export function formatLlmLabel(modelId: string): string {
  return LLM_OPTIONS.find((l) => l.id === modelId)?.label ?? modelId;
}

export function formatVoiceLabel(voiceId: string): string {
  const v = VOICE_OPTIONS.find((o) => o.id === voiceId);
  return v ? v.label : voiceId;
}