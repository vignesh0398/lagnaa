import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Loader2,
  Mail,
  MessageSquare,
  Search,
  X,
} from 'lucide-react';
import { SyncScrollTable } from '../components/ui/SyncScrollTable';
import { exportEmailsToExcel } from '../utils/exportEmails';
import { Header } from '../components/layout/Header';
import { EmptyState } from '../components/ui/EmptyState';
import { getEmailCampaigns, getEmailHistory, getEmailTranscript } from '../api/email';
import {
  EMAIL_HISTORY_COLUMNS,
  type EmailHistoryRecord,
  type DateRangePreset,
} from '../types/emails';

const DATE_PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '4w', label: 'Last 4 Weeks' },
  { value: '3m', label: 'Last 3 Months' },
  { value: 'custom', label: 'Custom Range' },
];

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function cellValue(email: EmailHistoryRecord, key: keyof EmailHistoryRecord): string {
  const val = email[key];
  if (key === 'time') return formatTime(email.time);
  if (key === 'endToEndLatencyMs') return val != null ? `${val} ms` : '—';
  if (key === 'sessionId') return String(val).slice(0, 16) + '…';
  if (key === 'summary' || key === 'clientNotes') {
    const s = String(val ?? '—');
    return s.length > 40 ? s.slice(0, 37) + '…' : s;
  }
  return String(val ?? '—');
}

