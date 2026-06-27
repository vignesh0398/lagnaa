import { Router } from 'express';
import { chatEditPrompt } from '../ai/promptEditorAi.js';
import {
  createPrompt,
  draftPrompt,
  duplicatePrompt,
  getActivePrompt,
  getPromptById,
  getPublishedPrompt,
  listPrompts,
  publishPrompt,
  setActivePrompt,
  updatePrompt,
  type CallFlowPrompt,
} from '../ai/promptStore.js';

const router = Router();

router.get('/', (_req, res) => {
  const prompts = listPrompts();
  const published = getPublishedPrompt();
  res.json({
    prompts: prompts.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      type: p.type,
      version: 'v1.0',
      versions: 1,
      updated: new Date(p.updatedAt).toLocaleDateString(),
      active: p.status === 'published',
      status: p.status,
      agentName: p.agentName,
    })),
    activeId: published?.id ?? null,
    publishedId: published?.id ?? null,
    stats: {
      total: prompts.length,
      addedThisWeek: 0,
      activeVersions: prompts.filter((p) => p.status === 'published').length,
      invocations24h: null,
      avgTokens: null,
    },
  });
});

router.get('/active', (_req, res) => {
  res.json(getActivePrompt());
});

router.post('/', (req, res) => {
  try {
    const { name, description, agentName, scripts, behaviorRules, activate } = req.body as {
      name?: string;
      description?: string;
      agentName?: string;
      scripts?: CallFlowPrompt['scripts'];
      behaviorRules?: string;
      activate?: boolean;
    };
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Prompt name is required.' });
    }
    const prompt = createPrompt({ name, description, agentName, scripts, behaviorRules, activate });
    res.json({ success: true, prompt });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Create failed' });
  }
});

router.post('/:id/duplicate', (req, res) => {
  try {
    const { name } = req.body as { name?: string };
    const prompt = duplicatePrompt(req.params.id, name);
    res.json({ success: true, prompt });
  } catch (error) {
    res.status(404).json({ error: error instanceof Error ? error.message : 'Duplicate failed' });
  }
});

router.get('/:id', (req, res) => {
  const prompt = getPromptById(req.params.id);
  if (!prompt) return res.status(404).json({ error: 'Prompt not found' });
  res.json(prompt);
});

router.put('/:id', (req, res) => {
  try {
    const { name, description, agentName, scripts, behaviorRules } = req.body as Partial<CallFlowPrompt>;
    const updated = updatePrompt(req.params.id, {
      ...(name && { name }),
      ...(description && { description }),
      ...(agentName && { agentName }),
      ...(scripts && { scripts }),
      ...(behaviorRules && { behaviorRules }),
    });
    res.json({ success: true, prompt: updated });
  } catch (error) {
    res.status(404).json({ error: error instanceof Error ? error.message : 'Update failed' });
  }
});

router.post('/:id/activate', (req, res) => {
  try {
    const prompt = setActivePrompt(req.params.id);
    res.json({ success: true, prompt });
  } catch {
    res.status(404).json({ error: 'Prompt not found' });
  }
});

router.post('/:id/publish', (req, res) => {
  try {
    const prompt = publishPrompt(req.params.id);
    res.json({ success: true, prompt });
  } catch (error) {
    res.status(404).json({ error: error instanceof Error ? error.message : 'Publish failed' });
  }
});

router.post('/:id/draft', (req, res) => {
  try {
    const prompt = draftPrompt(req.params.id);
    res.json({ success: true, prompt });
  } catch (error) {
    res.status(404).json({ error: error instanceof Error ? error.message : 'Draft failed' });
  }
});

router.post('/:id/ai-chat', async (req, res) => {
  const prompt = getPromptById(req.params.id);
  if (!prompt) return res.status(404).json({ error: 'Prompt not found' });

  const { message, history } = req.body as {
    message?: string;
    history?: { role: 'user' | 'assistant'; content: string }[];
  };

  if (!message?.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const result = await chatEditPrompt(prompt, message.trim(), history ?? []);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'AI chat failed',
    });
  }
});

export default router;