import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Download, FileText, XCircle } from 'lucide-react';
import type { MarketingToolResult } from '../../api/marketing';
import type { CheckStatus, SeoActionItem } from '../../api/seo';
import { getMarketingExportUrl } from '../../api/marketing';

function scoreColor(score: number): string {
  if (score >= 85) return 'text-accent-emerald';
  if (score >= 70) return 'text-accent-cyan';
  if (score >= 50) return 'text-amber-400';
  return 'text-red-400';
}

function statusIcon(status: CheckStatus) {
  if (status === 'pass') return <CheckCircle2 className="h-4 w-4 text-accent-emerald" />;
  if (status === 'warn') return <AlertCircle className="h-4 w-4 text-amber-400" />;
  return <XCircle className="h-4 w-4 text-red-400" />;
}

function ActionBlock({ title, items }: { title: string; items: SeoActionItem[] }) {
  if (!items.length) return null;
  return (
    <div className="glass-card border border-white/10 p-5">
      <h3 className="mb-3 font-bold text-white">
        {title} <span className="text-slate-500">({items.length})</span>
      </h3>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
            <div className="flex items-center gap-2">
              {statusIcon(item.status)}
              <p className="text-sm font-semibold text-white">{item.label}</p>
            </div>
            <p className="mt-1 text-xs text-accent-cyan">{item.actionText}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MarketingResults({ result }: { result: MarketingToolResult }) {
  const plan = result.actionPlan;
  const download = (format: 'pdf' | 'html' | 'csv') => {
    window.open(getMarketingExportUrl(result.id, format), '_blank');
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className={`text-4xl font-bold ${scoreColor(result.score)}`}>{result.score}%</p>
            <p className="text-sm text-slate-400">Grade {result.grade}</p>
            <h3 className="mt-2 text-lg font-bold text-white">{result.finalUrl}</h3>
            <p className="mt-1 text-sm text-slate-400">{result.summary}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-accent-emerald/15 px-2.5 py-1 text-accent-emerald">{result.counts.pass} pass</span>
              <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-amber-300">{result.counts.warn} warn</span>
              <span className="rounded-full bg-red-500/15 px-2.5 py-1 text-red-300">{result.counts.fail} fail</span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <button onClick={() => download('pdf')} className="btn-primary text-xs">
              <Download className="h-3.5 w-3.5" /> PDF
            </button>
            <button onClick={() => download('html')} className="btn-secondary text-xs">
              <FileText className="h-3.5 w-3.5" /> HTML
            </button>
            <button onClick={() => download('csv')} className="btn-secondary text-xs">
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
          </div>
        </div>
      </motion.div>

      <ActionBlock title="Critical failures" items={plan.criticalFailures} />
      <ActionBlock title="Add" items={plan.shouldAdd.filter((i) => i.status !== 'pass')} />
      <ActionBlock title="Improve" items={plan.needsImprovement} />

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">Checklist</h2>
        {result.categories.map((cat) => (
          <div key={cat.id} className="glass-card p-5">
            <div className="mb-3 flex justify-between">
              <h3 className="font-bold text-white">{cat.name}</h3>
              <span className={`text-sm font-semibold ${scoreColor(Math.round((cat.score / cat.maxScore) * 100))}`}>
                {Math.round((cat.score / cat.maxScore) * 100)}%
              </span>
            </div>
            <div className="space-y-2">
              {cat.checks.map((check) => (
                <div key={check.id} className="rounded-xl border border-white/5 px-4 py-3">
                  <div className="flex items-start gap-2">
                    {statusIcon(check.status)}
                    <div>
                      <p className="text-sm font-semibold text-white">{check.label}</p>
                      <p className="text-xs text-slate-400">{check.detail}</p>
                      {check.status !== 'pass' && <p className="mt-1 text-xs text-accent-cyan">{check.actionText}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}