export function EmailChatHistory() {
  const [emails, setEmails] = useState<EmailHistoryRecord[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    ended: 0,
    awaiting: 0,
    successful: 0,
    inProgress: 0,
    consentGiven: 0,
  });
  const [campaigns, setCampaigns] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<EmailHistoryRecord | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);

  const [dateRange, setDateRange] = useState<DateRangePreset>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterColumn, setFilterColumn] = useState<keyof EmailHistoryRecord | ''>('');
  const [filterValue, setFilterValue] = useState('');
  const [campaignFilter, setCampaignFilter] = useState('');
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const PAGE_SIZES = [10, 20, 50, 100];

  const loadEmails = useCallback(async () => {
    setLoading(true);
    try {
      const [data, campData] = await Promise.all([
        getEmailHistory({
          dateRange,
          dateFrom: dateRange === 'custom' ? dateFrom : undefined,
          dateTo: dateRange === 'custom' ? dateTo : undefined,
          filterColumn: filterColumn || undefined,
          filterValue: filterValue || undefined,
          campaignId: campaignFilter || undefined,
        }),
        getEmailCampaigns(),
      ]);
      setEmails(data.emails);
      setStats({
        total: data.stats.total ?? 0,
        ended: data.stats.ended ?? 0,
        awaiting: data.stats.awaiting ?? 0,
        successful: data.stats.successful ?? 0,
        inProgress: data.stats.inProgress ?? 0,
        consentGiven: data.stats.consentGiven ?? 0,
      });
      setCampaigns(campData.campaigns.map((c) => ({ id: c.id, name: c.name })));
    } catch {
      setEmails([]);
    } finally {
      setLoading(false);
    }
  }, [dateRange, dateFrom, dateTo, filterColumn, filterValue, campaignFilter]);

  useEffect(() => {
    loadEmails();
  }, [loadEmails]);

  useEffect(() => {
    if (!selected) {
      setTranscript(null);
      return;
    }
    getEmailTranscript(selected.id)
      .then((d) => setTranscript(d.transcript))
      .catch(() => setTranscript(null));
  }, [selected]);

  const filtered = useMemo(() => {
    if (!search.trim()) return emails;
    const q = search.toLowerCase();
    return emails.filter((e) =>
      EMAIL_HISTORY_COLUMNS.some(({ key }) => String(e[key] ?? '').toLowerCase().includes(q))
    );
  }, [emails, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginated = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [search, dateRange, filterValue, campaignFilter, pageSize]);

  const statCards = [
    { label: 'Total Emails', value: stats.total, color: 'text-accent-emerald' },
    { label: 'In Progress', value: stats.inProgress, color: 'text-accent-cyan' },
    { label: 'Awaiting Reply', value: stats.awaiting, color: 'text-amber-400' },
    { label: 'Consent Given', value: stats.consentGiven, color: 'text-accent-violet' },
    { label: 'Successful', value: stats.successful, color: 'text-accent-pink' },
    { label: 'Ended', value: stats.ended, color: 'text-slate-300' },
  ];

  return (
    <div>
      <Header
        title="Email Chat History"
        subtitle="Campaign Conversations"
        onRefresh={loadEmails}
        actions={
          <>
            <Link to="/email" className="btn-secondary text-xs">
              Campaigns
            </Link>
            <button
              onClick={() => exportEmailsToExcel(filtered)}
              disabled={filtered.length === 0}
              className="btn-secondary text-xs"
            >
              <Download className="h-4 w-4" />
              Export Excel
            </button>
          </>
        }
      />

      <div className="space-y-6 p-8">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-accent-emerald" />
          </div>
        ) : emails.length === 0 ? (
          <EmptyState
            icon={Mail}
            title="No email chats yet"
            description="Run a campaign from Email Campaign — every sent message and AI conversation will appear here."
            action={<Link to="/email" className="btn-primary">Open Email Campaign</Link>}
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              {statCards.map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="glass-card p-4"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{s.label}</p>
                  <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
                </motion.div>
              ))}
            </div>

            <div className="glass-card p-4">
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <Calendar className="h-3 w-3" /> Date Range
                  </label>
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value as DateRangePreset)}
                    className="input-field text-sm"
                  >
                    {DATE_PRESETS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
                {dateRange === 'custom' && (
                  <>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">From</label>
                      <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input-field text-sm" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">To</label>
                      <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input-field text-sm" />
                    </div>
                  </>
                )}
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">Campaign</label>
                  <select
                    value={campaignFilter}
                    onChange={(e) => setCampaignFilter(e.target.value)}
                    className="input-field text-sm"
                  >
                    <option value="">All campaigns</option>
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <Filter className="h-3 w-3" /> Filter Column
                  </label>
                  <select
                    value={filterColumn}
                    onChange={(e) => setFilterColumn(e.target.value as keyof EmailHistoryRecord | '')}
                    className="input-field text-sm"
                  >
                    <option value="">Any column</option>
                    {EMAIL_HISTORY_COLUMNS.map((c) => (
                      <option key={c.key} value={c.key}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div className="min-w-[160px] flex-1">
                  <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">Filter Value</label>
                  <input
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                    placeholder="e.g. Consent Given, Mia..."
                    className="input-field text-sm"
                  />
                </div>
                <button onClick={loadEmails} className="btn-secondary text-xs">Apply Filters</button>
              </div>
            </div>

            <div className="glass-card overflow-hidden">
              <div className="flex flex-wrap items-center gap-3 border-b border-white/5 px-6 py-4">
                <div className="relative min-w-[200px] flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search all columns..."
                    className="input-field pl-10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-bold uppercase text-slate-500">Per page</label>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="input-field w-20 text-xs"
                  >
                    {PAGE_SIZES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <span className="text-xs text-accent-emerald">
                  {filtered.length} emails · page {safePage} of {totalPages}
                </span>
              </div>

              <SyncScrollTable minWidth={2800}>
                <table className="w-full min-w-[2800px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {EMAIL_HISTORY_COLUMNS.map((col) => (
                        <th key={col.key} className="whitespace-nowrap px-3 py-3">{col.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((email, i) => (
                      <motion.tr
                        key={email.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        onClick={() => setSelected(email)}
                        className="cursor-pointer border-b border-white/5 hover:bg-white/5"
                      >
                        {EMAIL_HISTORY_COLUMNS.map((col) => (
                          <td key={col.key} className="whitespace-nowrap px-3 py-2.5 text-slate-300">
                            {cellValue(email, col.key)}
                          </td>
                        ))}
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </SyncScrollTable>

              <div className="flex items-center justify-between border-t border-white/5 px-6 py-3">
                <p className="text-xs text-slate-500">
                  Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)} of {filtered.length}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                    className="btn-secondary px-2 py-1 text-xs disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage >= totalPages}
                    className="btn-secondary px-2 py-1 text-xs disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-8 backdrop-blur-sm"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ scale: 0.98, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card mb-8 w-full max-w-2xl p-6"
            >
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Email Session</h3>
                <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="mb-1 font-mono text-xs text-accent-emerald">{selected.sessionId}</p>
              <p className="mb-4 text-sm text-slate-400">
                {selected.customerName} · {selected.campaignName} · {formatTime(selected.time)}
              </p>

              <div className="mb-4 grid gap-2 sm:grid-cols-2">
                {EMAIL_HISTORY_COLUMNS.filter((c) =>
                  ['emailOutcome', 'consentGiven', 'verificationOutcome', 'interestLevel', 'sessionStatus', 'messageCount', 'currentStep'].includes(c.key)
                ).map((col) => (
                  <div key={col.key} className="rounded-lg bg-white/5 px-3 py-2">
                    <p className="text-[10px] uppercase text-slate-500">{col.label}</p>
                    <p className="mt-0.5 text-sm text-slate-200">{cellValue(selected, col.key)}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 rounded-xl bg-white/5 p-4">
                <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-accent-emerald" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase text-slate-500">Full Email Transcript</p>
                  <p className="mt-2 whitespace-pre-wrap font-mono text-sm leading-relaxed text-slate-300">
                    {transcript ?? 'Loading transcript...'}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}