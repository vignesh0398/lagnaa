import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileText,
  Globe,
  History,
  Loader2,
  MinusCircle,
  PlusCircle,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { StatCard } from '../components/ui/StatCard';
import { downloadExportFile } from '../api/downloadExport';
import {
  deleteSeoAudit,
  getSeoAudit,
  getSeoExportUrl,
  getSeoHistory,
  runSeoAudit,
  type AudienceType,
  type CheckStatus,
  type MarketingReport,
  type ReportKind,
  type SeoActionItem,
  type SeoAuditResult,
  type SeoAuditSummary,
} from '../api/seo';

function getReports(audit: SeoAuditResult): MarketingReport[] {
  if (audit.reports?.length) return audit.reports;
  return [
    {
      kind: 'seo',
      label: 'SEO',
      score: audit.score,
      grade: audit.grade,
      summary: audit.summary,
      categories: audit.categories,
      recommendations: audit.recommendations,
      actionPlan: audit.actionPlan,
      counts: audit.counts,
    },
  ];
}

const AUDIENCE_OPTIONS: { id: AudienceType; label: string; desc: string; reports: string }[] = [
  { id: 'b2b', label: 'B2B', desc: 'Business-to-business', reports: 'SEO · GEO · LLMO' },
  { id: 'b2c', label: 'B2C', desc: 'Business-to-consumer', reports: 'SEO · AEO · GEO' },
];

function scoreColor(score: number): string {
  if (score >= 85) return 'text-accent-emerald';
  if (score >= 70) return 'text-accent-cyan';
  if (score >= 50) return 'text-amber-400';
  return 'text-red-400';
}

function scoreRingColor(score: number): string {
  if (score >= 85) return 'stroke-accent-emerald';
  if (score >= 70) return 'stroke-accent-cyan';
  if (score >= 50) return 'stroke-amber-400';
  return 'stroke-red-400';
}

function statusIcon(status: CheckStatus) {
  if (status === 'pass') return <CheckCircle2 className="h-4 w-4 text-accent-emerald" />;
  if (status === 'warn') return <AlertCircle className="h-4 w-4 text-amber-400" />;
  return <XCircle className="h-4 w-4 text-red-400" />;
}

function ScoreRing({ score, grade }: { score: number; grade: string }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex h-36 w-36 items-center justify-center">
      <svg className="-rotate-90" width="144" height="144">
        <circle cx="72" cy="72" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
        <circle
          cx="72"
          cy="72"
          r={radius}
          fill="none"
          className={scoreRingColor(score)}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute text-center">
        <p className={`text-3xl font-bold ${scoreColor(score)}`}>{score}%</p>
        <p className="text-sm font-semibold text-slate-400">{grade}</p>
      </div>
    </div>
  );
}

