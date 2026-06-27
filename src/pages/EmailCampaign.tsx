import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Mail,
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
  addEmailRecipients,
  createEmailCampaign,
  deleteEmailCampaign,
  getEmailCampaigns,
  getEmailStatus,
  parseEmailRecipientCsv,
  sendEmailCampaign,
  testEmailConnection,
  updateEmailCampaign,
  updateEmailConfig,
  type EmailCampaign,
  type EmailProvider,
  type EmailStatus,
} from '../api/email';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-slate-500/15 text-slate-400',
  sent: 'bg-accent-cyan/15 text-accent-cyan',
  replied: 'bg-accent-violet/15 text-accent-violet',
  in_flow: 'bg-amber-500/15 text-amber-400',
  completed: 'bg-accent-emerald/15 text-accent-emerald',
  failed: 'bg-red-500/15 text-red-400',
  opted_out: 'bg-red-500/15 text-red-400',
};

const PROVIDER_LABELS: Record<EmailProvider, string> = {
  smtp: 'SMTP',
  resend: 'Resend',
  sendgrid: 'SendGrid',
};

export function EmailCampaignPage() {
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [status, setStatus] = useState<EmailStatus | null>(null);
  const [selected, setSelected] = useState<EmailCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showAddRecipients, setShowAddRecipients] = useState(false);
  const [recipientCsv, setRecipientCsv] = useState('');
  const [editingContent, setEditingContent] = useState(false);
  const [subjectDraft, setSubjectDraft] = useState('');
  const [templateDraft, setTemplateDraft] = useState('');

  const [provider, setProvider] = useState<EmailProvider>('smtp');
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('');
  const [replyTo, setReplyTo] = useState('');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [resendApiKey, setResendApiKey] = useState('');
  const [sendgridApiKey, setSendgridApiKey] = useState('');
  const [testResult, setTestResult] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [campData, emailStatus] = await Promise.all([getEmailCampaigns(), getEmailStatus()]);
      setCampaigns(campData.campaigns);
      setStatus(emailStatus);
      setProvider(emailStatus.provider);
      setFromEmail(emailStatus.fromEmail ?? '');
      setFromName(emailStatus.fromName ?? '');
      setReplyTo(emailStatus.replyTo ?? '');
      setSmtpHost(emailStatus.smtp.host ?? '');
      setSmtpPort(String(emailStatus.smtp.port ?? 587));
      setSmtpUser(emailStatus.smtp.user ?? '');
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
    const name = window.prompt('Campaign name:', 'Justizia Email Outreach');
    if (!name?.trim()) return;
    setSaving(true);
    try {
      const { campaign } = await createEmailCampaign(name.trim());
      setSelected(campaign);
      setSubjectDraft(campaign.subject);
      setTemplateDraft(campaign.template);
      await load();
      setSuccess(`Campaign "${campaign.name}" created`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveContent = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const { campaign } = await updateEmailCampaign(selected.id, {
        subject: subjectDraft,
        template: templateDraft,
      });
      setSelected(campaign);
      setEditingContent(false);
      await load();
      setSuccess('Subject and template saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleAddRecipients = async () => {
    if (!selected) return;
    const rows = parseEmailRecipientCsv(recipientCsv);
    if (rows.length === 0) {
      setError('Add at least one row: email, name, DOB (optional), postcode (optional)');
      return;
    }
    setSaving(true);
    try {
      const { campaign } = await addEmailRecipients(selected.id, rows);
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
    if (
      !window.confirm(
        `Send email to ${selected.recipients.filter((r) => r.status === 'pending').length} pending recipients?`
      )
    ) {
      return;
    }
    setSaving(true);
    setError('');
    try {
      const result = await sendEmailCampaign(selected.id);
      setSelected(result.campaign);
      await load();
      setSuccess(
        `Sent to ${result.sent} recipient(s)${result.failed ? `, ${result.failed} failed` : ''}. Replies will trigger the consent workflow.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEmailConfig = async () => {
    setSaving(true);
    setTestResult('');
    try {
      const updated = await updateEmailConfig({
        provider,
        fromEmail: fromEmail || undefined,
        fromName: fromName || undefined,
        replyTo: replyTo || undefined,
        smtp: {
          host: smtpHost || undefined,
          port: smtpPort ? Number(smtpPort) : undefined,
          user: smtpUser || undefined,
          pass: smtpPassword || undefined,
        },
        resend: resendApiKey ? { apiKey: resendApiKey } : undefined,
        sendgrid: sendgridApiKey ? { apiKey: sendgridApiKey } : undefined,
      });
      setStatus(updated);
      setSmtpPassword('');
      setResendApiKey('');
      setSendgridApiKey('');
      await load();
      setSuccess(`Connected via ${PROVIDER_LABELS[provider]}`);
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
      const result = await testEmailConnection();
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
        title="Email Campaign"
        subtitle="Multi-channel consent workflow"
        onRefresh={load}
        actions={
          <Link to="/email/chats" className="btn-secondary text-xs">
            <Mail className="h-4 w-4" />
            Email History
          </Link>
        }
      />

      <div className="space-y-6 p-8">
        <div className="rounded-2xl border border-accent-cyan/20 bg-accent-cyan/5 px-5 py-4">
          <p className="text-sm text-accent-cyan/90">
            Send outreach emails to multiple customers, then Mia runs the <strong>same consent workflow</strong> as voice
            calls — identity check, DOB, postcode, and legal consent — all over email replies.
          </p>
        </div>

        {status && !status.configured && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Complete email provider credentials below to enable campaigns.
          </div>
        )}

        {status && !status.webhookReady && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Webhook not ready — start ngrok (or set PUBLIC_WEBHOOK_URL) so inbound email replies are handled.
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
                <StatCard label="Campaigns" value={campaigns.length} icon={Mail} accent="cyan" />
                <StatCard label="Emails Sent" value={totalSent} icon={Send} accent="emerald" />
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
              <h3 className="mb-1 text-sm font-bold text-white">Connect Email</h3>
              <p className="mb-4 text-xs text-slate-500">Choose how to send emails — switch anytime.</p>

              <div className="mb-5 grid gap-3 md:grid-cols-3">
                {status?.providers.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setProvider(p.id)}
                    className={`rounded-xl border p-4 text-left transition-all ${
                      provider === p.id
                        ? 'border-accent-cyan/40 bg-accent-cyan/10'
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

              <div className="mb-4 grid gap-3 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-500">From Email</label>
                  <input
                    value={fromEmail}
                    onChange={(e) => setFromEmail(e.target.value)}
                    placeholder="outreach@yourdomain.com"
                    className="input-field font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">From Name</label>
                  <input
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    placeholder="Lagnaa"
                    className="input-field text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">Reply-To</label>
                  <input
                    value={replyTo}
                    onChange={(e) => setReplyTo(e.target.value)}
                    placeholder="replies@yourdomain.com"
                    className="input-field font-mono text-sm"
                  />
                </div>
              </div>

              {provider === 'smtp' && (
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">SMTP Host</label>
                    <input
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      placeholder="smtp.gmail.com"
                      className="input-field font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">SMTP Port</label>
                    <input
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(e.target.value)}
                      placeholder="587"
                      className="input-field font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">SMTP User</label>
                    <input
                      value={smtpUser}
                      onChange={(e) => setSmtpUser(e.target.value)}
                      placeholder="you@gmail.com"
                      className="input-field font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">SMTP Password</label>
                    <input
                      type="password"
                      value={smtpPassword}
                      onChange={(e) => setSmtpPassword(e.target.value)}
                      placeholder={status?.smtp.hasPassword ? 'Saved (enter to replace)' : 'App password'}
                      className="input-field font-mono text-sm"
                    />
                  </div>
                </div>
              )}

              {provider === 'resend' && (
                <div>
                  <label className="mb-1 block text-xs text-slate-500">Resend API Key</label>
                  <input
                    type="password"
                    value={resendApiKey}
                    onChange={(e) => setResendApiKey(e.target.value)}
                    placeholder={
                      status?.resend.hasApiKey
                        ? `Saved (${status.resend.apiKeyMasked})`
                        : 're_...'
                    }
                    className="input-field font-mono text-sm"
                  />
                </div>
              )}

              {provider === 'sendgrid' && (
                <div>
                  <label className="mb-1 block text-xs text-slate-500">SendGrid API Key</label>
                  <input
                    type="password"
                    value={sendgridApiKey}
                    onChange={(e) => setSendgridApiKey(e.target.value)}
                    placeholder={
                      status?.sendgrid.hasApiKey
                        ? `Saved (${status.sendgrid.apiKeyMasked})`
                        : 'SG....'
                    }
                    className="input-field font-mono text-sm"
                  />
                </div>
              )}

              {status?.webhookUrl && (
                <p className="mt-3 text-xs text-slate-500">
                  Webhook URL — configure inbound email forwarding (SendGrid Inbound Parse, Mailgun, or Resend):
                  <br />
                  <code className="text-accent-cyan">{status.webhookUrl}</code>
                </p>
              )}
              <p className="mt-2 text-xs text-slate-500">{status?.inboundHint}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={handleSaveEmailConfig} disabled={saving} className="btn-primary text-xs">
                  Save & Use {PROVIDER_LABELS[provider]}
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
                  className={`glass-card-hover cursor-pointer p-5 ${selected?.id === c.id ? 'border-accent-cyan/30' : ''}`}
                  onClick={() => {
                    setSelected(c);
                    setSubjectDraft(c.subject);
                    setTemplateDraft(c.template);
                    setEditingContent(false);
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
                        await deleteEmailCampaign(c.id);
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
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Email Content</p>
                    <button
                      onClick={() => {
                        if (editingContent) handleSaveContent();
                        else setEditingContent(true);
                      }}
                      className="text-xs text-accent-cyan hover:underline"
                    >
                      {editingContent ? 'Save' : 'Edit'}
                    </button>
                  </div>
                  {editingContent ? (
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-xs text-slate-500">Subject</label>
                        <input
                          value={subjectDraft}
                          onChange={(e) => setSubjectDraft(e.target.value)}
                          placeholder="Important update regarding your case"
                          className="input-field text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-slate-500">Body Template</label>
                        <textarea
                          value={templateDraft}
                          onChange={(e) => setTemplateDraft(e.target.value)}
                          rows={6}
                          className="input-field text-sm leading-relaxed"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs font-medium text-slate-500">Subject</p>
                      <p className="mb-3 text-sm text-white">{selected.subject || '(no subject)'}</p>
                      <p className="text-xs font-medium text-slate-500">Body</p>
                      <p className="whitespace-pre-wrap text-sm text-slate-300">{selected.template}</p>
                    </>
                  )}
                  <p className="mt-2 text-xs text-slate-500">
                    Use <code className="text-accent-violet">{'{{clientName}}'}</code> for personalization. After they reply,
                    Mia continues with DOB → postcode → consent (same as calls).
                  </p>
                </div>

                <div className="space-y-2">
                  {selected.recipients.length === 0 ? (
                    <p className="py-6 text-center text-sm text-slate-500">
                      No customers yet. Add email addresses to start a campaign.
                    </p>
                  ) : (
                    selected.recipients.map((r) => (
                      <div key={r.id} className="flex items-center justify-between rounded-lg border border-white/5 px-4 py-3">
                        <div>
                          <p className="font-medium text-white">{r.clientName}</p>
                          <p className="text-xs text-slate-500">
                            {r.email}
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
            <AlertCircle className="h-4 w-4" />
            {error}
          </p>
        )}
        {success && (
          <p className="flex items-center gap-2 text-sm text-accent-emerald">
            <CheckCircle2 className="h-4 w-4" />
            {success}
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
                One per line: <code>email, name, DOB, postcode</code> — or paste CSV. Example:
              </p>
              <pre className="mb-3 rounded-lg bg-black/30 p-2 text-xs text-slate-400">
                john@example.com, John Smith, 15/08/1990, SW1A 1AA
              </pre>
              <textarea
                value={recipientCsv}
                onChange={(e) => setRecipientCsv(e.target.value)}
                placeholder="john@example.com, John Smith"
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