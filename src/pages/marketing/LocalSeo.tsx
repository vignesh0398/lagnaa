import { useState } from 'react';
import { Globe, Loader2, MapPin } from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { MarketingResults } from '../../components/marketing/MarketingResults';
import { runLocalAudit, type MarketingToolResult } from '../../api/marketing';

export function LocalSeo() {
  const [url, setUrl] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<MarketingToolResult | null>(null);

  const run = async () => {
    setLoading(true);
    setError('');
    try {
      setResult(await runLocalAudit(url.trim(), businessName.trim(), city.trim()));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Header title="Local SEO" subtitle="Marketing" />
      <div className="space-y-6 p-8">
        <div className="rounded-2xl border border-accent-emerald/20 bg-gradient-to-r from-accent-emerald/10 to-accent-cyan/5 px-5 py-4 text-sm text-slate-300">
          Audit local ranking signals — NAP, maps, LocalBusiness schema, and city targeting for shops, clinics, and service businesses.
        </div>

        <div className="glass-card grid gap-4 p-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Website URL</label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://yourbusiness.com" className="input-field pl-10" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Business name</label>
            <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Acme Dental" className="input-field" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">City / area</label>
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="London" className="input-field" />
          </div>
          <div className="md:col-span-2">
            <button onClick={run} disabled={loading || !url.trim()} className="btn-primary">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
              Run local SEO audit
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-300">{error}</p>}
        {result && !loading && <MarketingResults result={result} />}
      </div>
    </div>
  );
}