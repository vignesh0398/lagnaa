import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { getLlmModel } from './agentSettings.js';
import { GROQ_MAX_TOKENS, GROQ_TEMPERATURE } from './voiceStack.js';

dotenv.config();

const GROQ_CONFIG_PATH = path.join(process.cwd(), 'server', 'data', 'groq.json');

let runtimeGroqKey: string | null = null;

export function loadGroqApiKey(): string | null {
  if (runtimeGroqKey) return runtimeGroqKey;
  if (process.env.GROQ_API_KEY) {
    runtimeGroqKey = process.env.GROQ_API_KEY;
    return runtimeGroqKey;
  }
  if (fs.existsSync(GROQ_CONFIG_PATH)) {
    const data = JSON.parse(fs.readFileSync(GROQ_CONFIG_PATH, 'utf-8')) as { apiKey: string };
    runtimeGroqKey = data.apiKey;
    return runtimeGroqKey;
  }
  return null;
}

export function saveGroqApiKey(apiKey: string): void {
  fs.mkdirSync(path.dirname(GROQ_CONFIG_PATH), { recursive: true });
  fs.writeFileSync(GROQ_CONFIG_PATH, JSON.stringify({ apiKey }, null, 2));
  runtimeGroqKey = apiKey;
}

export function getDefaultSystemPrompt(agentName: string): string {
  return `You are ${agentName}, a friendly and professional AI calling assistant for Lagnaa.

Rules:
- Keep every response under 2 short sentences (this is a phone call, not an essay).
- Be warm, clear, and professional.
- Ask one question at a time.
- Goal: understand if the customer is interested, answer basic questions, and offer a follow-up.
- If they want to end the call, say goodbye politely.
- Never mention you are an AI unless asked.`;
}

function fallbackResponse(userMessage: string, agentName: string): string {
  const lower = userMessage.toLowerCase();
  if (lower.includes('yes') || lower.includes('interested') || lower.includes('sure')) {
    return `That's great to hear! I'll make sure our team follows up with you soon. Is there a best time to reach you?`;
  }
  if (lower.includes('no') || lower.includes('not interested') || lower.includes('busy')) {
    return `I completely understand. Thank you for your time today, ${agentName} speaking. Have a wonderful day!`;
  }
  if (lower.includes('what') || lower.includes('who') || lower.includes('why')) {
    return `I'm ${agentName} calling from Lagnaa. We're reaching out about your recent inquiry. Would you like to hear more?`;
  }
  if (lower.includes('price') || lower.includes('cost') || lower.includes('how much')) {
    return `Great question! Our team can share all pricing details on a follow-up call. Would that work for you?`;
  }
  return `Thank you for sharing that. Could you tell me a little more about what you're looking for?`;
}

const INTERRUPTION_PROMPT = `You are Mia from Justizia Law on a live phone call.
Answer the customer's question in ONE short sentence only.
Do NOT restart the introduction. Do NOT repeat previous script sections.
Stay professional UK legal tone. Then stop — the call script will continue automatically.`;

export async function generateBriefAnswer(
  session: {
    agentName: string;
    clientName: string;
    step: string;
    promptId?: string;
    behaviorRules?: string;
    knowledgeContext?: string;
    messages: { role: string; content: string }[];
  },
  userQuestion: string
): Promise<string> {
  const apiKey = loadGroqApiKey();
  const model = getLlmModel(session.promptId);
  const systemPrompt = [
    INTERRUPTION_PROMPT,
    session.behaviorRules ?? '',
    session.knowledgeContext ?? '',
  ]
    .filter(Boolean)
    .join('\n\n');

  if (!apiKey || model === 'builtin-rules') {
    if (userQuestion.toLowerCase().includes('who')) {
      return "I'm Mia calling from Justizia Law regarding a previous Plevin claim.";
    }
    if (userQuestion.toLowerCase().includes('free')) {
      return 'Yes, the professional negligence review is completely free of charge.';
    }
    return 'Of course. Let me continue with the call.';
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Current step: ${session.step}. Client: ${session.clientName}. Question: ${userQuestion}` },
        ],
        max_tokens: GROQ_MAX_TOKENS,
        temperature: GROQ_TEMPERATURE,
      }),
    });
    if (!response.ok) return 'Of course. Let me continue.';
    const data = (await response.json()) as { choices: { message: { content: string } }[] };
    return data.choices[0]?.message?.content?.trim().slice(0, 200) || 'Of course. Let me continue.';
  } catch {
    return 'Of course. Let me continue.';
  }
}

export async function generateAiReply(
  agentName: string,
  history: { role: string; content: string }[],
  userMessage: string
): Promise<{ reply: string; usedGroq: boolean }> {
  const apiKey = loadGroqApiKey();
  const model = getLlmModel();

  if (!apiKey || model === 'builtin-rules') {
    return { reply: fallbackResponse(userMessage, agentName), usedGroq: false };
  }

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
          { role: 'system', content: getDefaultSystemPrompt(agentName) },
          ...history.filter((m) => m.role !== 'system'),
          { role: 'user', content: userMessage },
        ],
        max_tokens: GROQ_MAX_TOKENS,
        temperature: GROQ_TEMPERATURE,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[Groq error]', err);
      return { reply: fallbackResponse(userMessage, agentName), usedGroq: false };
    }

    const data = (await response.json()) as {
      choices: { message: { content: string } }[];
    };
    const reply = data.choices[0]?.message?.content?.trim();
    if (!reply) {
      return { reply: fallbackResponse(userMessage, agentName), usedGroq: false };
    }
    return { reply: reply.slice(0, 400), usedGroq: true };
  } catch (error) {
    console.error('[Groq fetch error]', error);
    return { reply: fallbackResponse(userMessage, agentName), usedGroq: false };
  }
}