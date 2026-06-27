import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  FileText,
  Globe,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Type,
  Upload,
  X,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { StatCard } from '../components/ui/StatCard';
import {
  activateKnowledgeBase,
  addTextItem,
  addUrlItem,
  createKnowledgeBase,
  deleteItem,
  deleteKnowledgeBase,
  getKnowledgeBase,
  getKnowledgeBases,
  recrawlItem,
  uploadDocument,
  type KnowledgeBase,
  type KnowledgeItem,
  type KnowledgeListItem,
} from '../api/knowledge';

type AddMode = 'url' | 'text' | 'document' | null;

export function KnowledgeBasePage() {
  const [list, setList] = useState<KnowledgeListItem[]>([]);
  const [selected, setSelected] = useState<KnowledgeBase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [addMode, setAddMode] = useState<AddMode>(null);
  const [saving, setSaving] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlTitle, setUrlTitle] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [docTitle, setDocTitle] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getKnowledgeBases();
      setList(data.bases);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    try {
      setSelected(await getKnowledgeBase(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load failed');
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const handleCreate = async () => {
    const name = window.prompt('Knowledge base name:', 'Company Knowledge');
    if (!name?.trim()) return;
    setSaving(true);
    try {
      const kb = await createKnowledgeBase(name.trim());
      await loadList();
      setSelected(kb);
      setSuccess(`Created "${kb.name}"`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (id: string) => {
    await activateKnowledgeBase(id);
    await loadList();
    if (selected?.id === id) await loadDetail(id);
    setSuccess('Active knowledge base updated — AI will use this on new calls.');
  };

  const handleAdd = async () => {
    if (!selected) return;
    setSaving(true);
    setError('');
    try {
      if (addMode === 'url') {
        await addUrlItem(selected.id, urlInput, urlTitle || undefined);
        setSuccess('Website crawled and saved to knowledge base.');
      } else if (addMode === 'text') {
        await addTextItem(selected.id, textTitle, textContent);
        setSuccess('Text saved to knowledge base.');
      } else if (addMode === 'document' && docFile) {
        await uploadDocument(selected.id, docFile, docTitle || undefined);
        setSuccess('Document uploaded to knowledge base.');
      }
      setAddMode(null);
      setUrlInput('');
      setUrlTitle('');
      setTextTitle('');
      setTextContent('');
      setDocFile(null);
      await loadDetail(selected.id);
      await loadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Add failed');
    } finally {
      setSaving(false);
    }
  };

  const itemIcon = (type: KnowledgeItem['type']) => {
    if (type === 'url') return Globe;
    if (type === 'document') return FileText;
    return Type;
  };

  return (
    <div>
      <Header title="Knowledge Base" subtitle="AI Context" onRefresh={loadList} />

      <div className="space-y-6 p-8">
        <div className="rounded-2xl border border-accent-violet/20 bg-accent-violet/5 px-5 py-4">
          <p className="text-sm text-accent-violet/90">
            Add websites, text, or documents. The <strong>active</strong> knowledge base is injected into Mia&apos;s AI
            brain on every call — she can answer company-specific questions mid-call.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-accent-cyan" />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <StatCard label="Knowledge Bases" value={list.length} icon={BookOpen} accent="violet" />
                <StatCard label="Active" value={list.filter((b) => b.active).length} icon={CheckCircle2} accent="emerald" />
                <StatCard
                  label="Total Sources"
                  value={list.reduce((s, b) => s + b.itemCount, 0)}
                  icon={Globe}
                  accent="cyan"
                />
              </div>
              <button onClick={handleCreate} disabled={saving} className="btn-primary text-xs">
                <Plus className="h-4 w-4" />
                New Knowledge Base
              </button>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {list.map((kb) => (
                <motion.div
                  key={kb.id}
                  className={`glass-card-hover cursor-pointer p-5 ${kb.active ? 'border-accent-emerald/30' : ''}`}
                  onClick={() => loadDetail(kb.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white">{kb.name}</h3>
                        {kb.active && (
                          <span className="rounded-full bg-accent-emerald/15 px-2 py-0.5 text-[10px] font-bold uppercase text-accent-emerald">
                            Active · AI uses this
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-slate-400">{kb.description || 'No description'}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        {kb.readyCount}/{kb.itemCount} sources ready
                      </p>
                    </div>
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      {!kb.active && (
                        <button onClick={() => handleActivate(kb.id)} className="btn-secondary text-xs">
                          Set Active
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          if (!window.confirm(`Delete "${kb.name}"?`)) return;
                          await deleteKnowledgeBase(kb.id);
                          if (selected?.id === kb.id) setSelected(null);
                          await loadList();
                        }}
                        className="btn-secondary text-xs text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {selected && (
              <div className="glass-card p-6">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-white">{selected.name}</h3>
                    <p className="text-sm text-slate-400">{selected.items.length} sources</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setAddMode('url')} className="btn-secondary text-xs">
                      <Globe className="h-3.5 w-3.5" /> Add Website
                    </button>
                    <button onClick={() => setAddMode('text')} className="btn-secondary text-xs">
                      <Type className="h-3.5 w-3.5" /> Add Text
                    </button>
                    <button onClick={() => setAddMode('document')} className="btn-secondary text-xs">
                      <Upload className="h-3.5 w-3.5" /> Upload Doc
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {selected.items.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-500">
                      No sources yet. Add a website URL to crawl, paste text, or upload a document.
                    </p>
                  ) : (
                    selected.items.map((item) => {
                      const Icon = itemIcon(item.type);
                      return (
                        <div key={item.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex gap-3">
                              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent-cyan" />
                              <div>
                                <p className="font-medium text-white">{item.title}</p>
                                <p className="text-xs text-slate-500">
                                  {item.type}
                                  {item.sourceUrl && ` · ${item.sourceUrl}`}
                                  {item.pagesCrawled && ` · ${item.pagesCrawled} pages crawled`}
                                  {item.charCount > 0 && ` · ${item.charCount.toLocaleString()} chars`}
                                </p>
                                <span
                                  className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                                    item.status === 'ready'
                                      ? 'bg-accent-emerald/15 text-accent-emerald'
                                      : item.status === 'processing'
                                        ? 'bg-amber-500/15 text-amber-400'
                                        : 'bg-red-500/15 text-red-400'
                                  }`}
                                >
                                  {item.status}
                                </span>
                                {item.errorMessage && (
                                  <p className="mt-1 text-xs text-red-400">{item.errorMessage}</p>
                                )}
                                {item.status === 'ready' && item.content && (
                                  <p className="mt-2 line-clamp-2 text-xs text-slate-500">{item.content.slice(0, 200)}…</p>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              {item.type === 'url' && (
                                <button
                                  onClick={async () => {
                                    setSaving(true);
                                    await recrawlItem(selected.id, item.id);
                                    await loadDetail(selected.id);
                                    setSaving(false);
                                  }}
                                  className="btn-secondary px-2 py-1 text-xs"
                                  title="Re-crawl website"
                                >
                                  <RefreshCw className="h-3.5 w-3.5" />
                                </button>
                              )}
                              <button
                                onClick={async () => {
                                  await deleteItem(selected.id, item.id);
                                  await loadDetail(selected.id);
                                  await loadList();
                                }}
                                className="btn-secondary px-2 py-1 text-xs text-red-400"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {error && (
          <p className="flex items-center gap-2 text-sm text-red-400">
            <AlertCircle className="h-4 w-4" />{error}
          </p>
        )}
        {success && (
          <p className="flex items-center gap-2 text-sm text-accent-emerald">
            <CheckCircle2 className="h-4 w-4" />{success}
          </p>
        )}
      </div>

      <AnimatePresence>
        {addMode && selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={() => !saving && setAddMode(null)}
          >
            <motion.div
              initial={{ scale: 0.98, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card w-full max-w-lg p-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-bold text-white">
                  {addMode === 'url' && 'Add Website (auto-crawl)'}
                  {addMode === 'text' && 'Add Text'}
                  {addMode === 'document' && 'Upload Document'}
                </h3>
                <button onClick={() => setAddMode(null)} className="text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {addMode === 'url' && (
                <div className="space-y-3">
                  <input
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://yourcompany.com"
                    className="input-field font-mono text-sm"
                  />
                  <input
                    value={urlTitle}
                    onChange={(e) => setUrlTitle(e.target.value)}
                    placeholder="Title (optional)"
                    className="input-field text-sm"
                  />
                  <p className="text-xs text-slate-500">
                    We crawl the homepage and up to 5 linked pages on the same domain.
                  </p>
                </div>
              )}

              {addMode === 'text' && (
                <div className="space-y-3">
                  <input
                    value={textTitle}
                    onChange={(e) => setTextTitle(e.target.value)}
                    placeholder="Title e.g. Company FAQ"
                    className="input-field text-sm"
                  />
                  <textarea
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="Paste company info, FAQs, scripts..."
                    rows={8}
                    className="input-field text-sm leading-relaxed"
                  />
                </div>
              )}

              {addMode === 'document' && (
                <div className="space-y-3">
                  <input
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    placeholder="Title (optional)"
                    className="input-field text-sm"
                  />
                  <input
                    type="file"
                    accept=".txt,.md,.csv,.json,.html,.htm"
                    onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
                    className="input-field text-sm"
                  />
                  <p className="text-xs text-slate-500">Supported: .txt, .md, .csv, .json, .html (max 5MB)</p>
                </div>
              )}

              <button
                onClick={handleAdd}
                disabled={
                  saving ||
                  (addMode === 'url' && !urlInput.trim()) ||
                  (addMode === 'text' && (!textTitle.trim() || !textContent.trim())) ||
                  (addMode === 'document' && !docFile)
                }
                className="btn-primary mt-4 w-full"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {addMode === 'url' ? (saving ? 'Crawling website...' : 'Crawl & Save') : 'Save'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}