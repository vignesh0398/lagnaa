import { useEffect, useState } from 'react';
import { Calendar, Globe, Loader2 } from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { MarketingResults } from '../../components/marketing/MarketingResults';
import {
  generateRoadmap,
  getSeoAuditsForRoadmap,
  type MarketingToolResult,
} from '../../api/marketing';
import type { AudienceType } from '../../api/seo';

export function MarketingRoadmap() {
  const [mode, setMode] = useState<'audit' | 'url'>('audit');
  const [auditId, setAuditId] = useState('');
  const [url, setUrl] = useState('');
  const [audienceType, setAudienceType] = useState<AudienceType>('b2c');
  const [audits, setAudits] = useState<{ id: string; url: string; score: number; grade: string; audienceType: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<MarketingToolResult | null>(null);

  useEffect(() => {
    getSeoAuditsForRoadmap().then(setAudits).catch(() => setAudits([]));
  }, []);

  const run = async () => {
    setLoading(true);
    setError('');
    try {
      setResult(
        await generateRoadmap(
          mode === 'audit' ? { auditId } : { url: url.trim(), audienceType }
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const phases = (result?.meta as { phases?: { phase: string; timeframe: string; items: { label: string; actionText: string }[] }[] })?.phases;

  return (
    <div>
      <Header title="90-Day Roadmap" subtitle="Marketing" />
      <div className="space-y-6 p-8">
        <div className="rounded-2xl border border-accent-violet/20 bg-gradient-to-r from-accent-violet/10 to-accent-cyan/5 px-5 py-4 text-sm text-slate-300">
          Turn your SEO audit into a phased 90-day marketing plan — week-by-week priorities for client proposals and retainers.
        </div>

        <div className="glass-card space-y-4 p-5">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('audit')}
              className={`rounded-xl px-4 py-2 text-sm ${mode === 'audit' ? 'bg-white/10 text-white' : 'text-slate-400'}`}
            >
              From SEO audit
            </button>
            <button
              type="button"
              onClick={() => setMode('url')}
              className={`rounded-xl px-4 py-2 text-sm ${mode === 'url' ? 'bg-white/10 text-white' : 'text-slate-400'}`}
            >
              New URL scan
            </button>
          </div>

          {mode === 'audit' ? (
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Previous SEO audit</label>
              <select value={auditId} onChange={(e) => setAuditId(e.target.value)} className="input-field">
                <option value="">Select an audit…</option>
                {audits.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.url} — {a.score}% ({a.audienceType?.toUpperCase()})
                  </option>
                ))}
              </select>
              {audits.length === 0 && (
                <p className="mt-2 text-xs text-slate-500">Run an SEO Marketing audit first, or use New URL scan.</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://yoursite.com" className="input-field pl-10" />
              </div>
              <select value={audienceType} onChange={(e) => setAudienceType(e.target.value as AudienceType)} className="input-field">
                <option value="b2c">B2C (SEO + AEO + GEO)</option>
                <option value="b2b">B2B (SEO + GEO + LLMO)</option>
              </select>
            </div>
          )}

          <button
            onClick={run}
            disabled={loading || (mode === 'audit' ? !auditId : !url.trim())}
            className="btn-primary"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
            Generate roadmap
          </button>
        </div>

        {error && <p className="text-sm text-red-300">{error}</p>}
        {loading && <p className="text-center text-sm text-slate-400">Building your 90-day roadmap… This can take 1–2 minutes.</p>}

        {phases && (
          <div className="space-y-4">
            {phases.map((phase) => (
              <div key={phase.phase} className="glass-card border border-accent-violet/15 p-5">
                <h3 className="font-bold text-white">{phase.phase}</h3>
                <p className="text-xs text-slate-500">{phase.timeframe}</p>
                <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-300">
                  {phase.items.map((item, i) => (
                    <li key={i}>
                      <span className="font-medium text-white">{item.label}</span> — {item.actionText}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        )}

        {result && !loading && <MarketingResults result={result} />}
      </div>
    </div>
  );
}