import { useState } from 'react';
import { Globe, Loader2, Share2 } from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { MarketingResults } from '../../components/marketing/MarketingResults';
import { runSocialAudit, type MarketingToolResult } from '../../api/marketing';

export function SocialPreview() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<MarketingToolResult | null>(null);

  const run = async () => {
    setLoading(true);
    setError('');
    try {
      setResult(await runSocialAudit(url.trim()));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const previews = (result?.meta as { previews?: { platform: string; title: string; description: string; imageUrl: string; status: string }[] })?.previews;

  return (
    <div>
      <Header title="Social Preview" subtitle="Marketing" />
      <div className="space-y-6 p-8">
        <div className="rounded-2xl border border-accent-pink/20 bg-gradient-to-r from-accent-pink/10 to-accent-violet/5 px-5 py-4 text-sm text-slate-300">
          See how your link appears on Facebook, LinkedIn, Twitter/X, and WhatsApp — fix missing images and titles before you share.
        </div>

        <div className="glass-card flex flex-col gap-4 p-5 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Page URL</label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://yoursite.com/page" className="input-field pl-10" />
            </div>
          </div>
          <button onClick={run} disabled={loading || !url.trim()} className="btn-primary shrink-0">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
            Audit social tags
          </button>
        </div>

        {error && <p className="text-sm text-red-300">{error}</p>}

        {previews && (
          <div className="grid gap-4 md:grid-cols-2">
            {previews.map((p) => (
              <div key={p.platform} className="glass-card overflow-hidden border border-white/10">
                {p.imageUrl ? (
                  <div className="h-36 bg-cover bg-center" style={{ backgroundImage: `url(${p.imageUrl})` }} />
                ) : (
                  <div className="flex h-36 items-center justify-center bg-surface-800 text-xs text-slate-500">No preview image</div>
                )}
                <div className="p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{p.platform}</p>
                  <p className="mt-1 font-semibold text-white">{p.title}</p>
                  <p className="mt-1 text-xs text-slate-400 line-clamp-2">{p.description}</p>
                  <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] ${p.status === 'pass' ? 'bg-accent-emerald/20 text-accent-emerald' : p.status === 'warn' ? 'bg-amber-500/20 text-amber-300' : 'bg-red-500/20 text-red-300'}`}>
                    {p.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {result && !loading && <MarketingResults result={result} />}
      </div>
    </div>
  );
}