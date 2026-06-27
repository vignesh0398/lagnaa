import { Router } from 'express';
import {
  formatLlmLabel,
  formatVoiceLabel,
  getAgentSettings,
  LLM_OPTIONS,
  updateAgentSettings,
  VOICE_OPTIONS,
} from '../ai/agentSettings.js';
import { loadGroqApiKey } from '../ai/groq.js';
import { getPublishedPrompt, listPrompts } from '../ai/promptStore.js';
import { loadTwilioConfig } from '../config.js';
import { getTwilioClient } from '../twilioClient.js';

const router = Router();

function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

router.get('/options', (_req, res) => {
  res.json({ voices: VOICE_OPTIONS, llms: LLM_OPTIONS });
});

router.get('/:id/settings', (req, res) => {
  const settings = getAgentSettings(req.params.id);
  res.json({
    ...settings,
    groqConnected: !!loadGroqApiKey(),
  });
});

router.put('/:id/settings', (req, res) => {
  const { voiceId, llmModel } = req.body as { voiceId?: string; llmModel?: string };
  try {
    const updated = updateAgentSettings(req.params.id, { voiceId, llmModel });
    res.json({ success: true, settings: updated });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Update failed' });
  }
});

router.get('/', async (_req, res) => {
  const config = loadTwilioConfig();
  const client = getTwilioClient();

  if (!config || !client) {
    return res.json({
      agents: [],
      stats: { total: 0, conversation: 0, inference: 0, chat: 0, embedding: 0 },
      connected: false,
      publishedId: null,
      publishedAgentName: null,
    });
  }

  let callsToday = 0;
  try {
    const calls = await client.calls.list({ limit: 100 });
    callsToday = calls.filter((c) => c.dateCreated && isToday(c.dateCreated)).length;
  } catch {
    callsToday = 0;
  }

  const groqConnected = !!loadGroqApiKey();
  const prompts = listPrompts();
  const published = getPublishedPrompt();

  const agents = prompts.map((prompt) => {
    const settings = getAgentSettings(prompt.id);
    const llmDisplay =
      settings.llmModel === 'builtin-rules'
        ? 'Built-in rules'
        : groqConnected
          ? formatLlmLabel(settings.llmModel)
          : `${formatLlmLabel(settings.llmModel)} (add Groq key in Gateway)`;

    return {
      id: prompt.id,
      name: prompt.agentName,
      workflow: prompt.name,
      llm: llmDisplay,
      llmModel: settings.llmModel,
      fallback: 'Built-in call flow rules',
      tts: formatVoiceLabel(settings.voiceId),
      voiceId: settings.voiceId,
      phone: config.phoneNumber,
      status: prompt.status,
      callsToday: prompt.status === 'published' ? callsToday : 0,
    };
  });

  res.json({
    agents,
    stats: {
      total: agents.length,
      conversation: agents.length,
      inference: 0,
      chat: 0,
      embedding: 0,
    },
    connected: true,
    voices: VOICE_OPTIONS,
    llms: LLM_OPTIONS,
    publishedId: published?.id ?? null,
    publishedAgentName: published?.agentName ?? null,
  });
});

export default router;