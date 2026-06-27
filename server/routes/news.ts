import { Router } from 'express';
import { buildPlaceholderSvg, getTechNews } from '../techNews.js';

const router = Router();

router.get('/placeholder', (req, res) => {
  const title = String(req.query.title ?? 'AI Tech');
  const source = String(req.query.source ?? 'Lagnaa');
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(buildPlaceholderSvg(title, source));
});

router.get('/tech', async (req, res) => {
  try {
    const limit = Math.min(24, Math.max(4, Number(req.query.limit) || 12));
    const data = await getTechNews(limit);
    res.json({ success: true, ...data });
  } catch (error) {
    console.error('[News] tech feed error:', error);
    res.status(502).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load tech news',
      articles: [],
    });
  }
});

export default router;