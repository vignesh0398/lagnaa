import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  AlertCircle,
  Bot,
  HeartPulse,
  Loader2,
  Phone,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { StatCard } from '../components/ui/StatCard';
import { getDashboardStats, type DashboardStats } from '../api/dashboard';

const QUICK_LINKS = [
  { to: '/contacts', label: 'Contacts' },
  { to: '/agents', label: 'Agents' },
  { to: '/calls', label: 'Call History' },
  { to: '/gateway', label: 'Connections' },
];

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setStats(await getDashboardStats());
    } catch {
      setStats(null);
      setError('Could not load dashboard. Check that the API server is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const maxCalls = Math.max(...(stats?.callsPerDay.map((d) => d.count) ?? [1]), 1);
  const needsSetup = stats && !stats.connected && !stats.groqConnected && !stats.publishedAgentName;

  return (
    <div>
      <Header title="Dashboard" subtitle="CRM overview & activity" onRefresh={load} />

      <div className="space-y-6 p-8">
        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-accent-cyan" />
          </div>
        )}

        {!loading && error && (
          <div className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        {!loading && stats && (
          <>
            {needsSetup && (
              <div className="flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-5 py-4">
                <AlertCircle className="h-5 w-5 shrink-0 text-amber-400" />
                <div>
                  <p className="text-sm text-amber-200">Get started — connect Twilio and Groq, then publish an agent.</p>
                  <Link to="/gateway" className="text-xs text-accent-cyan hover:underline">
                    Open Connections →
                  </Link>
                </div>
              </div>
            )}

            {stats.twilioError && (
              <div className="flex items-center gap-3 rounded-2xl border border-amber-500/15 bg-amber-500/5 px-5 py-3">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
                <p className="text-xs text-amber-200/90">
                  Twilio live sync unavailable — showing local CRM data. ({stats.twilioError})
                </p>
              </div>
            )}

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3"
            >
              <p className="text-sm text-slate-300">
                {stats.publishedAgentName
                  ? `Published agent: ${stats.publishedAgentName}`
                  : 'No agent published yet'}
                {stats.groqConnected ? ' · Groq connected' : ''}
                {stats.connected ? ' · Twilio live' : stats.twilioConfigured ? ' · Twilio saved' : ''}
              </p>
              <span className="text-xs text-slate-500">Updated {stats.lastUpdated}</span>
            </motion.div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Contacts"
                value={stats.totalContacts ?? 0}
                icon={Users}
                accent="pink"
                delay={0.05}
                trend="In your CRM"
              />
              <StatCard
                label="Calls Today"
                value={stats.callsToday ?? 0}
                icon={Zap}
                accent="emerald"
                delay={0.1}
                trend="Voice AI"
              />
              <StatCard
                label="Total Calls"
                value={stats.totalCalls}
                icon={Phone}
                accent="cyan"
                delay={0.15}
              />
              <StatCard
                label="Active Agents"
                value={stats.activeAgents}
                icon={Bot}
                accent="violet"
                delay={0.2}
                trend={
                  stats.totalAgents && stats.totalAgents > 1
                    ? `${stats.totalAgents} prompts total`
                    : stats.publishedAgentName ?? 'Publish in Agents'
                }
              />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6 lg:col-span-1"
              >
                <div className="mb-4 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-accent-emerald" />
                  <h3 className="font-semibold text-white">Connections</h3>
                </div>
                <div className="mb-4 flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      stats.systemHealth === 'Healthy'
                        ? 'bg-accent-emerald animate-pulse'
                        : stats.systemHealth === 'Partial'
                          ? 'bg-amber-400'
                          : 'bg-slate-500'
                    }`}
                  />
                  <span className="text-sm font-medium text-slate-300">{stats.cluster.status}</span>
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'Services', value: stats.cluster.servicesHealthy },
                    { label: 'Outbound number', value: stats.cluster.nodesReady },
                    { label: 'System health', value: stats.systemHealth },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                      <span className="text-sm text-slate-400">{item.label}</span>
                      <span className="max-w-[55%] truncate text-right font-mono text-xs font-medium text-white">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {QUICK_LINKS.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-medium text-slate-300 transition hover:border-accent-cyan/30 hover:text-white"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6 lg:col-span-2"
              >
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-accent-cyan" />
                    <h3 className="font-semibold text-white">Calls per Day</h3>
                  </div>
                  <span className="text-xs text-slate-500">Last 9 days</span>
                </div>
                {stats.callsPerDay.every((d) => d.count === 0) ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Phone className="mb-3 h-8 w-8 text-slate-600" />
                    <p className="text-sm text-slate-400">No calls recorded yet.</p>
                    <Link to="/contacts" className="mt-2 text-xs text-accent-cyan hover:underline">
                      Add contacts and run your first AI call →
                    </Link>
                  </div>
                ) : (
                  <div className="flex h-48 items-end gap-2">
                    {stats.callsPerDay.map((day, i) => (
                      <div key={day.date} className="group flex flex-1 flex-col items-center gap-2">
                        <span className="text-[10px] font-medium text-slate-400 opacity-0 transition group-hover:opacity-100">
                          {day.count}
                        </span>
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${Math.max((day.count / maxCalls) * 100, day.count > 0 ? 8 : 0)}%` }}
                          transition={{ delay: 0.2 + i * 0.05 }}
                          className="w-full min-h-[4px] rounded-t-lg bg-gradient-to-t from-accent-violet to-accent-cyan opacity-80 group-hover:opacity-100"
                        />
                        <span className="text-[10px] text-slate-500">{day.date.split(' ')[1]}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HeartPulse className="h-4 w-4 text-accent-violet" />
                  <h3 className="font-semibold text-white">Recent Calls</h3>
                </div>
                <Link to="/calls" className="text-xs text-accent-cyan hover:underline">
                  View all →
                </Link>
              </div>
              {!stats.recentCalls?.length ? (
                <p className="py-6 text-center text-sm text-slate-500">No call history yet.</p>
              ) : (
                <div className="divide-y divide-white/5">
                  {stats.recentCalls.map((call, i) => (
                    <div key={`${call.time}-${i}`} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">{call.customerName}</p>
                        <p className="text-xs text-slate-500">{call.agent}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs font-medium text-slate-300">{call.outcome}</p>
                        <p className="text-[10px] text-slate-600">
                          {new Date(call.time).toLocaleString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}