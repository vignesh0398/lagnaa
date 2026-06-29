import { useState } from 'react';
import { Globe, Loader2, Plus, Trash2, Users } from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { MarketingResults } from '../../components/marketing/MarketingResults';
import { runCompetitorAudit, type MarketingToolResult } from '../../api/marketing';

export function CompetitorCompare() {
  const [url, setUrl] = useState('');
  const [competitors, setCompetitors] = useState(['', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<MarketingToolResult | null>(null);

  const run = async () => {
    setLoading(true);
    setError('');
    try {
      setResult(await runCompetitorAudit(url.trim(), competitors.filter((c) => c.trim())));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const meta = result?.meta as {
    yourSite?: { score: number; domain: string };
    competitors?: { domain: string; score: number; wordCount: number }[];
    winner?: string;
  } | undefined;

  return (
    <div>
      <Header title="Competitor Compare" subtitle="Marketing" />
      <div className="space-y-6 p-8">
        <div className="rounded-2xl border border-accent-cyan/20 bg-gradient-to-r from-accent-cyan/10 to-accent-violet/5 px-5 py-4 text-sm text-slate-300">
          Compare your site against up to 3 competitors — SEO scores, content depth, and schema usage side-by-side.
        </div>

        <div className="glass-card space-y-4 p-5">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Your website</label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://yoursite.com" className="input-field pl-10" />
            </div>
          </div>
          {competitors.map((c, i) => (
            <div key={i}>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Competitor {i + 1}</label>
              <div className="flex gap-2">
                <input
                  value={c}
                  onChange={(e) => setCompetitors((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
                  placeholder="https://competitor.com"
                  className="input-field flex-1"
                />
                {competitors.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setCompetitors((prev) => prev.filter((_, j) => j !== i))}
                    className="rounded-xl border border-white/10 px-3 text-slate-400 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
          {competitors.length < 3 && (
            <button type="button" onClick={() => setCompetitors((p) => [...p, ''])} className="btn-secondary text-xs">
              <Plus className="h-3.5 w-3.5" /> Add competitor
            </button>
          )}
          <button onClick={run} disabled={loading || !url.trim()} className="btn-primary">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
            Compare sites
          </button>
        </div>

        {error && <p className="text-sm text-red-300">{error}</p>}
        {loading && (
          <p className="text-center text-slate-400">
            Auditing {competitors.filter(Boolean).length + 1} sites… This can take 1–2 minutes.
          </p>
        )}

        {meta?.yourSite && meta.competitors && (
          <div className="glass-card overflow-x-auto p-5">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase text-slate-500">
                  <th className="pb-3">Site</th>
                  <th className="pb-3">Score</th>
                  <th className="pb-3">Words</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-white/5">
                  <td className="py-2 font-semibold text-white">You · {meta.yourSite.domain}</td>
                  <td className="py-2 text-accent-cyan">{meta.yourSite.score}%</td>
                  <td className="py-2">—</td>
                </tr>
                {meta.competitors.map((c) => (
                  <tr key={c.domain} className="border-t border-white/5">
                    <td className="py-2 text-slate-300">{c.domain}</td>
                    <td className="py-2">{c.score}%</td>
                    <td className="py-2">{c.wordCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {meta.winner && <p className="mt-3 text-xs text-slate-400">Leader: {meta.winner}</p>}
          </div>
        )}

        {result && !loading && <MarketingResults result={result} />}
      </div>
    </div>
  );
}