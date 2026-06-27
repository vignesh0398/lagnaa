import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  FilePen,
  FileText,
  Loader2,
  Rocket,
  Save,
  Sparkles,
  X,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { StatCard } from '../components/ui/StatCard';
import {
  createPrompt,
  draftPrompt,
  getPrompt,
  getPrompts,
  publishPrompt,
  savePrompt,
  type CallFlowPrompt,
  type CallFlowScripts,
  type PromptAiUpdates,
  type PromptListItem,
} from '../api/prompts';
import { mergePromptUpdates, PromptAiChat } from '../components/prompts/PromptAiChat';

const SCRIPT_LABELS: { key: keyof CallFlowScripts; label: string; hint?: string }[] = [
  { key: 'hello', label: 'Step 1 — Opening greeting', hint: 'Mia says only this, then waits. e.g. "Hello."' },
  { key: 'intro', label: 'Step 1 — Introduction', hint: 'Use {{clientName}} for the client name' },
  { key: 'confirmIdentityRetry', label: 'Step 1 — Re-confirm identity' },
  { key: 'noTimeDuringIntro', label: 'Step 1 — Client has no time (offer callback)' },
  { key: 'explainReason', label: 'Step 2 — Reason for call + ask to proceed' },
  { key: 'askProceed', label: 'Step 2 — Re-ask to proceed' },
  { key: 'recordingNotice', label: 'Step 3 — Recording notice + ask DOB' },
  { key: 'dobRetry', label: 'Step 3 — Retry if DOB not heard' },
  { key: 'askPostcode', label: 'Step 3 — Ask postcode' },
  { key: 'postcodeRetry', label: 'Step 3 — Retry if postcode not heard' },
  { key: 'consent', label: 'Step 5 — Consent + legal disclaimer' },
  { key: 'consentRetry', label: 'Step 5 — Retry if not interested (mention free)' },
  { key: 'finalClose', label: 'Step 6 — Closing (consent given)' },
  { key: 'wrongPersonEnd', label: 'End — Wrong person' },
  { key: 'notInterestedEnd', label: 'End — Not interested' },
  { key: 'verificationFailedEnd', label: 'End — Verification failed' },
  { key: 'verificationRefusedEnd', label: 'End — Verification refused' },
  { key: 'dndEnd', label: 'End — DND requested' },
  { key: 'callbackEnd', label: 'End — Callback scheduled' },
  { key: 'noSpeechRetry', label: 'Retry — When speech not heard' },
];

