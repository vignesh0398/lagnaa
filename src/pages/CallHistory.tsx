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
  Phone,
  Plug,
  Search,
  X,
  MessageSquare,
} from 'lucide-react';
import { SyncScrollTable } from '../components/ui/SyncScrollTable';
import { exportCallsToExcel } from '../utils/exportCalls';
import { Header } from '../components/layout/Header';
import { EmptyState } from '../components/ui/EmptyState';
import { getCallTranscript, getTwilioCalls } from '../api/twilio';
import {
  CALL_HISTORY_COLUMNS,
  type CallHistoryRecord,
  type DateRangePreset,
} from '../types/calls';

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

function cellValue(call: CallHistoryRecord, key: keyof CallHistoryRecord): string {
  const val = call[key];
  if (key === 'time') return formatTime(call.time);
  if (key === 'endToEndLatencyMs') return val != null ? `${val} ms` : '—';
  if (key === 'sessionId') return String(val).slice(0, 14) + '…';
  if (key === 'summary' || key === 'clientNotes') {
    const s = String(val ?? '—');
    return s.length > 40 ? s.slice(0, 37) + '…' : s;
  }
  return String(val ?? '—');
}

export function CallHistory() {
  const [calls, setCalls] = useState<CallHistoryRecord[]>([]);
  const [stats, setStats] = useState({ total: 0, ended: 0, notConnected: 0, successful: 0, inProgress: 0 });
  const [loading, setLoading] = useState(true);
  const [notConnected, setNotConnected] = useState(false);
  const [selectedCall, setSelectedCall] = useState<CallHistoryRecord | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);

  const [dateRange, setDateRange] = useState<DateRangePreset>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterColumn, setFilterColumn] = useState<keyof CallHistoryRecord | ''>('');
  const [filterValue, setFilterValue] = useState('');
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const PAGE_SIZES = [10, 20, 50, 100];

  const loadCalls = useCallback(async () => {
    setLoading(true);
    setNotConnected(false);
    try {
      const data = await getTwilioCalls({
        limit: 200,
        dateRange,
        dateFrom: dateRange === 'custom' ? dateFrom : undefined,
        dateTo: dateRange === 'custom' ? dateTo : undefined,
        filterColumn: filterColumn || undefined,
        filterValue: filterValue || undefined,
      });
      setCalls(data.calls);
      setStats(data.stats);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('not configured') || msg.includes('503')) setNotConnected(true);
      setCalls([]);
    } finally {
      setLoading(false);
    }
  }, [dateRange, dateFrom, dateTo, filterColumn, filterValue]);

  useEffect(() => {
    loadCalls();
  }, [loadCalls]);

  useEffect(() => {
    if (!selectedCall) {
      setTranscript(null);
      return;
    }
    getCallTranscript(selectedCall.sessionId)
      .then((d) => setTranscript(d.transcript))
      .catch(() => setTranscript(null));
  }, [selectedCall]);

  const filtered = useMemo(() => {
    if (!search.trim()) return calls;
    const q = search.toLowerCase();
    return calls.filter((c) =>
      CALL_HISTORY_COLUMNS.some(({ key }) => String(c[key] ?? '').toLowerCase().includes(q))
    );
  }, [calls, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginated = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [search, dateRange, filterValue, pageSize]);

  const statCards = [
    { label: 'Total', value: stats.total, color: 'text-accent-cyan' },
    { label: 'Ended', value: stats.ended, color: 'text-accent-emerald' },
    { label: 'Not Connected', value: stats.notConnected, color: 'text-amber-400' },
    { label: 'Successful', value: stats.successful, color: 'text-accent-violet' },
    { label: 'In Progress', value: stats.inProgress, color: 'text-accent-pink' },
  ];

  return (
    <div>
      <Header
        title="Call History"
        subtitle="Session Analytics"
        onRefresh={loadCalls}
        actions={
          <button
            onClick={() => exportCallsToExcel(filtered)}
            disabled={filtered.length === 0}
            className="btn-secondary text-xs"
          >
            <Download className="h-4 w-4" />
            Export Excel
          </button>
        }
      />

      <div className="space-y-6 p-8">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-accent-cyan" />
          </div>
        ) : notConnected ? (
          <EmptyState
            icon={Plug}
            title="No call data yet"
            description="Connect Twilio in Connections. Real calls will appear here with full session analytics."
            action={<Link to="/gateway" className="btn-primary">Open Connections</Link>}
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
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
                  <label className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <Filter className="h-3 w-3" /> Filter Column
                  </label>
                  <select
                    value={filterColumn}
                    onChange={(e) => setFilterColumn(e.target.value as keyof CallHistoryRecord | '')}
                    className="input-field text-sm"
                  >
                    <option value="">Any column</option>
                    {CALL_HISTORY_COLUMNS.map((c) => (
                      <option key={c.key} value={c.key}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div className="min-w-[160px] flex-1">
                  <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">Filter Value</label>
                  <input
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                    placeholder="e.g. Consent Given, outbound..."
                    className="input-field text-sm"
                  />
                </div>
                <button onClick={loadCalls} className="btn-secondary text-xs">Apply Filters</button>
              </div>
            </div>

            {calls.length === 0 ? (
              <EmptyState
                icon={Phone}
                title="No calls in this range"
                description="Try a different date range or place a call from Agents."
                action={<Link to="/agents" className="btn-primary">Go to Agents</Link>}
              />
            ) : (
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
                    {filtered.length} sessions · page {safePage} of {totalPages}
                  </span>
                </div>

                <SyncScrollTable minWidth={2400}>
                  <table className="w-full min-w-[2400px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {CALL_HISTORY_COLUMNS.map((col) => (
                          <th key={col.key} className="whitespace-nowrap px-3 py-3">{col.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((call, i) => (
                        <motion.tr
                          key={call.sessionId}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.02 }}
                          onClick={() => setSelectedCall(call)}
                          className="cursor-pointer border-b border-white/5 hover:bg-white/5"
                        >
                          {CALL_HISTORY_COLUMNS.map((col) => (
                            <td key={col.key} className="whitespace-nowrap px-3 py-2.5 text-slate-300">
                              {cellValue(call, col.key)}
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
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                      let pageNum = i + 1;
                      if (totalPages > 7) {
                        if (safePage <= 4) pageNum = i + 1;
                        else if (safePage >= totalPages - 3) pageNum = totalPages - 6 + i;
                        else pageNum = safePage - 3 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                            pageNum === safePage
                              ? 'bg-accent-cyan/20 text-accent-cyan'
                              : 'text-slate-400 hover:bg-white/5'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
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
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {selectedCall && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-8 backdrop-blur-sm"
            onClick={() => setSelectedCall(null)}
          >
            <motion.div
              initial={{ scale: 0.98, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card mb-8 w-full max-w-2xl p-6"
            >
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Session Details</h3>
                <button onClick={() => setSelectedCall(null)} className="text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="mb-4 font-mono text-xs text-accent-cyan">{selectedCall.sessionId}</p>

              <div className="mb-4 grid gap-2 sm:grid-cols-2">
                {CALL_HISTORY_COLUMNS.map((col) => (
                  <div key={col.key} className="rounded-lg bg-white/5 px-3 py-2">
                    <p className="text-[10px] uppercase text-slate-500">{col.label}</p>
                    <p className="mt-0.5 text-sm text-slate-200">
                      {col.key === 'time'
                        ? formatTime(selectedCall.time)
                        : col.key === 'endToEndLatencyMs'
                          ? selectedCall.endToEndLatencyMs != null
                            ? `${selectedCall.endToEndLatencyMs} ms`
                            : '—'
                          : String(selectedCall[col.key] ?? '—')}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 rounded-xl bg-white/5 p-4">
                <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">Transcript</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">
                    {transcript ?? 'No transcript stored for this session.'}
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