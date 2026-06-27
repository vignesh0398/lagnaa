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
  MapPin,
  Phone,
  Search,
  Sparkles,
  Target,
  UserPlus,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { StatCard } from '../components/ui/StatCard';
import {
  ALL_CITIES_VALUE,
  downloadCsv,
  enrichMapsLeads,
  exportMapsLeads,
  getMapsLeadMeta,
  importMapsLeads,
  searchMapsLeads,
  type MapsLeadMeta,
  type MapsLeadResult,
} from '../api/mapsLeads';

const PRIORITY_STYLES: Record<string, string> = {
  high: 'bg-red-500/15 text-red-300',
  medium: 'bg-amber-500/15 text-amber-300',
  low: 'bg-slate-500/15 text-slate-400',
  none: 'bg-emerald-500/15 text-emerald-300',
};

export function MapsLeadFinder() {
  const [meta, setMeta] = useState<MapsLeadMeta | null>(null);
  const [leads, setLeads] = useState<MapsLeadResult[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [googleApiError, setGoogleApiError] = useState('');

  const [country, setCountry] = useState('IN');
  const [state, setState] = useState('Tamil Nadu');
  const [city, setCity] = useState('Chennai');
  const [industry, setIndustry] = useState('restaurant');
  const [query, setQuery] = useState('');
  const [hasPhone, setHasPhone] = useState(false);
  const [hasEmail, setHasEmail] = useState(false);
  const [needsWebsite, setNeedsWebsite] = useState(false);
  const [needsSocial, setNeedsSocial] = useState(false);
  const [outreachOnly, setOutreachOnly] = useState(false);
  const [enrichOnSearch, setEnrichOnSearch] = useState(false);
  const [importTag, setImportTag] = useState('maps-lead');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [dataSource, setDataSource] = useState<'google_places' | 'openstreetmap' | 'demo'>('demo');

  const statesForCountry = useMemo(() => meta?.locations[country] ?? [], [meta, country]);
  const citiesForState = useMemo(() => {
    const match = statesForCountry.find((s) => s.label === state);
    return match?.cities ?? [];
  }, [statesForCountry, state]);
  const hasLocationDropdowns = statesForCountry.length > 0;

  useEffect(() => {
    void getMapsLeadMeta()
      .then((m) => {
        setMeta(m);
        const tamilNadu = m.locations.IN?.find((s) => s.label === 'Tamil Nadu');
        if (tamilNadu) {
          setCountry('IN');
          setState('Tamil Nadu');
          setCity('Chennai');
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const handleCountryChange = (nextCountry: string) => {
    setCountry(nextCountry);
    const states = meta?.locations[nextCountry] ?? [];
    if (states.length) {
      setState(states[0].label);
      setCity(states[0].cities[0] ?? ALL_CITIES_VALUE);
    } else {
      setState('');
      setCity('');
    }
  };

  const handleStateChange = (nextState: string) => {
    setState(nextState);
    const match = (meta?.locations[country] ?? []).find((s) => s.label === nextState);
    setCity(match?.cities[0] ?? ALL_CITIES_VALUE);
  };

  const runSearch = useCallback(
    async (nextPage = 1) => {
      if (!state.trim() && !city.trim()) {
        setError('Select a state and city (or search all cities in a state).');
        return;
      }
      setSearching(true);
      setError('');
      setSuccess('');
      setSelected(new Set());
      try {
        const result = await searchMapsLeads({
          country,
          state: state.trim() || undefined,
          city: city.trim(),
          industry,
          query: query.trim() || undefined,
          hasPhone,
          hasEmail,
          needsWebsite,
          needsSocial,
          outreachOnly,
          enrichWebsites: enrichOnSearch,
          page: nextPage,
          pageSize: 20,
        });
        setLeads(result.leads);
        setPage(result.page);
        setTotalPages(result.totalPages);
        setTotal(result.total);
        setDataSource(result.source);
        setStatusMessage(result.message ?? '');
        setGoogleApiError(result.googleApiError ?? '');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Search failed');
      } finally {
        setSearching(false);
      }
    },
    [country, state, city, industry, query, hasPhone, hasEmail, needsWebsite, needsSocial, outreachOnly, enrichOnSearch]
  );

  const selectedLeads = useMemo(() => leads.filter((l) => selected.has(l.id)), [leads, selected]);

  const outreachHigh = leads.filter((l) => l.outreachPriority === 'high').length;
  const withPhone = leads.filter((l) => l.phone).length;
  const needsWeb = leads.filter((l) => l.needsWebsite).length;

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleEnrich = async () => {
    if (!selectedLeads.length) {
      setError('Select leads to scan websites for email & social media.');
      return;
    }
    setEnriching(true);
    setError('');
    try {
      const result = await enrichMapsLeads(
        selectedLeads.map((l) => l.id),
        leads
      );
      const byId = new Map(result.leads.map((l) => [l.id, l]));
      setLeads((prev) => prev.map((l) => byId.get(l.id) ?? l));
      setSuccess(`Enriched ${selectedLeads.length} business(es) with website, email & social data.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enrichment failed');
    } finally {
      setEnriching(false);
    }
  };

  const handleExport = async (rows: MapsLeadResult[]) => {
    if (!rows.length) {
      setError('Nothing to export.');
      return;
    }
    setExporting(true);
    try {
      const result = await exportMapsLeads(rows);
      downloadCsv(result.csv, result.filename);
      setSuccess(`Exported ${rows.length} lead(s) to CSV.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    if (!selectedLeads.length) {
      setError('Select leads to import into Contacts.');
      return;
    }
    setImporting(true);
    setError('');
    try {
      const result = await importMapsLeads(selectedLeads, importTag);
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
        title="Maps Lead Finder"
        subtitle="Local businesses from Maps-style data — pitch website & marketing"
        actions={
          <span className="rounded-full bg-accent-emerald/15 px-3 py-1 text-xs font-semibold text-accent-emerald">
            beta
          </span>
        }
      />

      <div className="mb-6 rounded-2xl border border-accent-cyan/20 bg-accent-cyan/5 p-4">
        <div className="flex gap-3">
          <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-accent-cyan" />
          <div className="text-sm text-slate-300">
            <p>{meta?.disclaimer}</p>
            {!meta?.googleApiConfigured && (
              <p className="mt-2 text-xs text-amber-300">
                Optional: add <code className="text-amber-200">GOOGLE_PLACES_API_KEY</code> to .env for full Google Maps
                search. Without it, we use free OpenStreetMap data.
              </p>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs text-slate-500">Country</label>
          <select value={country} onChange={(e) => handleCountryChange(e.target.value)} className="input-field text-sm">
            {meta?.countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">State / Region</label>
          {hasLocationDropdowns ? (
            <select value={state} onChange={(e) => handleStateChange(e.target.value)} className="input-field text-sm">
              {statesForCountry.map((s) => (
                <option key={s.code} value={s.label}>
                  {s.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="e.g. Texas, Greater London"
              className="input-field text-sm"
            />
          )}
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">City</label>
          {hasLocationDropdowns ? (
            <select value={city} onChange={(e) => setCity(e.target.value)} className="input-field text-sm">
              <option value={ALL_CITIES_VALUE}>All cities in state</option>
              {citiesForState.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. London, Chennai"
              className="input-field text-sm"
            />
          )}
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">Industry</label>
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="input-field text-sm"
          >
            {meta?.industries.map((i) => (
              <option key={i.id} value={i.id}>
                {i.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-4">
        <label className="mb-1 block text-xs text-slate-500">Business name keyword (optional)</label>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. pizza, dental, primary school"
          className="input-field text-sm"
        />
      </div>

      <div className="mb-6 flex flex-wrap gap-4 text-xs text-slate-400">
        {[
          { checked: hasPhone, set: setHasPhone, label: 'Has phone' },
          { checked: hasEmail, set: setHasEmail, label: 'Has email' },
          { checked: needsWebsite, set: setNeedsWebsite, label: 'Needs website (pitch web)' },
          { checked: needsSocial, set: setNeedsSocial, label: 'Needs social media' },
          { checked: outreachOnly, set: setOutreachOnly, label: 'Outreach priority only' },
          { checked: enrichOnSearch, set: setEnrichOnSearch, label: 'Scan websites on search' },
        ].map(({ checked, set, label }) => (
          <label key={label} className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={checked} onChange={(e) => set(e.target.checked)} className="accent-accent-cyan" />
            {label}
          </label>
        ))}
      </div>

      <button
        type="button"
        onClick={() => void runSearch(1)}
        disabled={searching}
        className="btn-primary mb-6"
      >
        {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        {searching ? 'Searching maps data…' : 'Find local businesses'}
      </button>

      {googleApiError && (
        <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-300">
          {googleApiError}{' '}
          <a
            href="https://console.cloud.google.com/apis/library/places.googleapis.com"
            target="_blank"
            rel="noreferrer"
            className="text-amber-200 underline"
          >
            Enable Places API (New)
          </a>
        </div>
      )}

      {statusMessage && (
        <p className="mb-4 text-xs text-slate-500">
          Source: <span className="text-accent-cyan">{dataSource}</span> · {statusMessage}
        </p>
      )}

      {leads.length > 0 && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Results" value={total} icon={Building2} accent="cyan" />
            <StatCard label="High outreach" value={outreachHigh} icon={Target} accent="pink" />
            <StatCard label="With phone" value={withPhone} icon={Phone} accent="violet" />
            <StatCard label="Needs website" value={needsWeb} icon={Globe} accent="emerald" />
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => void handleEnrich()} disabled={enriching} className="btn-secondary text-xs">
              {enriching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Enrich selected
            </button>
            <button
              type="button"
              onClick={() => void handleExport(selectedLeads.length ? selectedLeads : leads)}
              disabled={exporting}
              className="btn-secondary text-xs"
            >
              {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Export CSV {selectedLeads.length ? `(${selectedLeads.length})` : '(all)'}
            </button>
            <input
              value={importTag}
              onChange={(e) => setImportTag(e.target.value)}
              placeholder="Import tag"
              className="input-field w-32 text-xs"
            />
            <button type="button" onClick={() => void handleImport()} disabled={importing} className="btn-primary text-xs">
              {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
              Import to Contacts
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/5">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-white/5 bg-white/[0.03] text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="p-3">
                    <input
                      type="checkbox"
                      checked={selected.size === leads.length && leads.length > 0}
                      onChange={() =>
                        setSelected(selected.size === leads.length ? new Set() : new Set(leads.map((l) => l.id)))
                      }
                    />
                  </th>
                  <th className="p-3">Business</th>
                  <th className="p-3">Contact</th>
                  <th className="p-3">Digital</th>
                  <th className="p-3">Outreach</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="p-3">
                      <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggleSelect(l.id)} />
                    </td>
                    <td className="p-3">
                      <p className="font-medium text-white">{l.name}</p>
                      <p className="text-xs text-slate-500">{l.industry}</p>
                      <p className="text-xs text-slate-600">
                        {[l.city, l.state, l.country].filter(Boolean).join(', ')}
                      </p>
                      {l.address && <p className="text-[10px] text-slate-600">{l.address}</p>}
                    </td>
                    <td className="p-3 text-xs">
                      {l.phone && (
                        <p className="flex items-center gap-1 text-slate-300">
                          <Phone className="h-3 w-3" /> {l.phone}
                        </p>
                      )}
                      {l.email && (
                        <p className="flex items-center gap-1 text-slate-300">
                          <Mail className="h-3 w-3" /> {l.email}
                        </p>
                      )}
                      {l.googleMapsUrl && (
                        <a
                          href={l.googleMapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-accent-cyan hover:underline"
                        >
                          <MapPin className="h-3 w-3" /> Maps
                        </a>
                      )}
                    </td>
                    <td className="p-3 text-xs">
                      {l.website ? (
                        <a href={l.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-accent-violet hover:underline">
                          <Globe className="h-3 w-3" /> Website
                        </a>
                      ) : (
                        <span className="text-amber-400">No website</span>
                      )}
                      <div className="mt-1 flex flex-wrap gap-1">
                        {l.facebook && <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px]">FB</span>}
                        {l.instagram && <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px]">IG</span>}
                        {l.linkedin && <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px]">LI</span>}
                        {!l.facebook && !l.instagram && !l.linkedin && (
                          <span className="text-[10px] text-amber-500">No social</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${PRIORITY_STYLES[l.outreachPriority]}`}>
                        {l.outreachPriority}
                      </span>
                      <p className="mt-1 max-w-[200px] text-[10px] leading-snug text-slate-500">{l.outreachReason}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

      {leads.length === 0 && !searching && (
        <div className="rounded-2xl border border-dashed border-white/10 bg-surface-800/30 p-12 text-center">
          <MapPin className="mx-auto mb-4 h-10 w-10 text-accent-cyan/50" />
          <h3 className="text-lg font-semibold text-white">Find businesses to pitch web & marketing</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-400">
            Select country, state, and city (or search all cities in a state), then pick an industry. We pull phone,
            website, and social data, then flag businesses missing a proper website or social presence.
          </p>
          <a
            href={meta?.signupUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-1 text-xs text-accent-cyan hover:underline"
          >
            Get Google Places API key <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  );
}