export function PromptLibrary() {
  const [prompts, setPrompts] = useState<PromptListItem[]>([]);
  const [, setActiveId] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, activeVersions: 0 });
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState<CallFlowPrompt | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [creating, setCreating] = useState(false);
  const [statusSaving, setStatusSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPrompts();
      setPrompts(data.prompts);
      setActiveId(data.activeId);
      setStats({ total: data.stats.total, activeVersions: data.stats.activeVersions });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openEditor = async (id: string) => {
    setSaveError('');
    setSaveSuccess('');
    const prompt = await getPrompt(id);
    setEditing(prompt);
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    setSaveError('');
    try {
      await savePrompt(editing.id, {
        name: editing.name,
        description: editing.description,
        agentName: editing.agentName,
        scripts: editing.scripts,
        behaviorRules: editing.behaviorRules,
      });
      setSaveSuccess(
        editing.status === 'published'
          ? 'Prompt saved! Published agent will use this script on the next call.'
          : 'Prompt saved as draft. Publish it in AI Agents when ready to run calls.'
      );
      await load();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (id: string) => {
    setStatusSaving(id);
    try {
      await publishPrompt(id);
      await load();
    } finally {
      setStatusSaving(null);
    }
  };

  const handleDraft = async (id: string) => {
    if (!window.confirm('Move this agent to draft? Calls will stop until you publish an agent.')) return;
    setStatusSaving(id);
    try {
      await draftPrompt(id);
      await load();
    } finally {
      setStatusSaving(null);
    }
  };

  const handleCreate = async () => {
    const name = window.prompt('Name for your new call flow prompt:', 'My Custom Call Flow');
    if (!name?.trim()) return;
    setCreating(true);
    setSaveError('');
    try {
      const prompt = await createPrompt({ name: name.trim() });
      await load();
      setEditing(prompt);
      setSaveSuccess('New prompt created — edit the scripts below and save.');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setCreating(false);
    }
  };

  const updateScript = (key: keyof CallFlowScripts, value: string) => {
    if (!editing) return;
    setEditing({
      ...editing,
      scripts: { ...editing.scripts, [key]: value },
    });
  };

  const applyAiUpdates = (updates: PromptAiUpdates) => {
    if (!editing) return;
    setEditing(mergePromptUpdates(editing, updates));
    setSaveSuccess('AI edits applied to draft — review and save when ready.');
  };

  return (
    <div>
      <Header title="Agent Prompts" subtitle="Call Flow Scripts" />

      <div className="space-y-6 p-8">
        <div className="flex flex-col gap-4 rounded-2xl border border-accent-cyan/20 bg-accent-cyan/5 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-accent-cyan/90">
              Edit call scripts for each AI agent. Use{' '}
              <code className="rounded bg-white/10 px-1">{'{{clientName}}'}</code> for the client name.
              Save as draft, then <strong className="text-white">Publish</strong> in AI Agents (or here) before GHL or manual calls run.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Flow: Greeting → Identity → Plevin reason → Verification (DOB/postcode) → Consent → Close
            </p>
          </div>
          <button onClick={handleCreate} disabled={creating} className="btn-primary shrink-0 text-xs">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            New Prompt
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-accent-cyan" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <StatCard label="Total Prompts" value={stats.total} icon={FileText} accent="cyan" />
              <StatCard label="Published" value={stats.activeVersions} icon={Sparkles} accent="violet" />
            </div>

            <div className="grid grid-cols-1 gap-4">
              {prompts.map((prompt, i) => (
                <motion.div
                  key={prompt.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                  className={`glass-card-hover p-5 ${prompt.status === 'published' ? 'border-accent-emerald/30' : ''}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white">{prompt.name}</h3>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            prompt.status === 'published'
                              ? 'bg-accent-emerald/15 text-accent-emerald'
                              : 'bg-amber-500/15 text-amber-300'
                          }`}
                        >
                          {prompt.status === 'published' ? 'Published' : 'Draft'}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-400">{prompt.description}</p>
                      <p className="mt-2 text-xs text-slate-500">Agent: {prompt.agentName} · Updated {prompt.updated}</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {prompt.status === 'published' ? (
                        <button
                          onClick={() => handleDraft(prompt.id)}
                          disabled={statusSaving === prompt.id}
                          className="btn-secondary text-xs"
                        >
                          {statusSaving === prompt.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <FilePen className="h-3.5 w-3.5" />
                          )}
                          Draft
                        </button>
                      ) : (
                        <button
                          onClick={() => handlePublish(prompt.id)}
                          disabled={statusSaving === prompt.id}
                          className="btn-secondary text-xs"
                        >
                          {statusSaving === prompt.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Rocket className="h-3.5 w-3.5" />
                          )}
                          Publish
                        </button>
                      )}
                      <button onClick={() => openEditor(prompt.id)} className="btn-primary text-xs">
                        Edit Prompt
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm p-4 pt-8"
            onClick={() => !saving && setEditing(null)}
          >
            <motion.div
              initial={{ scale: 0.98, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card mb-8 w-full max-w-6xl p-6"
            >
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">Edit Call Flow Prompt</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Use the AI assistant to rewrite scripts from your workflow description
                  </p>
                </div>
                <button onClick={() => setEditing(null)} disabled={saving} className="text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              <div>
              <div className="mb-6 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Prompt name</label>
                  <input
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Agent name</label>
                  <input
                    value={editing.agentName}
                    onChange={(e) => setEditing({ ...editing, agentName: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
                  Behavior rules (AI uses this when answering questions mid-call)
                </label>
                <textarea
                  value={editing.behaviorRules}
                  onChange={(e) => setEditing({ ...editing, behaviorRules: e.target.value })}
                  rows={5}
                  className="input-field font-mono text-xs leading-relaxed"
                />
              </div>

              <h4 className="mb-4 text-sm font-semibold text-white">Call script lines</h4>
              <div className="max-h-[50vh] space-y-4 overflow-y-auto pr-2">
                {SCRIPT_LABELS.map(({ key, label, hint }) => (
                  <div key={key}>
                    <label className="mb-1 block text-xs font-medium text-slate-400">{label}</label>
                    {hint && <p className="mb-1 text-[10px] text-slate-600">{hint}</p>}
                    <textarea
                      value={editing.scripts[key]}
                      onChange={(e) => updateScript(key, e.target.value)}
                      rows={key === 'explainReason' || key === 'consent' ? 4 : 2}
                      className="input-field text-sm leading-relaxed"
                    />
                  </div>
                ))}
              </div>

              {saveError && (
                <p className="mt-4 flex items-center gap-2 text-sm text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  {saveError}
                </p>
              )}
              {saveSuccess && (
                <p className="mt-4 flex items-center gap-2 text-sm text-accent-emerald">
                  <CheckCircle2 className="h-4 w-4" />
                  {saveSuccess}
                </p>
              )}

              <button onClick={handleSave} disabled={saving} className="btn-primary mt-6 w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Prompt
              </button>
              </div>

              <div className="lg:sticky lg:top-4 lg:self-start">
                <PromptAiChat promptId={editing.id} onApplyUpdates={applyAiUpdates} />
              </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}