function ActionSection({
  title,
  subtitle,
  icon,
  borderClass,
  items,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  borderClass: string;
  items: SeoActionItem[];
}) {
  if (!items.length) return null;

  return (
    <div className={`glass-card border p-5 ${borderClass}`}>
      <div className="mb-4 flex items-start gap-3">
        <div className="mt-0.5 shrink-0">{icon}</div>
        <div>
          <h3 className="font-bold text-white">
            {title} <span className="text-slate-500">({items.length})</span>
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              {statusIcon(item.status)}
              <p className="text-sm font-semibold text-white">{item.label}</p>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-slate-400">{item.category}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                  item.priority === 'critical'
                    ? 'bg-red-500/20 text-red-300'
                    : item.priority === 'high'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-slate-500/20 text-slate-400'
                }`}
              >
                {item.priority}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              <span className="font-medium text-slate-300">What we found:</span> {item.detail}
            </p>
            <p className="mt-1.5 text-xs text-slate-400">
              <span className="font-medium text-slate-300">Why it matters:</span> {item.explanation}
            </p>
            <p className="mt-2 rounded-lg bg-accent-cyan/5 px-3 py-2 text-xs text-accent-cyan">
              <span className="font-semibold text-accent-cyan/90">What to do:</span> {item.actionText}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SeoMarketing() {
  const [tab, setTab] = useState<'report' | 'history'>('report');
  const [url, setUrl] = useState('');
  const [audienceType, setAudienceType] = useState<AudienceType>('b2c');
  const [activeReport, setActiveReport] = useState<ReportKind>('seo');
  const [auditing, setAuditing] = useState(false);
  const [error, setError] = useState('');
  const [audit, setAudit] = useState<SeoAuditResult | null>(null);
  const [history, setHistory] = useState<SeoAuditSummary[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);

  const loadHistory = useCallback(async () => {
    try {
      const data = await getSeoHistory();
      setHistory(data.audits);
      setHistoryTotal(data.total);
    } catch {
      setHistory([]);
      setHistoryTotal(0);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleAudit = async () => {
    if (!url.trim()) return;
    setAuditing(true);
    setError('');
    setTab('report');
    try {
      const result = await runSeoAudit(url.trim(), audienceType);
      setAudit(result);
      setActiveReport('seo');
      await loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Audit failed');
      setAudit(null);
    } finally {
      setAuditing(false);
    }
  };

  const loadPast = async (item: SeoAuditSummary) => {
    setError('');
    setTab('report');
    setUrl(item.url);
    try {
      const loaded = await getSeoAudit(item.id);
      setAudit(loaded);
      setAudienceType(loaded.audienceType ?? item.audienceType ?? 'b2c');
      setActiveReport('seo');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load audit');
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this audit from history?')) return;
    try {
      await deleteSeoAudit(id);
      if (audit?.id === id) setAudit(null);
      await loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const download = async (format: 'html' | 'csv' | 'json' | 'pdf') => {
    if (!audit) return;
    const url = getSeoExportUrl(audit.id, format);
    if (format === 'json') {
      window.open(url, '_blank');
      return;
    }
    setError('');
    try {
      await downloadExportFile(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    }
  };

  const reports = audit ? getReports(audit) : [];
  const currentReport = reports.find((r) => r.kind === activeReport) ?? reports[0];
  const plan = currentReport?.actionPlan;

  return (
    <div>
      <Header title="SEO Marketing" subtitle="Marketing" onRefresh={loadHistory} />

      <div className="space-y-6 p-8">
        <div className="flex flex-wrap gap-2 border-b border-white/5 pb-4">
          <button
            onClick={() => setTab('report')}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              tab === 'report' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Search className="mr-2 inline h-4 w-4" />
            New audit
          </button>
          <button
            onClick={() => setTab('history')}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              tab === 'history' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="mr-2 inline h-4 w-4" />
            History ({historyTotal})
          </button>
        </div>

        {tab === 'report' && (
          <>
            <div className="rounded-2xl border border-accent-violet/20 bg-gradient-to-r from-accent-violet/10 to-accent-cyan/5 px-5 py-4">
              <p className="text-sm text-slate-300">
                Choose B2B or B2C, paste a URL, and get a full marketing audit bundle with separate SEO, GEO, LLMO, or
                AEO reports — each with scores, action plans, and downloads. All audits are saved to history.
              </p>
            </div>

            <div className="glass-card space-y-4 p-5">
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate-500">
                  Audience type
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {AUDIENCE_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setAudienceType(opt.id)}
                      className={`rounded-xl border p-4 text-left transition ${
                        audienceType === opt.id
                          ? 'border-accent-cyan/40 bg-accent-cyan/10 shadow-glow'
                          : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                      }`}
                    >
                      <p className="font-bold text-white">{opt.label}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{opt.desc}</p>
                      <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-accent-cyan">
                        {opt.reports}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-4 md:flex-row md:items-end">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
                    Website URL
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAudit()}
                      placeholder="https://yourwebsite.com"
                      className="input-field pl-10"
                    />
                  </div>
                </div>
                <button onClick={handleAudit} disabled={auditing || !url.trim()} className="btn-primary shrink-0">
                  {auditing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Run {audienceType.toUpperCase()} Audit
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {auditing && (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="h-10 w-10 animate-spin text-accent-violet" />
                <p className="mt-4 text-sm text-slate-400">
                  Running {audienceType === 'b2b' ? 'SEO, GEO & LLMO' : 'SEO, AEO & GEO'} checks…
                </p>
                <p className="mt-1 text-xs text-slate-500">This can take 1–2 minutes — please keep this tab open.</p>
              </div>
            )}

            {audit && !auditing && plan && (
              <>
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-6"
                >
                  <div className="grid gap-6 lg:grid-cols-[auto_1fr_auto]">
                    <ScoreRing score={audit.score} grade={audit.grade} />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-white">{audit.finalUrl}</h3>
                        <span className="rounded-full bg-accent-violet/20 px-2.5 py-0.5 text-[10px] font-bold uppercase text-accent-violet">
                          {audit.audienceType ?? 'b2c'}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-400">{audit.summary}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        Audited {new Date(audit.auditedAt).toLocaleString()}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-accent-emerald/15 px-2.5 py-1 text-xs text-accent-emerald">
                          {audit.counts.pass} passed
                        </span>
                        <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs text-amber-300">
                          {audit.counts.warn} warnings
                        </span>
                        <span className="rounded-full bg-red-500/15 px-2.5 py-1 text-xs text-red-300">
                          {audit.counts.fail} failed
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Download report</p>
                      <button onClick={() => download('pdf')} className="btn-primary text-xs">
                        <Download className="h-3.5 w-3.5" /> PDF Report
                      </button>
                      <button onClick={() => download('html')} className="btn-secondary text-xs">
                        <FileText className="h-3.5 w-3.5" /> HTML Report
                      </button>
                      <button onClick={() => download('csv')} className="btn-secondary text-xs">
                        <FileText className="h-3.5 w-3.5" /> CSV Spreadsheet
                      </button>
                      <button onClick={() => download('json')} className="btn-secondary text-xs">
                        <Download className="h-3.5 w-3.5" /> JSON Data
                      </button>
                      <p className="text-[10px] text-slate-600">PDF is client-ready — includes all report sections</p>
                    </div>
                  </div>
                </motion.div>

                {reports.length > 1 && (
                  <div className="grid gap-3 sm:grid-cols-3">
                    {reports.map((r) => (
                      <button
                        key={r.kind}
                        type="button"
                        onClick={() => setActiveReport(r.kind)}
                        className={`glass-card border p-4 text-left transition ${
                          activeReport === r.kind
                            ? 'border-accent-cyan/40 bg-accent-cyan/5'
                            : 'border-white/5 hover:border-white/15'
                        }`}
                      >
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{r.label}</p>
                        <p className={`mt-1 text-2xl font-bold ${scoreColor(r.score)}`}>{r.score}%</p>
                        <p className="text-xs text-slate-400">Grade {r.grade}</p>
                      </button>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
                  <StatCard label="Response" value={`${audit.metrics.responseTimeMs}ms`} icon={Sparkles} accent="cyan" />
                  <StatCard label="Page size" value={`${audit.metrics.pageSizeKb} KB`} icon={Globe} accent="violet" />
                  <StatCard label="Words" value={audit.metrics.wordCount} icon={Search} accent="emerald" />
                  <StatCard label="Images" value={audit.metrics.imageCount} icon={Sparkles} accent="pink" />
                  <StatCard label="Internal links" value={audit.metrics.internalLinks} icon={TrendingUp} accent="cyan" />
                  <StatCard
                    label="HTTPS"
                    value={audit.metrics.hasHttps ? 'Yes' : 'No'}
                    icon={CheckCircle2}
                    accent={audit.metrics.hasHttps ? 'emerald' : 'pink'}
                  />
                </div>

                <h2 className="text-lg font-bold text-white">
                  {currentReport?.label ?? 'SEO'} action plan
                </h2>
                <p className="-mt-4 text-sm text-slate-500">
                  {currentReport?.summary ?? 'Follow these sections in order — fix critical failures first.'}
                </p>

                <ActionSection
                  title="Critical failures"
                  subtitle="These are blocking your rankings — fix these first."
                  icon={<XCircle className="h-5 w-5 text-red-400" />}
                  borderClass="border-red-500/20"
                  items={plan.criticalFailures}
                />
                <ActionSection
                  title="Add these to your site"
                  subtitle="Missing elements that search engines and users expect."
                  icon={<PlusCircle className="h-5 w-5 text-accent-cyan" />}
                  borderClass="border-accent-cyan/20"
                  items={plan.shouldAdd}
                />
                <ActionSection
                  title="Remove or change these"
                  subtitle="Harmful or outdated elements hurting your SEO."
                  icon={<MinusCircle className="h-5 w-5 text-accent-violet" />}
                  borderClass="border-accent-violet/20"
                  items={plan.shouldRemove}
                />
                <ActionSection
                  title="Improve these"
                  subtitle="Not broken, but optimizing them will raise your score."
                  icon={<TrendingUp className="h-5 w-5 text-amber-400" />}
                  borderClass="border-amber-500/20"
                  items={plan.needsImprovement}
                />
                <ActionSection
                  title="Working well — keep these"
                  subtitle="Do not change these unless you redesign the site."
                  icon={<CheckCircle2 className="h-5 w-5 text-accent-emerald" />}
                  borderClass="border-accent-emerald/20"
                  items={plan.workingWell}
                />

                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-white">{currentReport?.label ?? 'SEO'} checklist</h2>
                  {(currentReport?.categories ?? []).map((cat, ci) => (
                    <motion.div
                      key={cat.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: ci * 0.03 }}
                      className="glass-card p-5"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="font-bold text-white">{cat.name}</h3>
                        <span
                          className={`text-sm font-semibold ${scoreColor(Math.round((cat.score / cat.maxScore) * 100))}`}
                        >
                          {Math.round((cat.score / cat.maxScore) * 100)}%
                        </span>
                      </div>
                      <div className="space-y-2">
                        {cat.checks.map((check) => (
                          <div
                            key={check.id}
                            className={`rounded-xl border px-4 py-3 ${
                              check.status === 'pass'
                                ? 'border-accent-emerald/15 bg-accent-emerald/5'
                                : check.status === 'warn'
                                  ? 'border-amber-500/15 bg-amber-500/5'
                                  : 'border-red-500/15 bg-red-500/5'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5 shrink-0">{statusIcon(check.status)}</div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="text-sm font-semibold text-white">{check.label}</p>
                                  <span className="text-xs text-slate-500">
                                    {check.score}/{check.maxScore} pts
                                  </span>
                                </div>
                                <p className="mt-0.5 text-xs text-slate-400">{check.detail}</p>
                                <p className="mt-1 text-xs text-slate-500">{check.explanation}</p>
                                {check.status !== 'pass' && (
                                  <p className="mt-1.5 text-xs text-accent-cyan">{check.actionText}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {tab === 'history' && (
          <div className="glass-card p-5">
            <h3 className="mb-2 font-bold text-white">Audit history</h3>
            <p className="mb-4 text-sm text-slate-500">
              Up to 100 past audits saved on this machine. Click any row to reopen the full report and download again.
            </p>
            {history.length === 0 ? (
              <p className="py-12 text-center text-slate-500">No audits yet — run your first SEO scan above.</p>
            ) : (
              <div className="space-y-2">
                {history.map((h) => (
                  <div
                    key={h.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => loadPast(h)}
                    onKeyDown={(e) => e.key === 'Enter' && loadPast(h)}
                    className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-left transition hover:bg-white/5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium text-white">{h.finalUrl}</p>
                        <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-400">
                          {h.audienceType ?? 'b2c'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{new Date(h.auditedAt).toLocaleString()}</p>
                      {h.reportScores && h.reportScores.length > 0 ? (
                        <div className="mt-1 flex flex-wrap gap-2 text-[10px]">
                          {h.reportScores.map((rs) => (
                            <span key={rs.kind} className="text-slate-400">
                              {rs.kind.toUpperCase()}{' '}
                              <span className={scoreColor(rs.score)}>{rs.score}%</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-1 flex gap-2 text-[10px]">
                          <span className="text-accent-emerald">{h.counts?.pass ?? 0} pass</span>
                          <span className="text-amber-400">{h.warnCount ?? h.counts?.warn ?? 0} warn</span>
                          <span className="text-red-400">{h.failCount ?? h.counts?.fail ?? 0} fail</span>
                        </div>
                      )}
                    </div>
                    <span className={`shrink-0 text-sm font-bold ${scoreColor(h.score)}`}>
                      {h.score}% {h.grade}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(h.id, e)}
                      className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-red-500/10 hover:text-red-400"
                      aria-label="Delete audit"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}