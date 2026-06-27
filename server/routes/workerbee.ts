import { Router } from 'express';
import { chatWithWorkerBee, type WorkerBeeChatMessage } from '../ai/workerbeeAi.js';

const router = Router();

router.post('/chat', async (req, res) => {
  const { message, history, context } = req.body as {
    message?: string;
    history?: WorkerBeeChatMessage[];
    context?: { pathname?: string; userName?: string; isAdmin?: boolean };
  };

  if (!message?.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const result = await chatWithWorkerBee(message.trim(), history ?? [], context);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'WorkerBee chat failed',
    });
  }
});

export default router;