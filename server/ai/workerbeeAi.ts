import { loadGroqApiKey } from './groq.js';
import { getLlmModel } from './agentSettings.js';
import {
  buildWorkerBeeSystemPrompt,
  fallbackWorkerBeeReply,
  type WorkerBeeChatMessage,
} from './workerbeeKnowledge.js';

export type { WorkerBeeChatMessage };

export interface WorkerBeeChatContext {
  pathname?: string;
  userName?: string;
  isAdmin?: boolean;
}

export interface WorkerBeeChatResult {
  reply: string;
  usedGroq: boolean;
}

const MAX_HISTORY = 12;
const MAX_TOKENS = 1024;
const TEMPERATURE = 0.4;

export async function chatWithWorkerBee(
  message: string,
  history: WorkerBeeChatMessage[] = [],
  context?: WorkerBeeChatContext
): Promise<WorkerBeeChatResult> {
  const apiKey = loadGroqApiKey();
  const model = getLlmModel();

  if (!apiKey || model === 'builtin-rules') {
    return {
      reply: fallbackWorkerBeeReply(message, context),
      usedGroq: false,
    };
  }

  const trimmedHistory = history
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .slice(-MAX_HISTORY);

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: buildWorkerBeeSystemPrompt(context) },
          ...trimmedHistory,
          { role: 'user', content: message },
        ],
        max_tokens: MAX_TOKENS,
        temperature: TEMPERATURE,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[WorkerBee Groq error]', err);
      return {
        reply: fallbackWorkerBeeReply(message, context),
        usedGroq: false,
      };
    }

    const data = (await response.json()) as {
      choices: { message: { content: string } }[];
    };
    const reply = data.choices[0]?.message?.content?.trim();

    if (!reply) {
      return {
        reply: fallbackWorkerBeeReply(message, context),
        usedGroq: false,
      };
    }

    return { reply, usedGroq: true };
  } catch (error) {
    console.error('[WorkerBee fetch error]', error);
    return {
      reply: fallbackWorkerBeeReply(message, context),
      usedGroq: false,
    };
  }
}