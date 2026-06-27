import type { CallFlowPrompt, CallFlowScripts } from './promptStore.js';
import { loadGroqApiKey } from './groq.js';
import { getLlmModel } from './agentSettings.js';

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

const SCRIPT_KEYS: (keyof CallFlowScripts)[] = [
  'hello',
  'intro',
  'confirmIdentityRetry',
  'noTimeDuringIntro',
  'explainReason',
  'askProceed',
  'recordingNotice',
  'dobRetry',
  'askPostcode',
  'postcodeRetry',
  'consent',
  'consentRetry',
  'finalClose',
  'wrongPersonEnd',
  'notInterestedEnd',
  'verificationFailedEnd',
  'verificationRefusedEnd',
  'dndEnd',
  'callbackEnd',
  'noSpeechRetry',
];

function buildSystemPrompt(prompt: CallFlowPrompt): string {
  const scriptSummary = SCRIPT_KEYS.map((key) => `- ${key}: ${prompt.scripts[key]}`).join('\n');

  return `You are Lagnaa's Prompt Editor AI. You help users rewrite outbound voice call scripts for agent "${prompt.agentName}".

Call flow order:
1. hello + intro → confirm identity
2. explainReason + askProceed
3. recordingNotice → dobRetry → askPostcode → postcodeRetry (verification)
4. consent + consentRetry (legal disclaimer before consent)
5. finalClose OR an end script (wrongPersonEnd, notInterestedEnd, verificationFailedEnd, etc.)

Rules:
- UK professional legal tone unless the user asks otherwise.
- Keep each script line short (1-3 sentences) for phone TTS.
- Use {{clientName}} placeholder where the client's name is needed.
- Only change fields the user workflow requires; leave unrelated lines unchanged.
- Never skip verification or consent steps unless user explicitly removes them.

Current prompt name: ${prompt.name}
Current behavior rules:
${prompt.behaviorRules}

Current script lines:
${scriptSummary}

Respond with JSON only (no markdown):
{
  "reply": "Brief explanation of what you changed and why",
  "updates": {
    "agentName": "optional",
    "description": "optional",
    "behaviorRules": "optional full replacement text",
    "scripts": { "onlyIncludeKeysYouChanged": "new text" }
  }
}

If the user is only asking a question with no edits needed, return "updates": {} or omit updates.`;
}

function extractJson(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

function sanitizeUpdates(raw: unknown): PromptAiUpdates | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  const updates: PromptAiUpdates = {};

  if (typeof obj.name === 'string' && obj.name.trim()) updates.name = obj.name.trim();
  if (typeof obj.description === 'string' && obj.description.trim()) {
    updates.description = obj.description.trim();
  }
  if (typeof obj.agentName === 'string' && obj.agentName.trim()) {
    updates.agentName = obj.agentName.trim();
  }
  if (typeof obj.behaviorRules === 'string' && obj.behaviorRules.trim()) {
    updates.behaviorRules = obj.behaviorRules.trim();
  }

  if (obj.scripts && typeof obj.scripts === 'object') {
    const scripts: Partial<CallFlowScripts> = {};
    for (const key of SCRIPT_KEYS) {
      const value = (obj.scripts as Record<string, unknown>)[key];
      if (typeof value === 'string' && value.trim()) {
        scripts[key] = value.trim();
      }
    }
    if (Object.keys(scripts).length > 0) updates.scripts = scripts;
  }

  if (Object.keys(updates).length === 0) return undefined;
  return updates;
}

function fallbackReply(message: string, prompt: CallFlowPrompt): PromptAiChatResult {
  const lower = message.toLowerCase();
  if (lower.includes('verify') || lower.includes('dob') || lower.includes('postcode')) {
    return {
      reply:
        'Connect Groq in Connections to use AI prompt editing. For verification, edit recordingNotice, dobRetry, askPostcode, and postcodeRetry in the script list on the left.',
      usedGroq: false,
    };
  }
  return {
    reply: `Connect your Groq API key in Connections to enable AI prompt editing. Meanwhile you can edit "${prompt.name}" manually using the script fields.`,
    usedGroq: false,
  };
}

export async function chatEditPrompt(
  prompt: CallFlowPrompt,
  message: string,
  history: PromptAiChatMessage[] = []
): Promise<PromptAiChatResult> {
  const apiKey = loadGroqApiKey();
  const model = getLlmModel();

  if (!apiKey || model === 'builtin-rules') {
    return fallbackReply(message, prompt);
  }

  const messages = [
    { role: 'system', content: buildSystemPrompt(prompt) },
    ...history.slice(-8).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ];

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 2500,
        temperature: 0.4,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      console.error('[Prompt AI]', await response.text());
      return {
        reply: 'AI request failed. Check your Groq API key in Connections and try again.',
        usedGroq: false,
      };
    }

    const data = (await response.json()) as { choices: { message: { content: string } }[] };
    const content = data.choices[0]?.message?.content?.trim() ?? '';
    const parsed = extractJson(content);

    if (!parsed || typeof parsed.reply !== 'string') {
      return {
        reply: content || 'I could not parse the AI response. Please try rephrasing your workflow.',
        usedGroq: true,
      };
    }

    return {
      reply: parsed.reply,
      updates: sanitizeUpdates(parsed.updates),
      usedGroq: true,
    };
  } catch (error) {
    console.error('[Prompt AI]', error);
    return {
      reply: 'AI prompt editor is temporarily unavailable. Edit the scripts manually on the left.',
      usedGroq: false,
    };
  }
}