import { Router } from 'express';
import multer from 'multer';
import {
  addDocumentItem,
  addTextItem,
  addUrlItem,
  createKnowledgeBase,
  deleteItem,
  deleteKnowledgeBase,
  getKnowledgeBase,
  listKnowledgeBases,
  recrawlUrlItem,
  setActiveKnowledgeBase,
  updateKnowledgeBase,
} from '../ai/knowledgeStore.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const TEXT_EXTENSIONS = ['.txt', '.md', '.csv', '.json', '.html', '.htm'];

router.get('/', (_req, res) => {
  const bases = listKnowledgeBases();
  const active = bases.find((b) => b.active);
  res.json({
    bases: bases.map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      active: b.active,
      itemCount: b.items.length,
      readyCount: b.items.filter((i) => i.status === 'ready').length,
      updatedAt: b.updatedAt,
    })),
    activeId: active?.id ?? null,
  });
});

router.get('/:id', (req, res) => {
  const kb = getKnowledgeBase(req.params.id);
  if (!kb) return res.status(404).json({ error: 'Knowledge base not found' });
  res.json(kb);
});

router.post('/', (req, res) => {
  try {
    const { name, description } = req.body as { name?: string; description?: string };
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
    const kb = createKnowledgeBase(name, description);
    res.json({ success: true, knowledgeBase: kb });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Create failed' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const kb = updateKnowledgeBase(req.params.id, req.body);
    res.json({ success: true, knowledgeBase: kb });
  } catch (err) {
    res.status(404).json({ error: err instanceof Error ? err.message : 'Update failed' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    deleteKnowledgeBase(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(404).json({ error: err instanceof Error ? err.message : 'Delete failed' });
  }
});

router.post('/:id/activate', (req, res) => {
  try {
    const kb = setActiveKnowledgeBase(req.params.id);
    res.json({ success: true, knowledgeBase: kb });
  } catch (err) {
    res.status(404).json({ error: err instanceof Error ? err.message : 'Activate failed' });
  }
});

router.post('/:id/items/url', async (req, res) => {
  try {
    const { url, title } = req.body as { url?: string; title?: string };
    if (!url?.trim()) return res.status(400).json({ error: 'URL is required' });
    const item = await addUrlItem(req.params.id, url.trim(), title);
    res.json({ success: true, item });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to add URL' });
  }
});

router.post('/:id/items/text', (req, res) => {
  try {
    const { title, content } = req.body as { title?: string; content?: string };
    if (!title?.trim() || !content?.trim()) {
      return res.status(400).json({ error: 'Title and content are required' });
    }
    const item = addTextItem(req.params.id, title, content);
    res.json({ success: true, item });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to add text' });
  }
});

router.post('/:id/items/document', upload.single('file'), (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'File is required' });

    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    if (!TEXT_EXTENSIONS.includes(ext)) {
      return res.status(400).json({
        error: `Supported files: ${TEXT_EXTENSIONS.join(', ')}. PDF coming soon.`,
      });
    }

    const title = (req.body.title as string)?.trim() || file.originalname;
    const content = file.buffer.toString('utf-8');
    if (!content.trim()) return res.status(400).json({ error: 'File is empty' });

    const item = addDocumentItem(req.params.id, title, file.originalname, content);
    res.json({ success: true, item });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Upload failed' });
  }
});

router.post('/:id/items/:itemId/recrawl', async (req, res) => {
  try {
    const item = await recrawlUrlItem(req.params.id, req.params.itemId);
    res.json({ success: true, item });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Recrawl failed' });
  }
});

router.delete('/:id/items/:itemId', (req, res) => {
  try {
    deleteItem(req.params.id, req.params.itemId);
    res.json({ success: true });
  } catch (err) {
    res.status(404).json({ error: err instanceof Error ? err.message : 'Delete failed' });
  }
});

export default router;