import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, AlertCircle, Bot, HeartPulse, Loader2, Phone, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { StatCard } from '../components/ui/StatCard';
import { getDashboardStats, type DashboardStats } from '../api/dashboard';

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setStats(await getDashboardStats());
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const maxCalls = Math.max(...(stats?.callsPerDay.map((d) => d.count) ?? [1]), 1);

  return (
    <div>
      <Header title="Dashboard" subtitle="Overview" onRefresh={load} />

      <div className="space-y-6 p-8">
        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-accent-cyan" />
          </div>
        )}

        {!loading && stats && !stats.connected && (
          <div className="flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-5 py-4">
            <AlertCircle className="h-5 w-5 text-amber-400" />
            <div>
              <p className="text-sm text-amber-200">Twilio is not connected — no live data yet.</p>
              <Link to="/gateway" className="text-xs text-accent-cyan hover:underline">
                Connect Twilio in Connections →
              </Link>
            </div>
          </div>
        )}

        {!loading && stats && (
          <>
            {stats.connected && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-between rounded-2xl border border-accent-emerald/20 bg-accent-emerald/5 px-5 py-3"
              >
                <p className="text-sm text-accent-emerald/90">Live data from your Twilio account.</p>
                <span className="text-xs text-slate-500">Updated {stats.lastUpdated}</span>
              </motion.div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <StatCard label="Active Agents" value={stats.activeAgents} icon={Bot} accent="violet" delay={0.1} />
              <StatCard label="Total Calls" value={stats.totalCalls} icon={Phone} accent="cyan" delay={0.15} />
              <StatCard label="System Health" value={stats.systemHealth} icon={HeartPulse} accent="emerald" delay={0.2} />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6 lg:col-span-1"
              >
                <div className="mb-4 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-accent-emerald" />
                  <h3 className="font-semibold text-white">Connection</h3>
                </div>
                <div className="mb-4 flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${stats.connected ? 'bg-accent-emerald animate-pulse' : 'bg-amber-400'}`} />
                  <span className="text-sm font-medium text-slate-300">{stats.cluster.status}</span>
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'Twilio', value: stats.cluster.servicesHealthy },
                    { label: 'Outbound number', value: stats.cluster.nodesReady },
                    { label: 'Restarts', value: stats.cluster.restarts },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                      <span className="text-sm text-slate-400">{item.label}</span>
                      <span className="font-mono text-sm font-medium text-white">{item.value}</span>
                    </div>
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
                  <span className="text-xs text-slate-500">From Twilio</span>
                </div>
                {stats.callsPerDay.length === 0 ? (
                  <p className="py-12 text-center text-sm text-slate-500">No calls yet. Place your first call from Agents.</p>
                ) : (
                  <div className="flex h-48 items-end gap-2">
                    {stats.callsPerDay.map((day, i) => (
                      <div key={day.date} className="group flex flex-1 flex-col items-center gap-2">
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${(day.count / maxCalls) * 100}%` }}
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
          </>
        )}
      </div>
    </div>
  );
}