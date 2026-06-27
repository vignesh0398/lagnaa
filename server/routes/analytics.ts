import { Router } from 'express';
import { getAnalyticsHub } from '../ai/analyticsHub.js';

const router = Router();

router.get('/hub', (_req, res) => {
  res.json(getAnalyticsHub());
});

export default router;