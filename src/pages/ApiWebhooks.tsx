import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Key,
  Loader2,
  RefreshCw,
  Send,
  Webhook,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import {
  getIntegrationsConfig,
  regenerateApiKey,
  revealApiKey,
  testOutboundWebhook,
  updateIntegrationsConfig,
  WEBHOOK_EVENTS,
  type IntegrationsConfig,
  type WebhookEvent,
} from '../api/integrations';

export function ApiWebhooks() {
  const [config, setConfig] = useState<IntegrationsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const c = await getIntegrationsConfig();
      setConfig(c);
      setWebhookUrl(c.outboundWebhookUrl);
      setEvents(c.enabledEvents);
    } catch {
      setConfig(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setMessage('Copied to clipboard');
    setTimeout(() => setMessage(''), 2000);
  };

  const handleRevealKey = async () => {
    const { apiKey: key } = await revealApiKey();
    setApiKey(key);
    setShowKey(true);
  };

  const handleRegenerate = async () => {
    if (!window.confirm('Regenerate API key? Existing integrations will stop working until updated.')) return;
    const data = await regenerateApiKey();
    setApiKey(data.apiKey);
    setShowKey(true);
    await load();
    setMessage('New API key generated');
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await updateIntegrationsConfig({ outboundWebhookUrl: webhookUrl, enabledEvents: events });
      await load();
      setMessage('Settings saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setSaving(true);
    const result = await testOutboundWebhook();
    setMessage(result.ok ? `✓ ${result.message}` : `✗ ${result.message}`);
    await load();
    setSaving(false);
  };

  const toggleEvent = (id: WebhookEvent) => {
    setEvents((prev) => (prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]));
  };

  return (
    <div>
      <Header
        title="API & Webhooks"
        subtitle="Integrations"
        onRefresh={load}
        actions={
          <Link to="/analytics" className="btn-secondary text-xs">
            Analytics Hub
          </Link>
        }
      />

      <div className="space-y-6 p-8">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-accent-violet" />
          </div>
        ) : !config ? (
          <p className="text-center text-slate-500">Failed to load integration settings.</p>
        ) : (
          <>
            <div className="rounded-2xl border border-accent-violet/20 bg-accent-violet/5 px-5 py-4">
              <p className="text-sm text-accent-violet/90">
                Use the REST API with your key, or send outbound webhooks to your CRM when consent is given or sessions complete.
              </p>
            </div>

            <div className="glass-card p-6">
              <div className="mb-4 flex items-center gap-2">
                <Key className="h-5 w-5 text-accent-cyan" />
                <h3 className="font-bold text-white">API Key</h3>
              </div>
              <p className="mb-3 text-xs text-slate-500">{config.authHeader}</p>
              <div className="flex flex-wrap items-center gap-2">
                <code className="rounded-lg bg-black/30 px-3 py-2 font-mono text-sm text-accent-cyan">
                  {showKey ? apiKey : config.apiKeyMasked}
                </code>
                <button onClick={handleRevealKey} className="btn-secondary text-xs">Reveal</button>
                <button onClick={() => copyText(showKey ? apiKey : '')} disabled={!showKey} className="btn-secondary text-xs">
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button onClick={handleRegenerate} className="btn-secondary text-xs text-amber-400">
                  <RefreshCw className="h-3.5 w-3.5" /> Regenerate
                </button>
              </div>
              <p className="mt-2 text-[10px] text-slate-600">Created {new Date(config.apiKeyCreatedAt).toLocaleString()}</p>
            </div>

            <div className="glass-card p-6">
              <div className="mb-4 flex items-center gap-2">
                <Webhook className="h-5 w-5 text-accent-emerald" />
                <h3 className="font-bold text-white">Outbound Webhook</h3>
              </div>
              <p className="mb-3 text-xs text-slate-500">
                Lagnaa POSTs JSON to your URL when events fire. Header: <code>X-Lagnaa-Signature</code>
              </p>
              <input
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://your-crm.com/webhooks/lagnaa"
                className="input-field mb-3 font-mono text-sm"
              />
              <div className="mb-4 flex flex-wrap gap-2">
                {WEBHOOK_EVENTS.map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => toggleEvent(ev.id)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                      events.includes(ev.id)
                        ? 'bg-accent-emerald/20 text-accent-emerald'
                        : 'bg-white/5 text-slate-500 hover:bg-white/10'
                    }`}
                  >
                    {ev.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={handleSave} disabled={saving} className="btn-primary text-xs">Save</button>
                <button onClick={handleTest} disabled={saving || !webhookUrl} className="btn-secondary text-xs">
                  <Send className="h-3.5 w-3.5" /> Test Webhook
                </button>
              </div>
            </div>

            <div className="glass-card p-6">
              <h3 className="mb-4 font-bold text-white">Inbound Webhooks (Twilio / Meta / Email)</h3>
              {!config.webhookReady ? (
                <div className="flex items-center gap-2 text-sm text-amber-400">
                  <AlertCircle className="h-4 w-4" />
                  Start ngrok or set PUBLIC_WEBHOOK_URL — see Connections.
                </div>
              ) : config.inboundWebhooks.length === 0 ? (
                <p className="text-sm text-slate-500">No public URL available.</p>
              ) : (
                <div className="space-y-3">
                  {config.inboundWebhooks.map((wh) => (
                    <div key={wh.name} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-white">{wh.name}</p>
                        <span className="text-[10px] text-slate-500">{wh.provider}</span>
                      </div>
                      <code className="mt-1 block break-all text-xs text-accent-cyan">{wh.url}</code>
                      <button onClick={() => copyText(wh.url)} className="btn-secondary mt-2 text-xs">
                        <Copy className="h-3 w-3" /> Copy
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="glass-card overflow-hidden p-6">
              <h3 className="mb-4 font-bold text-white">REST API Endpoints</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/5 text-[10px] uppercase text-slate-500">
                      <th className="px-3 py-2">Method</th>
                      <th className="px-3 py-2">Path</th>
                      <th className="px-3 py-2">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {config.endpoints.map((ep) => (
                      <tr key={ep.path + ep.method} className="border-b border-white/5">
                        <td className="px-3 py-2">
                          <span className={`rounded px-1.5 py-0.5 font-mono font-bold ${
                            ep.method === 'GET' ? 'bg-accent-cyan/15 text-accent-cyan' : 'bg-accent-violet/15 text-accent-violet'
                          }`}>
                            {ep.method}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-300">{ep.path}</td>
                        <td className="px-3 py-2 text-slate-500">
                          {ep.description}
                          {ep.auth && <span className="ml-1 text-accent-amber">· auth</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {config.deliveries.length > 0 && (
              <div className="glass-card p-6">
                <h3 className="mb-4 font-bold text-white">Recent Deliveries</h3>
                <div className="space-y-2">
                  {config.deliveries.map((d) => (
                    <div key={d.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-xs">
                      <div>
                        <span className="font-medium text-white">{d.event}</span>
                        <span className="ml-2 text-slate-500">{new Date(d.at).toLocaleString()}</span>
                      </div>
                      <span className={d.status === 'error' || (typeof d.status === 'number' && d.status >= 400) ? 'text-red-400' : 'text-accent-emerald'}>
                        {d.status === 'error' ? 'Failed' : `HTTP ${d.status}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <p className="flex items-center gap-2 text-sm text-red-400">
                <AlertCircle className="h-4 w-4" />{error}
              </p>
            )}
            {message && (
              <p className="flex items-center gap-2 text-sm text-accent-emerald">
                <CheckCircle2 className="h-4 w-4" />{message}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}