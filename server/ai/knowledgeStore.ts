import fs from 'fs';
import path from 'path';
import { crawlWebsite } from './webCrawler.js';

export type KnowledgeItemType = 'url' | 'text' | 'document';

export interface KnowledgeItem {
  id: string;
  type: KnowledgeItemType;
  title: string;
  content: string;
  sourceUrl?: string;
  fileName?: string;
  pagesCrawled?: number;
  charCount: number;
  status: 'ready' | 'processing' | 'error';
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  active: boolean;
  items: KnowledgeItem[];
  createdAt: string;
  updatedAt: string;
}

const STORE_PATH = path.join(process.cwd(), 'server', 'data', 'knowledge-bases.json');
const DOCS_DIR = path.join(process.cwd(), 'server', 'data', 'knowledge-docs');

function loadAll(): KnowledgeBase[] {
  if (!fs.existsSync(STORE_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8')) as KnowledgeBase[];
  } catch {
    return [];
  }
}

function saveAll(bases: KnowledgeBase[]): void {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(bases, null, 2));
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'kb';
}

export function listKnowledgeBases(): KnowledgeBase[] {
  return loadAll();
}

export function getKnowledgeBase(id: string): KnowledgeBase | undefined {
  return loadAll().find((k) => k.id === id);
}

export function getActiveKnowledgeBase(): KnowledgeBase | undefined {
  return loadAll().find((k) => k.active);
}

export function createKnowledgeBase(name: string, description?: string): KnowledgeBase {
  const bases = loadAll();
  let id = slugify(name);
  let n = 1;
  while (bases.some((b) => b.id === id)) id = `${slugify(name)}-${n++}`;

  const kb: KnowledgeBase = {
    id,
    name: name.trim(),
    description: description?.trim() ?? '',
    active: bases.length === 0,
    items: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (kb.active) bases.forEach((b) => { b.active = false; });
  bases.push(kb);
  saveAll(bases);
  return kb;
}

export function updateKnowledgeBase(id: string, updates: Partial<Pick<KnowledgeBase, 'name' | 'description'>>): KnowledgeBase {
  const bases = loadAll();
  const idx = bases.findIndex((b) => b.id === id);
  if (idx === -1) throw new Error('Knowledge base not found');

  if (updates.name) bases[idx].name = updates.name.trim();
  if (updates.description !== undefined) bases[idx].description = updates.description.trim();
  bases[idx].updatedAt = new Date().toISOString();
  saveAll(bases);
  return bases[idx];
}

export function deleteKnowledgeBase(id: string): void {
  const bases = loadAll();
  if (!bases.find((b) => b.id === id)) throw new Error('Knowledge base not found');
  saveAll(bases.filter((b) => b.id !== id));
}

export function setActiveKnowledgeBase(id: string): KnowledgeBase {
  const bases = loadAll().map((b) => ({ ...b, active: b.id === id }));
  const kb = bases.find((b) => b.id === id);
  if (!kb) throw new Error('Knowledge base not found');
  saveAll(bases);
  return kb;
}

function makeItem(partial: Omit<KnowledgeItem, 'id' | 'createdAt' | 'updatedAt' | 'charCount'>): KnowledgeItem {
  const now = new Date().toISOString();
  return {
    ...partial,
    id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    charCount: partial.content.length,
    createdAt: now,
    updatedAt: now,
  };
}

export async function addUrlItem(kbId: string, url: string, title?: string): Promise<KnowledgeItem> {
  const bases = loadAll();
  const kb = bases.find((b) => b.id === kbId);
  if (!kb) throw new Error('Knowledge base not found');

  const placeholder = makeItem({
    type: 'url',
    title: title?.trim() || url,
    content: '',
    sourceUrl: url,
    status: 'processing',
  });
  kb.items.push(placeholder);
  kb.updatedAt = new Date().toISOString();
  saveAll(bases);

  try {
    const { content, pagesCrawled } = await crawlWebsite(url);
    placeholder.content = content;
    placeholder.charCount = content.length;
    placeholder.pagesCrawled = pagesCrawled;
    placeholder.status = 'ready';
    placeholder.title = title?.trim() || new URL(url).hostname;
    placeholder.updatedAt = new Date().toISOString();
  } catch (err) {
    placeholder.status = 'error';
    placeholder.errorMessage = err instanceof Error ? err.message : 'Crawl failed';
    placeholder.updatedAt = new Date().toISOString();
  }

  kb.updatedAt = new Date().toISOString();
  saveAll(bases);
  return placeholder;
}

export async function recrawlUrlItem(kbId: string, itemId: string): Promise<KnowledgeItem> {
  const bases = loadAll();
  const kb = bases.find((b) => b.id === kbId);
  if (!kb) throw new Error('Knowledge base not found');
  const item = kb.items.find((i) => i.id === itemId);
  if (!item || item.type !== 'url' || !item.sourceUrl) throw new Error('URL item not found');

  item.status = 'processing';
  item.errorMessage = undefined;
  saveAll(bases);

  try {
    const { content, pagesCrawled } = await crawlWebsite(item.sourceUrl);
    item.content = content;
    item.charCount = content.length;
    item.pagesCrawled = pagesCrawled;
    item.status = 'ready';
  } catch (err) {
    item.status = 'error';
    item.errorMessage = err instanceof Error ? err.message : 'Crawl failed';
  }
  item.updatedAt = new Date().toISOString();
  kb.updatedAt = new Date().toISOString();
  saveAll(bases);
  return item;
}

export function addTextItem(kbId: string, title: string, content: string): KnowledgeItem {
  const bases = loadAll();
  const kb = bases.find((b) => b.id === kbId);
  if (!kb) throw new Error('Knowledge base not found');

  const item = makeItem({
    type: 'text',
    title: title.trim(),
    content: content.trim(),
    status: 'ready',
  });
  kb.items.push(item);
  kb.updatedAt = new Date().toISOString();
  saveAll(bases);
  return item;
}

export function addDocumentItem(kbId: string, title: string, fileName: string, content: string): KnowledgeItem {
  const bases = loadAll();
  const kb = bases.find((b) => b.id === kbId);
  if (!kb) throw new Error('Knowledge base not found');

  fs.mkdirSync(DOCS_DIR, { recursive: true });
  const safeName = `${kbId}-${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  fs.writeFileSync(path.join(DOCS_DIR, safeName), content, 'utf-8');

  const item = makeItem({
    type: 'document',
    title: title.trim() || fileName,
    content: content.trim().slice(0, 45000),
    fileName,
    status: 'ready',
  });
  kb.items.push(item);
  kb.updatedAt = new Date().toISOString();
  saveAll(bases);
  return item;
}

export function deleteItem(kbId: string, itemId: string): void {
  const bases = loadAll();
  const kb = bases.find((b) => b.id === kbId);
  if (!kb) throw new Error('Knowledge base not found');
  kb.items = kb.items.filter((i) => i.id !== itemId);
  kb.updatedAt = new Date().toISOString();
  saveAll(bases);
}

export function buildKnowledgeContext(kb?: KnowledgeBase): string {
  if (!kb || kb.items.length === 0) return '';

  const ready = kb.items.filter((i) => i.status === 'ready' && i.content.length > 0);
  if (ready.length === 0) return '';

  const parts = ready.map((i) => `[${i.title}]\n${i.content}`);
  let combined = parts.join('\n\n---\n\n');
  const MAX = 12000;
  if (combined.length > MAX) {
    combined = combined.slice(0, MAX) + '\n[Knowledge truncated]';
  }

  return `Company / knowledge base reference (${kb.name}):\n${combined}`;
}