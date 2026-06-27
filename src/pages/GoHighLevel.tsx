import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  Building2,
  CheckCircle2,
  Copy,
  Download,
  ListOrdered,
  Loader2,
  Plug,
  Phone,
  Unplug,
  Zap,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { StatCard } from '../components/ui/StatCard';
import {
  connectGhl,
  disconnectGhl,
  getGhlConfig,
  importGhlContacts,
  triggerGhlCall,
  updateGhlConfig,
  type GhlConfig,
  type GhlImportedContact,
} from '../api/ghl';
import { getCallQueue, updateCallQueue, type CallQueueStats } from '../api/twilio';

const CALL_SYNC_FIELDS: { key: keyof GhlConfig['fieldMapping']; label: string; hint: string }[] = [
  { key: 'callOutcomeField', label: '1. Call outcome', hint: 'lagnaa_call_outcome' },
  { key: 'verificationOutcomeField', label: '2. Verification outcome', hint: 'lagnaa_verification_outcome' },
  { key: 'callSummaryField', label: '3. Call summary', hint: 'lagnaa_call_summary' },
  { key: 'callTranscriptField', label: '4. Call transcript', hint: 'lagnaa_call_transcript' },
  { key: 'recordingUrlField', label: '5. Recording URL', hint: 'lagnaa_recording_url' },
];

const INBOUND_FIELDS: { key: keyof GhlConfig['fieldMapping']; label: string; hint: string; note?: string }[] = [
  {
    key: 'nameField',
    label: 'Name field',
    hint: 'customer_name',
    note: 'GHL: {{contact.customer_name}} — Mia asks "May I speak with [name]?"',
  },
  { key: 'dobField', label: 'DOB field', hint: 'customer_dob', note: 'GHL: {{contact.customer_dob}}' },
  { key: 'postcodeField', label: 'Postcode field', hint: 'customer_postcode', note: 'GHL: {{contact.customer_postcode}}' },
];

