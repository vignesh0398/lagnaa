import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Download,
  ExternalLink,
  Globe,
  Loader2,
  Mail,
  Phone,
  Search,
  Sparkles,
  UserPlus,
  Users,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { StatCard } from '../components/ui/StatCard';
import {
  enrichProspects,
  getProspectMeta,
  importProspects,
  searchProspects,
  type CountryCode,
  type CountryMeta,
  type ProspectMeta,
  type ProspectResult,
  type TitleLevel,
} from '../api/prospects';

export function ProspectFinder() {
  const [meta, setMeta] = useState<ProspectMeta | null>(null);
  const [prospects, setProspects] = useState<ProspectResult[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const [country, setCountry] = useState<CountryCode>('GB');
  const [query, setQuery] = useState('');
  const [sicCode, setSicCode] = useState('');
  const [region, setRegion] = useState('');
  const [titleLevel, setTitleLevel] = useState<TitleLevel>('all');
  const [hasEmail, setHasEmail] = useState(false);
  const [hasPhone, setHasPhone] = useState(false);
  const [enrichWebsites, setEnrichWebsites] = useState(false);
  const [importTag, setImportTag] = useState('prospect');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [dataSource, setDataSource] = useState<'live' | 'demo'>('demo');

  const selectedCountryMeta = useMemo(
    () => meta?.countries.find((c) => c.code === country),
    [meta, country]
  );

  const loadMeta = useCallback(async (code: CountryCode) => {
    setLoading(true);
    try {
      const m = await getProspectMeta(code);
      setMeta(m);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load Prospect Finder');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMeta(country);
  }, [country, loadMeta]);

  const handleCountryChange = (code: CountryCode) => {
    setCountry(code);
    setSicCode('');
    setRegion('');
    setProspects([]);
    setSelected(new Set());
    setStatusMessage('');
  };

  const runSearch = useCallback(
    async (nextPage = 1) => {
      setSearching(true);
      setError('');
      setSuccess('');
      setSelected(new Set());
      try {
        const result = await searchProspects({
          country,
          query: query.trim() || undefined,
          sicCode: sicCode || undefined,
          region: region || undefined,
          titleLevel,
          hasEmail,
          hasPhone,
          enrichWebsites,
          page: nextPage,
          pageSize: 20,
        });
        setProspects(result.prospects);
        setPage(result.page);
        setTotalPages(result.totalPages);
        setTotal(result.total);
        setDataSource(result.source);
        setStatusMessage(result.message ?? '');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Search failed');
      } finally {
        setSearching(false);
      }
    },
    [country, query, sicCode, region, titleLevel, hasEmail, hasPhone, enrichWebsites]
  );

  const countryModeLabel = (c: CountryMeta) => {
    if (c.mode === 'live_officers') return c.liveReady ? 'Live officers' : 'Demo';
    if (c.mode === 'live_companies') return c.liveReady ? 'Live companies' : 'Demo';
    return 'Sample data';
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === prospects.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(prospects.map((p) => p.id)));
    }
  };

  const selectedProspects = useMemo(
    () => prospects.filter((p) => selected.has(p.id)),
    [prospects, selected]
  );

  const withEmail = prospects.filter((p) => p.email).length;
  const withPhone = prospects.filter((p) => p.phone).length;

  const handleEnrich = async () => {
    if (!selectedProspects.length) {
      setError('Select prospects to scan websites for contact info.');
      return;
    }
    setEnriching(true);
    setError('');
    try {
      const result = await enrichProspects(
        selectedProspects.map((p) => p.id),
        prospects
      );
      const byId = new Map(result.prospects.map((p) => [p.id, p]));
      setProspects((prev) => prev.map((p) => byId.get(p.id) ?? p));
      setSuccess(`Scanned ${selectedProspects.length} company website(s) for public contact details.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enrichment failed');
    } finally {
      setEnriching(false);
    }
  };

  const handleImport = async () => {
    if (!selectedProspects.length) {
      setError('Select prospects to import into Contacts.');
      return;
    }
    setImporting(true);
    setError('');
    try {
      const result = await importProspects(selectedProspects, importTag);
      setSuccess(result.message);
      setSelected(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent-cyan" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <Header
        title="Prospect Finder"
        subtitle="Multi-country prospect search — 100% free data sources"
        actions={
          <span className="rounded-full bg-accent-violet/15 px-3 py-1 text-xs font-semibold text-accent-violet">
            beta
          </span>
        }
      />

      <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <div className="text-sm text-slate-300">
            <p className="font-medium text-amber-200">100% free data sources</p>
            <p className="mt-1 leading-relaxed text-slate-400">
              {meta?.disclaimer}{' '}
              {meta?.envKey && !meta.apiKeyConfigured && meta.signupUrl && (
                <>
                  For live {selectedCountryMeta?.label ?? 'registry'} data, register at{' '}
                  <a href={meta.signupUrl} target="_blank" rel="noreferrer" className="text-accent-cyan hover:underline">
                    {meta.dataSource}
                  </a>{' '}
                  and add <code className="text-xs text-slate-300">{meta.envKey}</code> to your{' '}
                  <code className="text-xs text-slate-300">.env</code> file.
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {(error || success || statusMessage) && (
        <div className="mb-6 space-y-2">
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 rounded-xl border border-accent-emerald/20 bg-accent-emerald/10 px-4 py-3 text-sm text-accent-emerald">
              <CheckCircle2 className="h-4 w-4" />
              {success}
            </div>
          )}
          {statusMessage && !error && (
            <div className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 text-sm text-slate-400">
              {statusMessage}
            </div>
          )}
        </div>
      )}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Country"
          value={`${selectedCountryMeta?.flag ?? ''} ${selectedCountryMeta?.label ?? country}`}
          icon={Building2}
        />
        <StatCard
          label="Data mode"
          value={dataSource === 'demo' ? 'Demo / sample' : selectedCountryMeta ? countryModeLabel(selectedCountryMeta) : 'Live'}
          icon={Globe}
        />
        <StatCard label="Results" value={String(total)} icon={Users} />
        <StatCard label="With email" value={String(withEmail)} icon={Mail} />
        <StatCard label="With phone" value={String(withPhone)} icon={Phone} />
      </div>

      <div className="mb-8 rounded-2xl border border-white/5 bg-surface-800/50 p-6">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
          <Search className="h-4 w-4 text-accent-cyan" />
          Search filters
        </h2>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <label className="block md:col-span-2 lg:col-span-3">
            <span className="mb-1.5 block text-xs text-slate-500">Country</span>
            <select
              value={country}
              onChange={(e) => handleCountryChange(e.target.value as CountryCode)}
              className="w-full rounded-xl border border-white/10 bg-surface-900 px-4 py-2.5 text-sm text-white focus:border-accent-cyan/50 focus:outline-none"
            >
              {meta?.countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.label} — {countryModeLabel(c)} ({c.liveSource})
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs text-slate-500">Company name keyword</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. digital, construction"
              className="w-full rounded-xl border border-white/10 bg-surface-900 px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-accent-cyan/50 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs text-slate-500">Industry</span>
            <select
              value={sicCode}
              onChange={(e) => setSicCode(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-surface-900 px-4 py-2.5 text-sm text-white focus:border-accent-cyan/50 focus:outline-none"
            >
              <option value="">All industries</option>
              {meta?.industries.map((i) => (
                <option key={i.code} value={i.code}>
                  {i.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs text-slate-500">Region</span>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-surface-900 px-4 py-2.5 text-sm text-white focus:border-accent-cyan/50 focus:outline-none"
            >
              <option value="">All regions</option>
              {meta?.regions.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs text-slate-500">Person level</span>
            <select
              value={titleLevel}
              onChange={(e) => setTitleLevel(e.target.value as TitleLevel)}
              className="w-full rounded-xl border border-white/10 bg-surface-900 px-4 py-2.5 text-sm text-white focus:border-accent-cyan/50 focus:outline-none"
            >
              {meta?.titleLevels.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-col justify-end gap-3 md:col-span-2 lg:col-span-2">
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={hasEmail}
                  onChange={(e) => setHasEmail(e.target.checked)}
                  className="rounded border-white/20 bg-surface-900 text-accent-cyan"
                />
                Has email
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={hasPhone}
                  onChange={(e) => setHasPhone(e.target.checked)}
                  className="rounded border-white/20 bg-surface-900 text-accent-cyan"
                />
                Has phone
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={enrichWebsites}
                  onChange={(e) => setEnrichWebsites(e.target.checked)}
                  className="rounded border-white/20 bg-surface-900 text-accent-cyan"
                />
                Scan websites on search
              </label>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void runSearch(1)}
          disabled={searching}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-cyan to-accent-violet px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:opacity-90 disabled:opacity-50"
        >
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {searching ? 'Searching…' : 'Find prospects'}
        </button>
      </div>

      {prospects.length > 0 && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void handleEnrich()}
              disabled={enriching || !selected.size}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 hover:bg-white/10 disabled:opacity-40"
            >
              {enriching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
              Scan websites ({selected.size})
            </button>

            <div className="flex items-center gap-2">
              <input
                value={importTag}
                onChange={(e) => setImportTag(e.target.value)}
                placeholder="Import tag"
                className="w-32 rounded-lg border border-white/10 bg-surface-900 px-3 py-2 text-sm text-white"
              />
              <button
                type="button"
                onClick={() => void handleImport()}
                disabled={importing || !selected.size}
                className="inline-flex items-center gap-2 rounded-xl bg-accent-emerald/20 px-4 py-2 text-sm font-medium text-accent-emerald hover:bg-accent-emerald/30 disabled:opacity-40"
              >
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Import to Contacts
              </button>
            </div>

            <span className="text-xs text-slate-500">
              {selected.size} selected · Page {page} of {totalPages}
            </span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/5 bg-surface-800/40">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.size === prospects.length && prospects.length > 0}
                        onChange={toggleAll}
                        className="rounded border-white/20"
                      />
                    </th>
                    <th className="px-4 py-3">Person</th>
                    <th className="px-4 py-3">Company</th>
                    <th className="px-4 py-3">Industry</th>
                    <th className="px-4 py-3">Region</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {prospects.map((p) => (
                    <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(p.id)}
                          onChange={() => toggleSelect(p.id)}
                          className="rounded border-white/20"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">{p.fullName}</p>
                        <p className="text-xs text-slate-500">{p.title}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-slate-200">{p.company}</p>
                        <p className="text-xs text-slate-600">#{p.companyNumber}</p>
                        {p.website && (
                          <a
                            href={p.website}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-0.5 inline-flex items-center gap-1 text-xs text-accent-cyan hover:underline"
                          >
                            Website <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{p.industry}</td>
                      <td className="px-4 py-3 text-slate-400">{p.region || '—'}</td>
                      <td className="px-4 py-3">
                        {p.email ? (
                          <span className="text-accent-cyan">{p.email}</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {p.phone ? (
                          <span className="text-slate-300">{p.phone}</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex justify-center gap-2">
              <button
                type="button"
                disabled={page <= 1 || searching}
                onClick={() => void runSearch(page - 1)}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages || searching}
                onClick={() => void runSearch(page + 1)}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {prospects.length === 0 && !searching && (
        <div className="rounded-2xl border border-dashed border-white/10 bg-surface-800/30 p-12 text-center">
          <Sparkles className="mx-auto mb-4 h-10 w-10 text-accent-violet/50" />
          <h3 className="text-lg font-semibold text-white">Find decision-makers in 12 countries — free</h3>
          <p className="mx-auto mt-2 max-w-lg text-sm text-slate-400">
            Pick a country, filter by industry, region, and CEO/CFO/Director level, optionally scan public websites
            for contact details, then import leads into Contacts for calls and campaigns. UK has live director names;
            US, EU, Canada & more use free company registries.
          </p>
          <button
            type="button"
            onClick={() => void runSearch(1)}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/15"
          >
            <Download className="h-4 w-4" />
            Run demo search
          </button>
        </div>
      )}
    </div>
  );
}