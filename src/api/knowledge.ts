export interface KnowledgeItem {
  id: string;
  type: 'url' | 'text' | 'document';
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

export interface KnowledgeListItem {
  id: string;
  name: string;
  description: string;
  active: boolean;
  itemCount: number;
  readyCount: number;
  updatedAt: string;
}

export async function getKnowledgeBases(): Promise<{ bases: KnowledgeListItem[]; activeId: string | null }> {
  const res = await fetch('/api/knowledge');
  if (!res.ok) throw new Error('Failed to load knowledge bases');
  return res.json();
}

export async function getKnowledgeBase(id: string): Promise<KnowledgeBase> {
  const res = await fetch(`/api/knowledge/${id}`);
  if (!res.ok) throw new Error('Failed to load knowledge base');
  return res.json();
}

export async function createKnowledgeBase(name: string, description?: string): Promise<KnowledgeBase> {
  const res = await fetch('/api/knowledge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Create failed');
  return data.knowledgeBase;
}

export async function activateKnowledgeBase(id: string): Promise<void> {
  const res = await fetch(`/api/knowledge/${id}/activate`, { method: 'POST' });
  if (!res.ok) throw new Error('Activate failed');
}

export async function deleteKnowledgeBase(id: string): Promise<void> {
  const res = await fetch(`/api/knowledge/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Delete failed');
}

export async function addUrlItem(kbId: string, url: string, title?: string): Promise<KnowledgeItem> {
  const res = await fetch(`/api/knowledge/${kbId}/items/url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, title }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to crawl URL');
  return data.item;
}

export async function addTextItem(kbId: string, title: string, content: string): Promise<KnowledgeItem> {
  const res = await fetch(`/api/knowledge/${kbId}/items/text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to add text');
  return data.item;
}

export async function uploadDocument(kbId: string, file: File, title?: string): Promise<KnowledgeItem> {
  const form = new FormData();
  form.append('file', file);
  if (title) form.append('title', title);
  const res = await fetch(`/api/knowledge/${kbId}/items/document`, { method: 'POST', body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data.item;
}

export async function recrawlItem(kbId: string, itemId: string): Promise<KnowledgeItem> {
  const res = await fetch(`/api/knowledge/${kbId}/items/${itemId}/recrawl`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Recrawl failed');
  return data.item;
}

export async function deleteItem(kbId: string, itemId: string): Promise<void> {
  const res = await fetch(`/api/knowledge/${kbId}/items/${itemId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Delete failed');
}