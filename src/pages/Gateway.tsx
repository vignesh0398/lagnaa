import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Mic,
  Plug,
  Sparkles,
  Unplug,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import {
  connectGroq,
  connectTwilio,
  disconnectTwilio,
  getAiVoiceStatus,
  getTwilioStatus,
  setWebhookUrl,
  testWebhook,
  type AiVoiceStatus,
  type TwilioStatus,
} from '../api/twilio';
import { getGhlConfig, type GhlConfig } from '../api/ghl';

export function Gateway() {
  const [twilioStatus, setTwilioStatus] = useState<TwilioStatus | null>(null);
  const [ghlStatus, setGhlStatus] = useState<GhlConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [accountSid, setAccountSid] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const [aiStatus, setAiStatus] = useState<AiVoiceStatus | null>(null);
  const [groqKey, setGroqKey] = useState('');
  const [connectingGroq, setConnectingGroq] = useState(false);
  const [webhookInput, setWebhookInput] = useState('');
  const [webhookTestMsg, setWebhookTestMsg] = useState('');
  const [webhookTesting, setWebhookTesting] = useState(false);
  const [savingWebhook, setSavingWebhook] = useState(false);

  const refreshStatus = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [status, ai, ghl] = await Promise.all([getTwilioStatus(), getAiVoiceStatus(), getGhlConfig().catch(() => null)]);
      setTwilioStatus(status);
      setAiStatus(ai);
      setGhlStatus(ghl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check Twilio status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const handleConnect = async () => {
    setConnecting(true);
    setError('');
    setSuccess('');
    try {
      const result = await connectTwilio({ accountSid, authToken, phoneNumber: phoneNumber || undefined });
      setSuccess(result.message);
      setAuthToken('');
      await refreshStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setConnecting(true);
    setError('');
    try {
      await disconnectTwilio();
      setSuccess('Twilio disconnected.');
      setTwilioStatus({ connected: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Disconnect failed');
    } finally {
      setConnecting(false);
    }
  };

  const handleSaveWebhook = async () => {
    if (!webhookInput.trim()) return;
    setSavingWebhook(true);
    setWebhookTestMsg('');
    setError('');
    try {
      const result = await setWebhookUrl(webhookInput.trim());
      setSuccess(result.message);
      setWebhookInput('');
      await refreshStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save webhook URL');
    } finally {
      setSavingWebhook(false);
    }
  };

  const handleTestWebhook = async () => {
    setWebhookTesting(true);
    setWebhookTestMsg('');
    try {
      const result = await testWebhook();
      setWebhookTestMsg(result.message);
    } catch (err) {
      setWebhookTestMsg(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setWebhookTesting(false);
    }
  };

  const handleConnectGroq = async () => {
    setConnectingGroq(true);
    setError('');
    try {
      const result = await connectGroq(groqKey);
      setSuccess(result.message);
      setGroqKey('');
      await refreshStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Groq connection failed');
    } finally {
      setConnectingGroq(false);
    }
  };

  return (
    <div>
      <Header title="Connections" subtitle="Integrations Hub" onRefresh={refreshStatus} />

      <div className="space-y-6 p-8">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6">
          <h3 className="mb-2 font-bold text-white">Data Pipeline</h3>
          <p className="mb-6 text-sm text-slate-400">
            Contacts flow from GoHighLevel → Twilio places calls → Lagnaa runs AI → results sync back to GHL custom fields.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 md:gap-6">
            {['GoHighLevel', 'Twilio', 'Lagnaa', 'GoHighLevel'].map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${
                    i === 2
                      ? 'bg-gradient-brand text-white shadow-glow'
                      : i === 1 && twilioStatus?.connected
                        ? 'border border-accent-emerald/40 bg-accent-emerald/10 text-accent-emerald'
                        : 'border border-white/10 bg-white/5 text-slate-300'
                  }`}
                >
                  {step}
                </div>
                {i < 3 && <ArrowRight className="h-4 w-4 text-slate-600" />}
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className={`glass-card p-6 ${twilioStatus?.connected ? 'border-accent-emerald/30' : 'border-amber-500/20'}`}
        >
          <div className="mb-4 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`rounded-xl p-2.5 ${twilioStatus?.connected ? 'bg-accent-emerald/15' : 'bg-amber-500/15'}`}>
                <Plug className={`h-5 w-5 ${twilioStatus?.connected ? 'text-accent-emerald' : 'text-amber-400'}`} />
              </div>
              <div>
                <h3 className="font-bold text-white">Twilio</h3>
                <div className="mt-0.5 flex items-center gap-1.5">
                  {loading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                  ) : twilioStatus?.connected ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-accent-emerald" />
                      <span className="text-xs font-medium text-accent-emerald">Connected</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                      <span className="text-xs font-medium text-amber-400">Not connected</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            {twilioStatus?.connected && (
              <button onClick={handleDisconnect} disabled={connecting} className="btn-secondary text-xs">
                <Unplug className="h-3.5 w-3.5" />
                Disconnect
              </button>
            )}
          </div>

          {twilioStatus?.connected ? (
            <div className="space-y-2 rounded-xl bg-white/5 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Account</span>
                <span className="text-slate-200">{twilioStatus.accountName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Account SID</span>
                <span className="font-mono text-xs text-slate-300">{twilioStatus.accountSid}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Phone number</span>
                <span className="font-mono text-accent-cyan">{twilioStatus.phoneNumber || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Numbers on account</span>
                <span className="text-slate-200">{twilioStatus.phoneCount}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">
                Enter your Twilio credentials from the{' '}
                <a
                  href="https://console.twilio.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent-cyan hover:underline"
                >
                  Twilio Console
                </a>
                . Credentials are stored locally on your server only.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">
                    Account SID
                  </label>
                  <input
                    type="text"
                    value={accountSid}
                    onChange={(e) => setAccountSid(e.target.value)}
                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="input-field font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">
                    Auth Token
                  </label>
                  <input
                    type="password"
                    value={authToken}
                    onChange={(e) => setAuthToken(e.target.value)}
                    placeholder="Your auth token"
                    className="input-field"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">
                    Default Phone Number (optional)
                  </label>
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1234567890 — auto-detected if left blank"
                    className="input-field font-mono text-xs"
                  />
                </div>
              </div>
              <button onClick={handleConnect} disabled={connecting || !accountSid || !authToken} className="btn-primary">
                {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
                Connect Twilio
              </button>
            </div>
          )}

          {error && (
            <p className="mt-3 flex items-center gap-2 text-sm text-red-400">
              <AlertCircle className="h-4 w-4" />
              {error}
            </p>
          )}
          {success && (
            <p className="mt-3 flex items-center gap-2 text-sm text-accent-emerald">
              <CheckCircle2 className="h-4 w-4" />
              {success}
            </p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card border-accent-violet/20 p-6"
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-xl bg-accent-violet/15 p-2.5">
              <Sparkles className="h-5 w-5 text-accent-violet" />
            </div>
            <div>
              <h3 className="font-bold text-white">AI Voice Engine</h3>
              <p className="text-xs text-slate-500">Deepgram + ElevenLabs Emilia (young UK) + Groq — natural emotional delivery</p>
            </div>
          </div>

          {aiStatus && (
            <div className="mb-4 space-y-2 rounded-xl bg-white/5 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Speech (STT)</span>
                <span className="text-slate-300">{aiStatus.speechEngine}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Voice (TTS)</span>
                <span className="text-slate-300">{aiStatus.voiceEngine}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">AI Brain</span>
                <span className={aiStatus.groqConnected ? 'text-accent-emerald' : 'text-amber-400'}>
                  {aiStatus.groqMode}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Webhook</span>
                <span className={aiStatus.webhookReady ? 'text-accent-emerald' : 'text-red-400'}>
                  {aiStatus.webhookReady ? 'Ready' : 'Not ready — restart API server'}
                </span>
              </div>
              {aiStatus.webhookUrl && (
                <p className="break-all font-mono text-[10px] text-slate-600">{aiStatus.webhookUrl}</p>
              )}
              {aiStatus.relayUrl && (
                <p className="break-all font-mono text-[10px] text-slate-600">Relay: {aiStatus.relayUrl}</p>
              )}
              <p className="text-xs text-amber-400/90">
                ConversationRelay needs a public HTTPS + WSS tunnel. Enable the AI/ML addendum in Twilio Console, then use ngrok (NGROK_AUTHTOKEN in .env) or paste your public URL below.
              </p>
              <div className="flex justify-between">
                <span className="text-slate-500">Cost</span>
                <span className="text-accent-cyan">{aiStatus.cost}</span>
              </div>
            </div>
          )}

          <div className="mb-4 space-y-3 rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Webhook URL (for AI voice)</p>
            <input
              type="url"
              value={webhookInput}
              onChange={(e) => setWebhookInput(e.target.value)}
              placeholder="https://xxxx.ngrok-free.app"
              className="input-field font-mono text-xs"
            />
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleSaveWebhook}
                disabled={savingWebhook || !webhookInput.trim()}
                className="btn-secondary text-xs"
              >
                {savingWebhook ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plug className="h-3.5 w-3.5" />}
                Save Webhook URL
              </button>
              <button onClick={handleTestWebhook} disabled={webhookTesting} className="btn-secondary text-xs">
                {webhookTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                Test Tunnel
              </button>
            </div>
            {webhookTestMsg && (
              <p className={`text-xs ${webhookTestMsg.includes('reachable') ? 'text-accent-emerald' : 'text-amber-400'}`}>
                {webhookTestMsg}
              </p>
            )}
          </div>

          {!aiStatus?.groqConnected && (
            <div className="space-y-3">
              <p className="text-sm text-slate-400">
                Optional: add a free{' '}
                <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-accent-cyan hover:underline">
                  Groq API key
                </a>{' '}
                for smarter replies. Without it, built-in responses still work for demo.
              </p>
              <input
                type="password"
                value={groqKey}
                onChange={(e) => setGroqKey(e.target.value)}
                placeholder="gsk_xxxxxxxx (optional, free tier)"
                className="input-field font-mono text-xs"
              />
              <button
                onClick={handleConnectGroq}
                disabled={connectingGroq || !groqKey.startsWith('gsk_')}
                className="btn-secondary"
              >
                {connectingGroq ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
                Enable Smarter AI (Groq)
              </button>
            </div>
          )}

          {aiStatus?.groqConnected && (
            <p className="flex items-center gap-2 text-sm text-accent-emerald">
              <CheckCircle2 className="h-4 w-4" />
              Groq connected — full conversational AI enabled
            </p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className={`glass-card p-6 ${ghlStatus?.connected ? 'border-accent-emerald/30' : ''}`}
        >
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h3 className="font-bold text-white">GoHighLevel</h3>
              <p className="mt-1 text-sm text-slate-400">
                {ghlStatus?.connected
                  ? `Synced with ${ghlStatus.locationName ?? 'your location'} — ${ghlStatus.outcomesPushed} outcomes pushed`
                  : 'Sync contacts in and push call outcomes to custom fields.'}
              </p>
            </div>
            {ghlStatus?.connected ? (
              <CheckCircle2 className="h-5 w-5 text-accent-emerald" />
            ) : (
              <AlertCircle className="h-5 w-5 text-slate-500" />
            )}
          </div>
          <Link to="/ghl" className="btn-secondary text-xs">
            {ghlStatus?.connected ? 'Manage GHL Sync' : 'Connect GoHighLevel'}
          </Link>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 opacity-50">
          <h3 className="mb-2 font-bold text-white">ElevenLabs / OpenAI</h3>
          <p className="text-sm text-slate-400">Optional upgrades for premium voice — not required for current setup.</p>
        </motion.div>
      </div>
    </div>
  );
}