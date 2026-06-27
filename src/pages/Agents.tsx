import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  FilePen,
  Headphones,
  Loader2,
  Phone,
  Plug,
  Rocket,
  Save,
  Settings,
  Square,
  Volume2,
  X,
} from 'lucide-react';
import { useVoicePreview } from '../hooks/useVoicePreview';
import { Header } from '../components/layout/Header';
import { StatCard } from '../components/ui/StatCard';
import { EmptyState } from '../components/ui/EmptyState';
import {
  getAgents,
  saveAgentSettings,
  type Agent,
  type LlmOption,
  type VoiceOption,
} from '../api/agents';
import { draftPrompt, getPrompts, publishPrompt } from '../api/prompts';
import { getKnowledgeBases } from '../api/knowledge';
import { placeCall } from '../api/twilio';

export function Agents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [stats, setStats] = useState({ total: 0, conversation: 0, inference: 0, chat: 0, embedding: 0 });
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activePromptName, setActivePromptName] = useState<string | null>(null);
  const [activeKbName, setActiveKbName] = useState<string | null>(null);
  const [publishedAgentName, setPublishedAgentName] = useState<string | null>(null);
  const [statusSaving, setStatusSaving] = useState<string | null>(null);
  const [statusError, setStatusError] = useState('');

  const [callModal, setCallModal] = useState<{ agentName: string; from: string } | null>(null);
  const [destination, setDestination] = useState('');
  const [calling, setCalling] = useState(false);
  const [callResult, setCallResult] = useState('');
  const [callError, setCallError] = useState('');
  const [aiVoice, setAiVoice] = useState(true);
  const [clientName, setClientName] = useState('');
  const [clientDob, setClientDob] = useState('');
  const [clientPostcode, setClientPostcode] = useState('');

  const [configAgent, setConfigAgent] = useState<Agent | null>(null);
  const [voiceOptions, setVoiceOptions] = useState<VoiceOption[]>([]);
  const [llmOptions, setLlmOptions] = useState<LlmOption[]>([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [selectedLlm, setSelectedLlm] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);
  const [configError, setConfigError] = useState('');
  const [configSuccess, setConfigSuccess] = useState('');
  const { preview, stop, playing, voicesReady, previewText } = useVoicePreview();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, prompts, kb] = await Promise.all([getAgents(), getPrompts(), getKnowledgeBases()]);
      setAgents(data.agents);
      setStats(data.stats);
      setConnected(data.connected);
      setPublishedAgentName(data.publishedAgentName ?? null);
      if (data.voices) setVoiceOptions(data.voices);
      if (data.llms) setLlmOptions(data.llms);
      const active = prompts.prompts.find((p) => p.status === 'published');
      setActivePromptName(active?.name ?? null);
      const activeKb = kb.bases.find((b) => b.active);
      setActiveKbName(activeKb?.name ?? null);
    } catch {
      setAgents([]);
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handlePlaceCall = async () => {
    if (!callModal || !destination.trim()) return;
    if (aiVoice && !clientName.trim()) {
      setCallError('Client name is required for the Justizia call flow.');
      return;
    }
    setCalling(true);
    setCallError('');
    setCallResult('');
    try {
      const result = await placeCall({
        to: destination.trim(),
        from: callModal.from.replace(/\s/g, ''),
        agentName: callModal.agentName,
        aiVoice,
        clientName: clientName.trim(),
        clientDob: clientDob.trim() || undefined,
        clientPostcode: clientPostcode.trim() || undefined,
      });
      setCallResult(result.message);
      load();
    } catch (err) {
      setCallError(err instanceof Error ? err.message : 'Call failed');
    } finally {
      setCalling(false);
    }
  };

  const openConfig = (agent: Agent) => {
    stop();
    setConfigAgent(agent);
    setSelectedVoice(agent.voiceId);
    setSelectedLlm(agent.llmModel);
    setConfigError('');
    setConfigSuccess('');
  };

  const handleSaveConfig = async () => {
    if (!configAgent) return;
    setSavingConfig(true);
    setConfigError('');
    try {
      await saveAgentSettings(configAgent.id, {
        voiceId: selectedVoice,
        llmModel: selectedLlm,
      });
      setConfigSuccess('Saved! Next call will use these settings.');
      await load();
    } catch (err) {
      setConfigError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSavingConfig(false);
    }
  };

  const handlePublish = async (id: string) => {
    setStatusSaving(id);
    setStatusError('');
    try {
      await publishPrompt(id);
      await load();
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Publish failed');
    } finally {
      setStatusSaving(null);
    }
  };

  const handleDraft = async (id: string) => {
    if (!window.confirm('Move this agent to draft? GHL and manual calls will stop until you publish an agent.')) {
      return;
    }
    setStatusSaving(id);
    setStatusError('');
    try {
      await draftPrompt(id);
      await load();
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Failed to move to draft');
    } finally {
      setStatusSaving(null);
    }
  };

  const openCallModal = (agentName: string, phone: string) => {
    setCallModal({ agentName, from: phone });
    setDestination('');
    setClientName('');
    setClientDob('');
    setClientPostcode('');
    setCallResult('');
    setCallError('');
  };

  return (
    <div>
      <Header title="AI Agents" subtitle="Voice" onRefresh={load} />

      <div className="space-y-6 p-8">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-accent-cyan" />
          </div>
        ) : !connected ? (
          <EmptyState
            icon={Plug}
            title="Connect Twilio first"
            description="Your agent will use your real Twilio outbound number once connected. No demo or fake data."
            action={
              <Link to="/gateway" className="btn-primary">
                Open Connections
              </Link>
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <StatCard label="Total Agents" value={stats.total} icon={Bot} accent="cyan" />
              <StatCard label="Conversation" value={stats.conversation} icon={Headphones} accent="violet" />
              <StatCard label="Inference" value={stats.inference} icon={Bot} accent="pink" />
              <StatCard label="Chat" value={stats.chat} icon={Bot} accent="emerald" />
              <StatCard label="Embedding" value={stats.embedding} icon={Bot} accent="cyan" />
            </div>

            {statusError && (
              <div className="flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {statusError}
              </div>
            )}

            <div className="rounded-2xl border border-accent-violet/20 bg-gradient-to-r from-accent-violet/10 to-accent-cyan/5 p-5">
              <div className="flex items-center gap-3">
                <Headphones className="h-5 w-5 text-accent-violet" />
                <div>
                  <h3 className="font-semibold text-white">
                    Conversation Agents · {agents.length}
                  </h3>
                  <p className="text-sm text-slate-400">
                    {publishedAgentName ? (
                      <>
                        Live calls use <span className="text-accent-emerald">{publishedAgentName}</span>
                        {' '}· Script: <span className="text-accent-cyan">{activePromptName ?? '—'}</span>
                      </>
                    ) : (
                      <span className="text-amber-300">No published agent — calls are blocked until you publish one.</span>
                    )}
                    {' '}· KB: <span className="text-accent-violet">{activeKbName ?? 'None'}</span>
                    {' '}· <Link to="/prompts" className="text-accent-cyan hover:underline">Prompts</Link>
                    {' '}· <Link to="/knowledge" className="text-accent-violet hover:underline">Knowledge</Link>
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {agents.map((agent, i) => (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i }}
                  className="glass-card-hover group p-6"
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white">{agent.name}</h3>
                      <p className="text-xs text-slate-500">{agent.workflow}</p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                        agent.status === 'published'
                          ? 'bg-accent-emerald/15 text-accent-emerald'
                          : 'bg-amber-500/15 text-amber-300'
                      }`}
                    >
                      {agent.status === 'published' ? 'Published' : 'Draft'}
                    </span>
                  </div>

                  <div className="mb-4 grid grid-cols-2 gap-3">
                    {[
                      { label: 'LLM', value: agent.llm },
                      { label: 'Fallback', value: agent.fallback },
                      { label: 'TTS', value: agent.tts },
                      { label: 'Twilio Number', value: agent.phone },
                    ].map((spec) => (
                      <div key={spec.label} className="rounded-lg bg-white/5 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wider text-slate-500">{spec.label}</p>
                        <p className="font-mono text-xs text-slate-300">{spec.value || '—'}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mb-4 text-xs text-slate-500">
                    <span className="text-accent-cyan">{agent.callsToday} calls today</span> · from Twilio
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {agent.status === 'published' ? (
                      <button
                        onClick={() => handleDraft(agent.id)}
                        disabled={statusSaving === agent.id}
                        className="btn-secondary text-xs"
                      >
                        {statusSaving === agent.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <FilePen className="h-3.5 w-3.5" />
                        )}
                        Move to Draft
                      </button>
                    ) : (
                      <button
                        onClick={() => handlePublish(agent.id)}
                        disabled={statusSaving === agent.id}
                        className="btn-secondary text-xs"
                      >
                        {statusSaving === agent.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Rocket className="h-3.5 w-3.5" />
                        )}
                        Publish
                      </button>
                    )}
                    <button
                      onClick={() => openConfig(agent)}
                      className="btn-secondary flex-1 text-xs"
                    >
                      <Settings className="h-3.5 w-3.5" />
                      LLM & Voice
                    </button>
                    <button
                      onClick={() => openCallModal(agent.name, agent.phone)}
                      disabled={agent.status !== 'published'}
                      className="btn-primary flex-1 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                      title={agent.status !== 'published' ? 'Publish this agent before placing calls' : undefined}
                    >
                      <Phone className="h-3.5 w-3.5" />
                      Place Call
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {configAgent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => {
              if (!savingConfig) {
                stop();
                setConfigAgent(null);
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card mx-4 w-full max-w-md p-6"
            >
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Agent Settings — {configAgent.name}</h3>
                <button
                  onClick={() => {
                    stop();
                    setConfigAgent(null);
                  }}
                  disabled={savingConfig}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="mb-4 text-sm text-slate-400">
                Change how Mia sounds (TTS voice) and how she answers questions mid-call (LLM). The call script flow stays the same — edit that in Agent Prompts.
              </p>

              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">
                  Voice (TTS)
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedVoice}
                    onChange={(e) => setSelectedVoice(e.target.value)}
                    className="input-field flex-1 text-sm"
                  >
                    {(voiceOptions.length ? voiceOptions : [{ id: selectedVoice, label: configAgent.tts, locale: '' }]).map((v) => (
                      <option key={v.id} value={v.id}>{v.label}</option>
                    ))}
                  </select>
                  {playing ? (
                    <button type="button" onClick={stop} className="btn-secondary shrink-0 px-3" title="Stop preview">
                      <Square className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => preview(selectedVoice)}
                      disabled={!voicesReady}
                      className="btn-secondary shrink-0 px-3"
                      title="Play voice preview"
                    >
                      <Volume2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <p className="mt-2 rounded-lg bg-white/5 px-3 py-2 text-[11px] italic leading-relaxed text-slate-500">
                  &ldquo;{previewText}&rdquo;
                </p>
                <p className="mt-1 text-[10px] text-slate-600">
                  Live calls use ElevenLabs Emilia (young, natural UK) with emotional tuning. Try Amelia if you want more energy.
                </p>
              </div>

              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">
                  LLM (mid-call questions)
                </label>
                <select
                  value={selectedLlm}
                  onChange={(e) => setSelectedLlm(e.target.value)}
                  className="input-field text-sm"
                >
                  {(llmOptions.length ? llmOptions : [{ id: selectedLlm, label: configAgent.llm, provider: 'groq' as const }]).map((l) => (
                    <option key={l.id} value={l.id}>{l.label}</option>
                  ))}
                </select>
                <p className="mt-1 text-[10px] text-slate-600">
                  Groq models need an API key in Connections. Built-in rules work without Groq.
                </p>
              </div>

              {configError && (
                <p className="mb-3 flex items-center gap-2 text-sm text-red-400">
                  <AlertCircle className="h-4 w-4" />{configError}
                </p>
              )}
              {configSuccess && (
                <p className="mb-3 flex items-center gap-2 text-sm text-accent-emerald">
                  <CheckCircle2 className="h-4 w-4" />{configSuccess}
                </p>
              )}

              <button onClick={handleSaveConfig} disabled={savingConfig} className="btn-primary w-full">
                {savingConfig ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Settings
              </button>
            </motion.div>
          </motion.div>
        )}

        {callModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => !calling && setCallModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card mx-4 w-full max-w-md p-6"
            >
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Place Outbound Call</h3>
                <button onClick={() => setCallModal(null)} disabled={calling} className="text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="mb-4 text-sm text-slate-400">
                Agent: <span className="text-white">{callModal.agentName}</span> · From:{' '}
                <span className="font-mono text-accent-cyan">{callModal.from}</span>
              </p>

              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">
                Destination Number
              </label>
              <input
                type="tel"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="+918807709541"
                className="input-field mb-3 font-mono"
                autoFocus
              />

              {aiVoice && (
                <div className="mb-4 space-y-3 rounded-xl border border-accent-cyan/20 bg-accent-cyan/5 p-3">
                  <p className="text-xs font-semibold text-accent-cyan">Justizia Law Call Flow</p>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Client name (required)"
                    className="input-field text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={clientDob}
                      onChange={(e) => setClientDob(e.target.value)}
                      placeholder="DOB (optional)"
                      className="input-field text-xs"
                    />
                    <input
                      type="text"
                      value={clientPostcode}
                      onChange={(e) => setClientPostcode(e.target.value)}
                      placeholder="Postcode (optional)"
                      className="input-field text-xs"
                    />
                  </div>
                </div>
              )}

              <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-xs text-amber-200/90">
                <p className="font-semibold text-amber-300">Twilio trial account detected</p>
                <p className="mt-1 leading-relaxed text-amber-200/80">
                  Retell uses SIP trunking (no trial message). This CRM uses Twilio&apos;s API — on trial, the person
                  answering must <strong>press any keypad button</strong> when they hear the trial message, then Mia will
                  speak. Upgrade Twilio billing to remove this permanently.
                </p>
              </div>

              <label className="mb-4 flex cursor-pointer items-center gap-3 rounded-xl border border-accent-violet/20 bg-accent-violet/5 p-3">
                <input
                  type="checkbox"
                  checked={aiVoice}
                  onChange={(e) => setAiVoice(e.target.checked)}
                  className="h-4 w-4 rounded accent-accent-violet"
                />
                <div>
                  <p className="text-sm font-medium text-white">AI Voice Mode</p>
                  <p className="text-xs text-slate-400">Justizia 6-step conversational flow</p>
                </div>
              </label>

              {callError && (
                <p className="mb-3 flex items-center gap-2 text-sm text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  {callError}
                </p>
              )}
              {callResult && (
                <p className="mb-3 flex items-center gap-2 text-sm text-accent-emerald">
                  <CheckCircle2 className="h-4 w-4" />
                  {callResult}
                </p>
              )}

              <button
                onClick={handlePlaceCall}
                disabled={calling || !destination.trim()}
                className="btn-primary w-full"
              >
                {calling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
                {calling ? 'Calling...' : aiVoice ? 'Start AI Voice Call' : 'Start Script Call'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}