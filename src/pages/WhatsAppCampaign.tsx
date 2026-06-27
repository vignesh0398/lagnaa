import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Loader2,
  MessageCircle,
  Plus,
  Send,
  Trash2,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { StatCard } from '../components/ui/StatCard';
import {
  addRecipients,
  createCampaign,
  deleteCampaign,
  getCampaigns,
  getWhatsAppStatus,
  parseRecipientCsv,
  sendCampaign,
  testWhatsAppConnection,
  updateCampaign,
  updateWhatsAppConfig,
  type WhatsAppCampaign,
  type WhatsAppProvider,
  type WhatsAppStatus,
} from '../api/whatsapp';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-slate-500/15 text-slate-400',
  sent: 'bg-accent-cyan/15 text-accent-cyan',
  replied: 'bg-accent-violet/15 text-accent-violet',
  in_flow: 'bg-amber-500/15 text-amber-400',
  completed: 'bg-accent-emerald/15 text-accent-emerald',
  failed: 'bg-red-500/15 text-red-400',
  opted_out: 'bg-red-500/15 text-red-400',
};

export function WhatsAppCampaignPage() {
  const [campaigns, setCampaigns] = useState<WhatsAppCampaign[]>([]);
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [selected, setSelected] = useState<WhatsAppCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showAddRecipients, setShowAddRecipients] = useState(false);
  const [recipientCsv, setRecipientCsv] = useState('');
  const [editingTemplate, setEditingTemplate] = useState(false);
  const [templateDraft, setTemplateDraft] = useState('');

  const [provider, setProvider] = useState<WhatsAppProvider>('twilio');
  const [waNumber, setWaNumber] = useState('');
  const [contentSid, setContentSid] = useState('');
  const [metaPhoneId, setMetaPhoneId] = useState('');
  const [metaToken, setMetaToken] = useState('');
  const [metaBusinessId, setMetaBusinessId] = useState('');
  const [metaVerifyToken, setMetaVerifyToken] = useState('');
  const [metaDisplayPhone, setMetaDisplayPhone] = useState('');
  const [metaTemplateName, setMetaTemplateName] = useState('');
  const [metaTemplateLang, setMetaTemplateLang] = useState('en');
  const [testResult, setTestResult] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [campData, waStatus] = await Promise.all([getCampaigns(), getWhatsAppStatus()]);
      setCampaigns(campData.campaigns);
      setStatus(waStatus);
      setProvider(waStatus.provider);
      setWaNumber(waStatus.twilio.whatsappNumber?.replace('whatsapp:', '') ?? '');
      setContentSid(waStatus.twilio.whatsappContentSid ?? '');
      setMetaPhoneId(waStatus.meta.phoneNumberId ?? '');
      setMetaBusinessId(waStatus.meta.businessAccountId ?? '');
      setMetaVerifyToken(waStatus.meta.verifyToken ?? 'datacrew_wa_verify');
      setMetaDisplayPhone(waStatus.meta.displayPhoneNumber ?? '');
      setMetaTemplateName(waStatus.meta.templateName ?? '');
      setMetaTemplateLang(waStatus.meta.templateLanguage ?? 'en');
      if (selected) {
        const fresh = campData.campaigns.find((c) => c.id === selected.id);
        if (fresh) setSelected(fresh);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [selected]);

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    const name = window.prompt('Campaign name:', 'Justizia Outreach');
    if (!name?.trim()) return;
    setSaving(true);
    try {
      const { campaign } = await createCampaign(name.trim());
      setSelected(campaign);
      setTemplateDraft(campaign.template);
      await load();
      setSuccess(`Campaign "${campaign.name}" created`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const { campaign } = await updateCampaign(selected.id, { template: templateDraft });
      setSelected(campaign);
      setEditingTemplate(false);
      await load();
      setSuccess('Template saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleAddRecipients = async () => {
    if (!selected) return;
    const rows = parseRecipientCsv(recipientCsv);
    if (rows.length === 0) {
      setError('Add at least one row: phone, name, DOB (optional), postcode (optional)');
      return;
    }
    setSaving(true);
    try {
      const { campaign } = await addRecipients(selected.id, rows);
      setSelected(campaign);
      setRecipientCsv('');
      setShowAddRecipients(false);
      await load();
      setSuccess(`Added ${rows.length} recipient(s)`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add recipients');
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    if (!selected) return;
    if (!window.confirm(`Send WhatsApp template to ${selected.recipients.filter((r) => r.status === 'pending').length} pending recipients?`)) {
      return;
    }
    setSaving(true);
    setError('');
    try {
      const result = await sendCampaign(selected.id);
      setSelected(result.campaign);
      await load();
      setSuccess(`Sent to ${result.sent} recipient(s)${result.failed ? `, ${result.failed} failed` : ''}. Replies will trigger the consent workflow.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWaConfig = async () => {
    setSaving(true);
    setTestResult('');
    try {
      const updated = await updateWhatsAppConfig({
        provider,
        twilio: {
          whatsappNumber: waNumber || undefined,
          whatsappContentSid: contentSid || undefined,
        },
        meta: {
          phoneNumberId: metaPhoneId || undefined,
          accessToken: metaToken || undefined,
          businessAccountId: metaBusinessId || undefined,
          verifyToken: metaVerifyToken || undefined,
          displayPhoneNumber: metaDisplayPhone || undefined,
          templateName: metaTemplateName || undefined,
          templateLanguage: metaTemplateLang || 'en',
        },
      });
      setStatus(updated);
      setMetaToken('');
      await load();
      setSuccess(`Connected via ${provider === 'twilio' ? 'Twilio' : 'WhatsApp Business (Meta)'}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setSaving(true);
    setTestResult('');
    try {
      const result = await testWhatsAppConnection(provider);
      setTestResult(result.ok ? `✓ ${result.message}` : `✗ ${result.message}`);
    } catch (err) {
      setTestResult(`✗ ${err instanceof Error ? err.message : 'Test failed'}`);
    } finally {
      setSaving(false);
    }
  };

  const totalConsent = campaigns.reduce((s, c) => s + c.consentCount, 0);
  const totalSent = campaigns.reduce((s, c) => s + c.sentCount, 0);

  return (
    <div>
      <Header
        title="WhatsApp Campaign"
        subtitle="Multi-channel consent workflow"
        onRefresh={load}
        actions={
          <Link to="/whatsapp/chats" className="btn-secondary text-xs">
            <MessageCircle className="h-4 w-4" />
            Chat History
          </Link>
        }
      />

      <div className="space-y-6 p-8">
        <div className="rounded-2xl border border-accent-emerald/20 bg-accent-emerald/5 px-5 py-4">
          <p className="text-sm text-accent-emerald/90">
            Send a template message to multiple customers, then Mia runs the <strong>same consent workflow</strong> as voice
            calls — identity check, DOB, postcode, and legal consent — all over WhatsApp chat.
          </p>
        </div>

        {status && !status.configured && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {status.provider === 'twilio' ? (
              <>
                Connect Twilio in <Link to="/gateway" className="underline">Connections</Link>, then configure WhatsApp below.
              </>
            ) : (
              <>Complete WhatsApp Business (Meta) credentials below to enable campaigns.</>
            )}
          </div>
        )}

        {status && !status.webhookReady && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Webhook not ready — start ngrok (or set PUBLIC_WEBHOOK_URL) so inbound WhatsApp replies are handled.
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-accent-cyan" />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard label="Campaigns" value={campaigns.length} icon={MessageCircle} accent="emerald" />
                <StatCard label="Messages Sent" value={totalSent} icon={Send} accent="cyan" />
                <StatCard label="Consent Given" value={totalConsent} icon={CheckCircle2} accent="violet" />
                <StatCard
                  label="Webhook"
                  value={status?.webhookReady ? 'Ready' : 'Offline'}
                  icon={Zap}
                  accent={status?.webhookReady ? 'emerald' : 'violet'}
                />
              </div>
              <button onClick={handleCreate} disabled={saving} className="btn-primary text-xs">
                <Plus className="h-4 w-4" />
                New Campaign
              </button>
            </div>

            <div className="glass-card p-5">
              <h3 className="mb-1 text-sm font-bold text-white">Connect WhatsApp</h3>
              <p className="mb-4 text-xs text-slate-500">Choose how to send messages — switch anytime.</p>

              <div className="mb-5 grid gap-3 md:grid-cols-2">
                {status?.providers.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setProvider(p.id)}
                    className={`rounded-xl border p-4 text-left transition-all ${
                      provider === p.id
                        ? 'border-accent-emerald/40 bg-accent-emerald/10'
                        : 'border-white/5 bg-white/[0.02] hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-white">{p.label}</span>
                      {p.connected ? (
                        <span className="rounded-full bg-accent-emerald/15 px-2 py-0.5 text-[10px] font-bold text-accent-emerald">
                          Ready
                        </span>
                      ) : (
                        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-500">Setup</span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{p.description}</p>
                  </button>
                ))}
              </div>

              {provider === 'twilio' && (
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">WhatsApp Sender Number</label>
                    <input
                      value={waNumber}
                      onChange={(e) => setWaNumber(e.target.value)}
                      placeholder="+14155238886 (Twilio Sandbox)"
                      className="input-field font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Approved Template Content SID</label>
                    <input
                      value={contentSid}
                      onChange={(e) => setContentSid(e.target.value)}
                      placeholder="HX... (production — optional for sandbox)"
                      className="input-field font-mono text-sm"
                    />
                  </div>
                </div>
              )}

              {provider === 'meta' && (
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Phone Number ID</label>
                    <input
                      value={metaPhoneId}
                      onChange={(e) => setMetaPhoneId(e.target.value)}
                      placeholder="From Meta API Setup"
                      className="input-field font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Permanent Access Token</label>
                    <input
                      type="password"
                      value={metaToken}
                      onChange={(e) => setMetaToken(e.target.value)}
                      placeholder={status?.meta.hasAccessToken ? `Saved (${status.meta.accessTokenMasked})` : 'EAA...'}
                      className="input-field font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">WhatsApp Business Account ID</label>
                    <input
                      value={metaBusinessId}
                      onChange={(e) => setMetaBusinessId(e.target.value)}
                      placeholder="Optional — for reference"
                      className="input-field font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Display Phone Number</label>
                    <input
                      value={metaDisplayPhone}
                      onChange={(e) => setMetaDisplayPhone(e.target.value)}
                      placeholder="+44..."
                      className="input-field font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Approved Template Name</label>
                    <input
                      value={metaTemplateName}
                      onChange={(e) => setMetaTemplateName(e.target.value)}
                      placeholder="e.g. justizia_outreach"
                      className="input-field font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Template Language</label>
                    <input
                      value={metaTemplateLang}
                      onChange={(e) => setMetaTemplateLang(e.target.value)}
                      placeholder="en"
                      className="input-field font-mono text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs text-slate-500">Webhook Verify Token</label>
                    <input
                      value={metaVerifyToken}
                      onChange={(e) => setMetaVerifyToken(e.target.value)}
                      placeholder="datacrew_wa_verify"
                      className="input-field font-mono text-sm"
                    />
                  </div>
                </div>
              )}

              {status?.webhookUrl && (
                <p className="mt-3 text-xs text-slate-500">
                  Webhook URL — paste in{' '}
                  {provider === 'twilio' ? 'Twilio → WhatsApp Sandbox Settings' : 'Meta → WhatsApp → Configuration → Webhook'}:
                  <br />
                  <code className="text-accent-cyan">{status.webhookUrl}</code>
                  {provider === 'meta' && status.meta.verifyToken && (
                    <>
                      <br />
                      Verify token: <code className="text-accent-violet">{status.meta.verifyToken}</code>
                    </>
                  )}
                </p>
              )}
              <p className="mt-2 text-xs text-slate-500">{status?.sandboxHint}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={handleSaveWaConfig} disabled={saving} className="btn-primary text-xs">
                  Save & Use {provider === 'twilio' ? 'Twilio' : 'Meta'}
                </button>
                <button onClick={handleTestConnection} disabled={saving} className="btn-secondary text-xs">
                  Test Connection
                </button>
              </div>
              {testResult && (
                <p className={`mt-2 text-xs ${testResult.startsWith('✓') ? 'text-accent-emerald' : 'text-red-400'}`}>
                  {testResult}
                </p>
              )}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {campaigns.map((c) => (
                <motion.div
                  key={c.id}
                  className={`glass-card-hover cursor-pointer p-5 ${selected?.id === c.id ? 'border-accent-emerald/30' : ''}`}
                  onClick={() => {
                    setSelected(c);
                    setTemplateDraft(c.template);
                    setEditingTemplate(false);
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-white">{c.name}</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {c.recipients.length} contacts · {c.sentCount} sent · {c.consentCount} consent
                      </p>
                      <span className="mt-2 inline-block rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-400">
                        {c.status}
                      </span>
                    </div>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (!window.confirm(`Delete "${c.name}"?`)) return;
                        await deleteCampaign(c.id);
                        if (selected?.id === c.id) setSelected(null);
                        await load();
                      }}
                      className="btn-secondary px-2 py-1 text-xs text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>

            {selected && (
              <div className="glass-card p-6">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-white">{selected.name}</h3>
                    <p className="text-sm text-slate-400">
                      {selected.recipients.filter((r) => r.status === 'pending').length} pending ·{' '}
                      {selected.recipients.filter((r) => r.status === 'in_flow').length} in conversation
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setShowAddRecipients(true)} className="btn-secondary text-xs">
                      <Users className="h-3.5 w-3.5" /> Add Customers
                    </button>
                    <button
                      onClick={handleSend}
                      disabled={saving || selected.recipients.every((r) => r.status !== 'pending')}
                      className="btn-primary text-xs"
                    >
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      Send Campaign
                    </button>
                  </div>
                </div>

                <div className="mb-6 rounded-xl border border-white/5 bg-white/[0.02] p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Message Template</p>
                    <button
                      onClick={() => {
                        if (editingTemplate) handleSaveTemplate();
                        else setEditingTemplate(true);
                      }}
                      className="text-xs text-accent-cyan hover:underline"
                    >
                      {editingTemplate ? 'Save' : 'Edit'}
                    </button>
                  </div>
                  {editingTemplate ? (
                    <textarea
                      value={templateDraft}
                      onChange={(e) => setTemplateDraft(e.target.value)}
                      rows={6}
                      className="input-field text-sm leading-relaxed"
                    />
                  ) : (
                    <p className="whitespace-pre-wrap text-sm text-slate-300">{selected.template}</p>
                  )}
                  <p className="mt-2 text-xs text-slate-500">
                    Use <code className="text-accent-violet">{'{{clientName}}'}</code> for personalization. After they reply,
                    Mia continues with DOB → postcode → consent (same as calls).
                  </p>
                </div>

                <div className="space-y-2">
                  {selected.recipients.length === 0 ? (
                    <p className="py-6 text-center text-sm text-slate-500">
                      No customers yet. Add phone numbers to start a campaign.
                    </p>
                  ) : (
                    selected.recipients.map((r) => (
                      <div key={r.id} className="flex items-center justify-between rounded-lg border border-white/5 px-4 py-3">
                        <div>
                          <p className="font-medium text-white">{r.clientName}</p>
                          <p className="text-xs text-slate-500">
                            {r.phone}
                            {r.outcome && ` · ${r.outcome}`}
                            {r.lastMessage && ` · "${r.lastMessage.slice(0, 40)}…"`}
                          </p>
                          {r.errorMessage && <p className="text-xs text-red-400">{r.errorMessage}</p>}
                        </div>
                        <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_COLORS[r.status] ?? ''}`}>
                          {r.status}
                        </span>
                      </div>
                    ))
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
        {showAddRecipients && selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={() => !saving && setShowAddRecipients(false)}
          >
            <motion.div
              initial={{ scale: 0.98, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card w-full max-w-lg p-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-bold text-white">Add Customers</h3>
                <button onClick={() => setShowAddRecipients(false)} className="text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="mb-3 text-xs text-slate-500">
                One per line: <code>phone, name, DOB, postcode</code> — or paste CSV. Example:
              </p>
              <pre className="mb-3 rounded-lg bg-black/30 p-2 text-xs text-slate-400">
                +918807709541, John Smith, 15/08/1990, SW1A 1AA
              </pre>
              <textarea
                value={recipientCsv}
                onChange={(e) => setRecipientCsv(e.target.value)}
                placeholder="+918807709541, John Smith"
                rows={8}
                className="input-field font-mono text-sm"
              />
              <button onClick={handleAddRecipients} disabled={saving || !recipientCsv.trim()} className="btn-primary mt-4 w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
                Add Recipients
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}