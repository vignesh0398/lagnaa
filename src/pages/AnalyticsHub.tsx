import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart3,
  CheckCircle2,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { StatCard } from '../components/ui/StatCard';
import { getAnalyticsHub, type AnalyticsHubData } from '../api/analytics';

const CHANNEL_COLORS: Record<string, string> = {
  Voice: 'from-accent-cyan to-accent-cyan/60',
  WhatsApp: 'from-accent-emerald to-accent-emerald/60',
  Email: 'from-accent-violet to-accent-violet/60',
};

const CHANNEL_ICONS = {
  Voice: Phone,
  WhatsApp: MessageCircle,
  Email: Mail,
};

export function AnalyticsHub() {
  const [data, setData] = useState<AnalyticsHubData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getAnalyticsHub());
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const maxActivity = Math.max(...(data?.activityPerDay.map((d) => d.total) ?? [1]), 1);

  return (
    <div>
      <Header
        title="Analytics Hub"
        subtitle="Cross-channel insights"
        onRefresh={load}
        actions={
          <Link to="/integrations" className="btn-secondary text-xs">
            API & Webhooks
          </Link>
        }
      />

      <div className="space-y-6 p-8">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-accent-cyan" />
          </div>
        ) : !data ? (
          <p className="text-center text-slate-500">Could not load analytics.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <StatCard label="Total Interactions" value={data.summary.totalInteractions} icon={Users} accent="cyan" />
              <StatCard label="Consent Given" value={data.summary.totalConsent} icon={CheckCircle2} accent="emerald" />
              <StatCard label="Consent Rate" value={`${data.summary.overallConsentRate}%`} icon={TrendingUp} accent="violet" />
              <StatCard label="Active Campaigns" value={data.summary.activeCampaigns} icon={BarChart3} accent="pink" />
              <StatCard label="Channels Live" value={data.summary.channelsLive} icon={Phone} accent="cyan" />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {data.channels.map((ch, i) => {
                const Icon = CHANNEL_ICONS[ch.channel as keyof typeof CHANNEL_ICONS] ?? Phone;
                return (
                  <motion.div
                    key={ch.channel}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="glass-card p-5"
                  >
                    <div className="mb-4 flex items-center gap-3">
                      <div className={`rounded-xl bg-gradient-to-br ${CHANNEL_COLORS[ch.channel] ?? ''} p-2.5`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white">{ch.channel}</h3>
                        <p className="text-xs text-slate-500">{ch.total} sessions</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-white/5 px-3 py-2">
                        <p className="text-slate-500">Consent</p>
                        <p className="font-bold text-accent-emerald">{ch.consentGiven} ({ch.consentRate}%)</p>
                      </div>
                      <div className="rounded-lg bg-white/5 px-3 py-2">
                        <p className="text-slate-500">Completed</p>
                        <p className="font-bold text-white">{ch.completed}</p>
                      </div>
                      <div className="rounded-lg bg-white/5 px-3 py-2">
                        <p className="text-slate-500">In progress</p>
                        <p className="font-bold text-amber-400">{ch.inProgress}</p>
                      </div>
                      <div className="rounded-lg bg-white/5 px-3 py-2">
                        <p className="text-slate-500">Awaiting</p>
                        <p className="font-bold text-slate-300">{ch.awaiting}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="glass-card p-6">
              <h3 className="mb-4 flex items-center gap-2 font-semibold text-white">
                <TrendingUp className="h-4 w-4 text-accent-cyan" />
                Activity — last 14 days
              </h3>
              {data.activityPerDay.every((d) => d.total === 0) ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  No activity yet. Run calls, WhatsApp, or email campaigns to see trends.
                </p>
              ) : (
                <div className="flex h-52 items-end gap-1.5">
                  {data.activityPerDay.map((day, i) => (
                    <div key={day.date} className="group flex flex-1 flex-col items-center gap-1">
                      <div className="flex w-full flex-1 items-end gap-0.5">
                        {day.voice > 0 && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${(day.voice / maxActivity) * 100}%` }}
                            transition={{ delay: i * 0.02 }}
                            className="min-h-[2px] flex-1 rounded-t bg-accent-cyan/80"
                            title={`Voice: ${day.voice}`}
                          />
                        )}
                        {day.whatsapp > 0 && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${(day.whatsapp / maxActivity) * 100}%` }}
                            transition={{ delay: i * 0.02 }}
                            className="min-h-[2px] flex-1 rounded-t bg-accent-emerald/80"
                            title={`WhatsApp: ${day.whatsapp}`}
                          />
                        )}
                        {day.email > 0 && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${(day.email / maxActivity) * 100}%` }}
                            transition={{ delay: i * 0.02 }}
                            className="min-h-[2px] flex-1 rounded-t bg-accent-violet/80"
                            title={`Email: ${day.email}`}
                          />
                        )}
                      </div>
                      <span className="text-[9px] text-slate-600">{day.date.split(' ')[1]}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 flex gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-accent-cyan" /> Voice</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-accent-emerald" /> WhatsApp</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-accent-violet" /> Email</span>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="glass-card p-6">
                <h3 className="mb-4 font-semibold text-white">Top Outcomes</h3>
                {data.topOutcomes.length === 0 ? (
                  <p className="text-sm text-slate-500">No outcomes recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {data.topOutcomes.map((o) => (
                      <div key={`${o.channel}-${o.outcome}`} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                        <div>
                          <p className="text-sm text-white">{o.outcome}</p>
                          <p className="text-[10px] text-slate-500">{o.channel}</p>
                        </div>
                        <span className="font-mono text-sm font-bold text-accent-cyan">{o.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="glass-card p-6">
                <h3 className="mb-4 font-semibold text-white">Campaigns & Verification</h3>
                <div className="space-y-3 text-sm">
                  <div className="rounded-lg bg-white/5 px-3 py-2">
                    <p className="text-slate-500">WhatsApp campaigns</p>
                    <p className="text-white">{data.campaigns.whatsapp.total} total · {data.campaigns.whatsapp.sent} sent · {data.campaigns.whatsapp.consent} consent</p>
                  </div>
                  <div className="rounded-lg bg-white/5 px-3 py-2">
                    <p className="text-slate-500">Email campaigns</p>
                    <p className="text-white">{data.campaigns.email.total} total · {data.campaigns.email.sent} sent · {data.campaigns.email.consent} consent</p>
                  </div>
                  <div className="rounded-lg bg-white/5 px-3 py-2">
                    <p className="text-slate-500">Verification</p>
                    <p className="text-white">
                      {data.verification.verified} verified · {data.verification.failed} failed · {data.verification.refused} refused
                    </p>
                  </div>
                  <div className="rounded-lg bg-white/5 px-3 py-2">
                    <p className="text-slate-500">Sentiment</p>
                    <p className="text-white">
                      +{data.sentiment.positive} / ~{data.sentiment.neutral} / −{data.sentiment.negative}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}