export function GoHighLevel() {
  const [config, setConfig] = useState<GhlConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [apiKey, setApiKey] = useState('');
  const [locationId, setLocationId] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [autoSync, setAutoSync] = useState(true);
  const [addTags, setAddTags] = useState(true);
  const [fieldMapping, setFieldMapping] = useState<GhlConfig['fieldMapping']>({
    callOutcomeField: 'lagnaa_call_outcome',
    verificationOutcomeField: 'lagnaa_verification_outcome',
    callSummaryField: 'lagnaa_call_summary',
    callTranscriptField: 'lagnaa_call_transcript',
    recordingUrlField: 'lagnaa_recording_url',
    nameField: 'customer_name',
    dobField: 'customer_dob',
    postcodeField: 'customer_postcode',
  });
  const [autoCallOnTag, setAutoCallOnTag] = useState(true);
  const [callTriggerTag, setCallTriggerTag] = useState('lagnaa-call');
  const [testContactId, setTestContactId] = useState('');
  const [imported, setImported] = useState<GhlImportedContact[]>([]);
  const [queueStats, setQueueStats] = useState<CallQueueStats | null>(null);
  const [queueEnabled, setQueueEnabled] = useState(true);
  const [maxConcurrent, setMaxConcurrent] = useState(5);
  const [queueSaving, setQueueSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const c = await getGhlConfig();
      setConfig(c);
      setLocationId(c.locationId);
      setTagFilter(c.importTagFilter);
      setAutoSync(c.autoSyncOutcomes);
      setAddTags(c.addTagsOnSync);
      setFieldMapping({ ...fieldMapping, ...c.fieldMapping });
      setAutoCallOnTag(c.autoCallOnTag ?? true);
      setCallTriggerTag(c.callTriggerTag ?? 'lagnaa-call');
    } catch {
      setConfig(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadQueue = useCallback(async () => {
    try {
      const q = await getCallQueue();
      setQueueStats(q.stats);
      setQueueEnabled(q.config.enabled);
      setMaxConcurrent(q.config.maxConcurrent);
    } catch {
      setQueueStats(null);
    }
  }, []);

  useEffect(() => {
    load();
    loadQueue();
  }, [load, loadQueue]);

  useEffect(() => {
    const timer = setInterval(loadQueue, 5000);
    return () => clearInterval(timer);
  }, [loadQueue]);

  const handleSaveQueue = async () => {
    setQueueSaving(true);
    setError('');
    try {
      const result = await updateCallQueue({ enabled: queueEnabled, maxConcurrent });
      setQueueStats(result.stats);
      setMessage(`Call queue saved — max ${result.config.maxConcurrent} concurrent calls`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Queue save failed');
    } finally {
      setQueueSaving(false);
    }
  };

  const handleConnect = async () => {
    if (!apiKey.trim() || !locationId.trim()) {
      setError('Enter your Private Integration Token and Location ID');
      return;
    }
    setConnecting(true);
    setError('');
    try {
      const result = await connectGhl(apiKey.trim(), locationId.trim());
      setConfig(result.config);
      setApiKey('');
      setMessage(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setConnecting(true);
    try {
      setConfig(await disconnectGhl());
      setLocationId('');
      setMessage('GoHighLevel disconnected');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Disconnect failed');
    } finally {
      setConnecting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const c = await updateGhlConfig({
        autoSyncOutcomes: autoSync,
        addTagsOnSync: addTags,
        importTagFilter: tagFilter,
        autoCallOnTag,
        callTriggerTag,
        fieldMapping,
      });
      setConfig(c);
      setMessage('Sync settings saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    setError('');
    try {
      const result = await importGhlContacts(tagFilter || undefined);
      setImported(result.contacts);
      setConfig(result.config);
      setMessage(`Imported ${result.imported} contacts from GoHighLevel`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const exportCsv = () => {
    if (!imported.length) return;
    const rows = [
      ['id', 'name', 'phone', 'email', 'tags'].join(','),
      ...imported.map((c) =>
        [c.id, c.name, c.phone, c.email, c.tags.join(';')]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(',')
      ),
    ];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ghl-contacts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleTestCall = async () => {
    if (!testContactId.trim()) return;
    setSaving(true);
    setError('');
    try {
      const result = await triggerGhlCall(testContactId.trim());
      setMessage(result.message);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test call failed');
    } finally {
      setSaving(false);
    }
  };

  const copyPipeline = () => {
    navigator.clipboard.writeText(
      'GHL contacts → Lagnaa (voice / WhatsApp / email) → outcomes sync back to GHL custom fields + tags'
    );
    setMessage('Pipeline copied');
    setTimeout(() => setMessage(''), 2000);
  };

  return (
    <div>
      <Header
        title="GoHighLevel Sync"
        subtitle="CRM integration"
        onRefresh={load}
        actions={
          <Link to="/gateway" className="btn-secondary text-xs">
            Connections
          </Link>
        }
      />

      <div className="space-y-6 p-8">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-accent-emerald" />
          </div>
        ) : (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6">
              <h3 className="mb-2 font-bold text-white">Sync Pipeline</h3>
              <p className="mb-4 text-sm text-slate-400">
                Contacts flow from GoHighLevel into Lagnaa campaigns and calls. When sessions end, outcomes push back to
                GHL custom fields, tags, and notes.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4">
                {['GoHighLevel', 'Lagnaa', 'Twilio / Meta / SMTP', 'GoHighLevel'].map((step, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div
                      className={`rounded-xl px-3 py-2 text-xs font-semibold md:text-sm ${
                        i === 1
                          ? 'bg-gradient-brand text-white shadow-glow'
                          : i === 0 || i === 3
                            ? config?.connected
                              ? 'border border-accent-emerald/40 bg-accent-emerald/10 text-accent-emerald'
                              : 'border border-white/10 bg-white/5 text-slate-400'
                            : 'border border-accent-cyan/30 bg-accent-cyan/10 text-accent-cyan'
                      }`}
                    >
                      {step}
                    </div>
                    {i < 3 && <ArrowRight className="h-4 w-4 text-slate-600" />}
                  </div>
                ))}
              </div>
              <button onClick={copyPipeline} className="btn-secondary mt-4 text-xs">
                <Copy className="h-3.5 w-3.5" /> Copy pipeline summary
              </button>
            </motion.div>

            {config && (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                <StatCard label="Calls Triggered" value={config.callsTriggered ?? 0} icon={Phone} accent="cyan" />
                <StatCard label="Outcomes Pushed" value={config.outcomesPushed} icon={ArrowUpFromLine} accent="emerald" />
                <StatCard label="Contacts Imported" value={config.contactsImported} icon={ArrowDownToLine} accent="cyan" />
                <StatCard label="Auto-call" value={config.autoCallOnTag ? 'On' : 'Off'} icon={Zap} accent="violet" />
                <StatCard
                  label="Location"
                  value={config.locationName ?? (config.connected ? 'Connected' : '—')}
                  icon={Building2}
                  accent="pink"
                />
              </div>
            )}

            {config?.connected && (
              <div className="glass-card border-accent-violet/20 p-6">
                <h3 className="mb-2 flex items-center gap-2 font-bold text-white">
                  <ListOrdered className="h-4 w-4 text-accent-violet" />
                  Call Queue
                </h3>
                <p className="mb-4 text-xs text-slate-500">
                  When GHL tags many contacts at once, extra calls wait in line instead of overloading Twilio.
                  Recommended for ~500 calls/day with <strong className="text-slate-400">5 concurrent lines</strong>.
                </p>
                {queueStats && (
                  <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
                    <div className="rounded-xl bg-white/5 px-3 py-2 text-center">
                      <p className="text-[10px] uppercase text-slate-500">Active</p>
                      <p className="text-lg font-bold text-accent-emerald">{queueStats.active}</p>
                    </div>
                    <div className="rounded-xl bg-white/5 px-3 py-2 text-center">
                      <p className="text-[10px] uppercase text-slate-500">Waiting</p>
                      <p className="text-lg font-bold text-accent-cyan">{queueStats.pending}</p>
                    </div>
                    <div className="rounded-xl bg-white/5 px-3 py-2 text-center">
                      <p className="text-[10px] uppercase text-slate-500">Max lines</p>
                      <p className="text-lg font-bold text-white">{queueStats.maxConcurrent}</p>
                    </div>
                    <div className="rounded-xl bg-white/5 px-3 py-2 text-center">
                      <p className="text-[10px] uppercase text-slate-500">Slots free</p>
                      <p className="text-lg font-bold text-accent-violet">{queueStats.slotsAvailable}</p>
                    </div>
                  </div>
                )}
                <label className="mb-3 flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={queueEnabled}
                    onChange={(e) => setQueueEnabled(e.target.checked)}
                    className="rounded border-white/20"
                  />
                  Enable call queue (throttle concurrent calls)
                </label>
                <label className="mb-1 block text-xs text-slate-500">Max concurrent calls (1–50)</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={maxConcurrent}
                  onChange={(e) => setMaxConcurrent(Math.max(1, Math.min(50, Number(e.target.value) || 5)))}
                  className="input-field mb-4 w-32 font-mono text-sm"
                />
                <button onClick={handleSaveQueue} disabled={queueSaving} className="btn-primary text-xs">
                  {queueSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Save queue settings
                </button>
              </div>
            )}

            {config?.connected && (
              <div className="glass-card border-accent-cyan/20 p-6">
                <h3 className="mb-2 flex items-center gap-2 font-bold text-white">
                  <Zap className="h-4 w-4 text-accent-cyan" />
                  Tag → Auto Call
                </h3>
                <p className="mb-4 text-xs text-slate-500">
                  When a GHL contact gets your trigger tag, Lagnaa reads <strong>name, DOB and postcode</strong> from the
                  contact, then Mia verifies the name at the start and DOB/postcode later in the call.
                </p>
                <label className="mb-3 flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={autoCallOnTag}
                    onChange={(e) => setAutoCallOnTag(e.target.checked)}
                    className="rounded border-white/20"
                  />
                  Enable auto-call when tag is added
                </label>
                <label className="mb-1 block text-xs text-slate-500">Trigger tag (exact match)</label>
                <input
                  value={callTriggerTag}
                  onChange={(e) => setCallTriggerTag(e.target.value)}
                  placeholder="lagnaa-call"
                  className="input-field mb-4 font-mono text-sm"
                />

                <p className="mb-2 text-xs font-semibold text-slate-400">GHL workflow webhook URL</p>
                {!config.webhookReady || !config.inboundWebhookUrl ? (
                  <p className="flex items-center gap-2 text-xs text-amber-400">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Start ngrok (NGROK_AUTHTOKEN) so GHL can reach your machine.
                  </p>
                ) : (
                  <div className="rounded-xl border border-white/5 bg-black/20 p-3">
                    <code className="block break-all text-xs text-accent-cyan">{config.inboundWebhookUrl}</code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(config.inboundWebhookUrl!);
                        setMessage('Webhook URL copied');
                      }}
                      className="btn-secondary mt-2 text-xs"
                    >
                      <Copy className="h-3 w-3" /> Copy URL
                    </button>
                  </div>
                )}

                <div className="mt-4 rounded-xl bg-white/[0.03] p-4 text-xs text-slate-500">
                  <p className="mb-2 font-semibold text-slate-400">Setup in GoHighLevel</p>
                  <ol className="list-decimal space-y-1 pl-4">
                    <li>
                      Create 5 custom fields: call outcome, verification outcome, summary, transcript (long text), recording URL.
                    </li>
                    <li>Workflow: Trigger <strong>Contact Tag Added</strong> → filter tag = {callTriggerTag || 'lagnaa-call'}.</li>
                    <li>Action: <strong>Webhook</strong> → POST to URL above with body including contact id and tags.</li>
                    <li>Example JSON: {'{'} &quot;contact_id&quot;: &quot;{'{{contact.id}}'}&quot;, &quot;tags&quot;: [&quot;{callTriggerTag || 'lagnaa-call'}&quot;] {'}'}</li>
                  </ol>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <input
                    value={testContactId}
                    onChange={(e) => setTestContactId(e.target.value)}
                    placeholder="GHL contact ID (test call)"
                    className="input-field min-w-[200px] flex-1 font-mono text-xs"
                  />
                  <button onClick={handleTestCall} disabled={saving || !testContactId} className="btn-secondary text-xs">
                    <Phone className="h-3.5 w-3.5" /> Test call
                  </button>
                  <button onClick={handleSave} disabled={saving} className="btn-primary text-xs">
                    Save automation
                  </button>
                </div>
              </div>
            )}

            <div
              className={`glass-card p-6 ${config?.connected ? 'border-accent-emerald/30' : 'border-amber-500/20'}`}
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`rounded-xl p-2.5 ${config?.connected ? 'bg-accent-emerald/15' : 'bg-amber-500/15'}`}
                  >
                    <Plug className={`h-5 w-5 ${config?.connected ? 'text-accent-emerald' : 'text-amber-400'}`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">GoHighLevel API</h3>
                    <p className="text-xs text-slate-500">
                      {config?.connected
                        ? `${config.locationName ?? 'Location'} · ${config.apiKeyMasked}`
                        : 'Private Integration Token + Location ID'}
                    </p>
                  </div>
                </div>
                {config?.connected && (
                  <button onClick={handleDisconnect} disabled={connecting} className="btn-secondary text-xs">
                    <Unplug className="h-3.5 w-3.5" /> Disconnect
                  </button>
                )}
              </div>

              {config?.connected ? (
                <div className="space-y-2 rounded-xl bg-white/5 p-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Location ID</span>
                    <span className="font-mono text-xs text-slate-300">{config.locationId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Connected</span>
                    <span className="text-slate-200">
                      {config.connectedAt ? new Date(config.connectedAt).toLocaleString() : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Last outbound sync</span>
                    <span className="text-slate-200">
                      {config.lastOutboundSync ? new Date(config.lastOutboundSync).toLocaleString() : '—'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-slate-400">
                    Create a{' '}
                    <a
                      href="https://marketplace.gohighlevel.com/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent-cyan hover:underline"
                    >
                      Private Integration
                    </a>{' '}
                    in GHL with scopes: <code className="text-xs">contacts.readonly</code>,{' '}
                    <code className="text-xs">contacts.write</code>, <code className="text-xs">locations.readonly</code>.
                  </p>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Private Integration Token (pit-...)"
                    className="input-field font-mono text-sm"
                  />
                  <input
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                    placeholder="Location ID"
                    className="input-field font-mono text-sm"
                  />
                  <button onClick={handleConnect} disabled={connecting} className="btn-primary text-sm">
                    {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
                    Connect GoHighLevel
                  </button>
                </div>
              )}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="glass-card p-6">
                <h3 className="mb-4 font-bold text-white">After call — 5 GHL fields</h3>
                <p className="mb-4 text-xs text-slate-500">
                  When a voice call ends, Lagnaa writes these five custom fields on the matching GHL contact. Create
                  them in GHL as text / long-text fields using the keys below.
                </p>
                <label className="mb-3 flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={autoSync}
                    onChange={(e) => setAutoSync(e.target.checked)}
                    className="rounded border-white/20"
                  />
                  Auto-push outcomes on session end
                </label>
                <label className="mb-4 flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={addTags}
                    onChange={(e) => setAddTags(e.target.checked)}
                    className="rounded border-white/20"
                  />
                  Add tags (e.g. lagnaa-consent-given)
                </label>
                <div className="mb-4 space-y-3">
                  {CALL_SYNC_FIELDS.map(({ key, label, hint }) => (
                    <div key={key}>
                      <label className="mb-1 block text-xs text-slate-500">{label}</label>
                      <input
                        value={fieldMapping[key]}
                        onChange={(e) => setFieldMapping((m) => ({ ...m, [key]: e.target.value }))}
                        className="input-field font-mono text-sm"
                        placeholder={hint}
                      />
                    </div>
                  ))}
                </div>
                <p className="mb-2 text-[10px] font-semibold uppercase text-slate-600">Read from GHL before call</p>
                <div className="space-y-3">
                  {INBOUND_FIELDS.map(({ key, label, hint, note }) => (
                    <div key={key}>
                      <label className="mb-1 block text-xs text-slate-500">{label}</label>
                      <input
                        value={fieldMapping[key]}
                        onChange={(e) => setFieldMapping((m) => ({ ...m, [key]: e.target.value }))}
                        className="input-field font-mono text-sm"
                        placeholder={hint}
                      />
                      {note && <p className="mt-0.5 text-[10px] text-slate-600">{note}</p>}
                    </div>
                  ))}
                </div>
                <button onClick={handleSave} disabled={saving || !config?.connected} className="btn-primary mt-4 text-xs">
                  Save sync settings
                </button>
              </div>

              <div className="glass-card p-6">
                <h3 className="mb-4 font-bold text-white">Inbound — GHL → Lagnaa</h3>
                <p className="mb-4 text-xs text-slate-500">
                  Pull contacts into Lagnaa for voice calls or WhatsApp / email campaigns. Optionally filter by GHL tag.
                </p>
                <label className="mb-1 block text-xs text-slate-500">Tag filter (optional)</label>
                <input
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  placeholder="e.g. plevin-leads"
                  className="input-field mb-3 font-mono text-sm"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleImport}
                    disabled={importing || !config?.connected}
                    className="btn-primary text-xs"
                  >
                    {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    Import contacts
                  </button>
                  {imported.length > 0 && (
                    <button onClick={exportCsv} className="btn-secondary text-xs">
                      Export CSV ({imported.length})
                    </button>
                  )}
                </div>
                {imported.length > 0 && (
                  <div className="mt-4 max-h-48 overflow-y-auto rounded-xl border border-white/5">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/5 text-[10px] uppercase text-slate-500">
                          <th className="px-3 py-2">Name</th>
                          <th className="px-3 py-2">Phone</th>
                          <th className="px-3 py-2">Email</th>
                        </tr>
                      </thead>
                      <tbody>
                        {imported.slice(0, 20).map((c) => (
                          <tr key={c.id} className="border-b border-white/5">
                            <td className="px-3 py-2 text-white">{c.name}</td>
                            <td className="px-3 py-2 font-mono text-slate-400">{c.phone || '—'}</td>
                            <td className="px-3 py-2 text-slate-400">{c.email || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {imported.length > 20 && (
                      <p className="px-3 py-2 text-[10px] text-slate-600">+{imported.length - 20} more</p>
                    )}
                  </div>
                )}
                <p className="mt-3 text-[10px] text-slate-600">
                  Use imported contacts in{' '}
                  <Link to="/agents" className="text-accent-cyan hover:underline">
                    Agents
                  </Link>
                  ,{' '}
                  <Link to="/whatsapp" className="text-accent-cyan hover:underline">
                    WhatsApp
                  </Link>
                  , or{' '}
                  <Link to="/email" className="text-accent-cyan hover:underline">
                    Email
                  </Link>{' '}
                  campaigns.
                </p>
              </div>
            </div>

            {config && config.syncLog.length > 0 && (
              <div className="glass-card p-6">
                <h3 className="mb-4 font-bold text-white">Sync Log</h3>
                <div className="space-y-2">
                  {config.syncLog.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        {entry.direction === 'inbound' ? (
                          <ArrowDownToLine className="h-3.5 w-3.5 text-accent-cyan" />
                        ) : (
                          <ArrowUpFromLine className="h-3.5 w-3.5 text-accent-emerald" />
                        )}
                        <span className="font-medium text-white">{entry.action}</span>
                        {entry.contactName && <span className="text-slate-500">{entry.contactName}</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-500">{entry.message}</span>
                        <span
                          className={
                            entry.status === 'success'
                              ? 'text-accent-emerald'
                              : entry.status === 'skipped'
                                ? 'text-amber-400'
                                : 'text-red-400'
                          }
                        >
                          {entry.status}
                        </span>
                        <span className="text-slate-600">{new Date(entry.at).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <p className="flex items-center gap-2 text-sm text-red-400">
                <AlertCircle className="h-4 w-4" />
                {error}
              </p>
            )}
            {message && (
              <p className="flex items-center gap-2 text-sm text-accent-emerald">
                <CheckCircle2 className="h-4 w-4" />
                {message}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}