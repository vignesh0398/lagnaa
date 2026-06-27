import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  DollarSign,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { StatCard } from '../components/ui/StatCard';
import {
  getAvailablePlans,
  getBillingUsage,
  updateBillingPlan,
  type BillingUsageData,
  type PlanDefinition,
  type PlanTier,
} from '../api/billing';

function formatUsd(n: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);
}

function formatLimit(n: number): string {
  return n >= 999999 ? 'Unlimited' : n.toLocaleString();
}

function meterColor(percent: number): string {
  if (percent >= 90) return 'bg-red-500';
  if (percent >= 70) return 'bg-amber-400';
  return 'bg-accent-cyan';
}

export function BillingUsage() {
  const [data, setData] = useState<BillingUsageData | null>(null);
  const [plans, setPlans] = useState<PlanDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [usage, planData] = await Promise.all([getBillingUsage(), getAvailablePlans()]);
      setData(usage);
      setPlans(planData.availablePlans);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handlePlanChange = async (tier: PlanTier) => {
    if (!data || tier === data.account.planTier) return;
    setSaving(true);
    try {
      const result = await updateBillingPlan({ planTier: tier });
      setData(result.usage);
      setMessage(`Switched to ${result.usage.account.planName} plan`);
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setMessage('Could not update plan');
    } finally {
      setSaving(false);
    }
  };

  const maxDayCost = Math.max(...(data?.usagePerDay.map((d) => d.cost) ?? [1]), 0.01);

  return (
    <div>
      <Header
        title="Billing & Usage"
        subtitle="Workspace billing"
        onRefresh={load}
        actions={
          <Link to="/analytics" className="btn-secondary text-xs">
            Analytics Hub
          </Link>
        }
      />

      <div className="space-y-6 p-8">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-accent-pink" />
          </div>
        ) : !data ? (
          <p className="text-center text-slate-500">Could not load billing data.</p>
        ) : (
          <>
            <div className="rounded-2xl border border-accent-pink/20 bg-gradient-to-r from-accent-pink/10 via-accent-violet/5 to-accent-cyan/10 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {data.account.planName} plan · {data.account.companyName}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Billing cycle ends in {data.account.daysRemaining} days · {data.account.billingEmail}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {data.account.paymentMethod && (
                    <span className="flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">
                      <CreditCard className="h-3.5 w-3.5" />
                      {data.account.paymentMethod}
                    </span>
                  )}
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                      data.account.status === 'active'
                        ? 'bg-accent-emerald/15 text-accent-emerald'
                        : 'bg-amber-400/15 text-amber-400'
                    }`}
                  >
                    {data.account.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard
                label="Projected Total"
                value={formatUsd(data.summary.projectedTotal)}
                icon={DollarSign}
                accent="pink"
                trend="Platform + provider usage"
              />
              <StatCard
                label="Provider Costs"
                value={formatUsd(data.summary.providerCosts)}
                icon={TrendingUp}
                accent="cyan"
                trend="Twilio, WhatsApp, Email, AI"
              />
              <StatCard
                label="Platform Fee"
                value={data.summary.platformFee > 0 ? formatUsd(data.summary.platformFee) : 'Custom'}
                icon={Zap}
                accent="violet"
                trend={`${data.account.planName} / month`}
              />
              <StatCard
                label="Voice Minutes"
                value={data.summary.voiceMinutes}
                icon={Phone}
                accent="emerald"
                trend="This billing period"
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="glass-card p-6">
                <h3 className="mb-4 flex items-center gap-2 font-semibold text-white">
                  <Sparkles className="h-4 w-4 text-accent-violet" />
                  Usage vs Plan Limits
                </h3>
                <div className="space-y-4">
                  {data.meters.map((m) => (
                    <div key={m.label}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-slate-300">{m.label}</span>
                        <span className="font-mono text-slate-500">
                          {m.used.toLocaleString()} / {formatLimit(m.limit)} {m.unit}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/5">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(m.percent, 100)}%` }}
                          className={`h-full rounded-full ${meterColor(m.percent)}`}
                        />
                      </div>
                      {m.overage > 0 && (
                        <p className="mt-0.5 text-[10px] text-amber-400">+{m.overage} over limit</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card p-6">
                <h3 className="mb-4 font-semibold text-white">Cost Breakdown</h3>
                <div className="space-y-2">
                  {data.channelCosts.map((c) => (
                    <div
                      key={c.channel}
                      className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2.5 text-sm"
                    >
                      <div>
                        <p className="text-white">{c.channel}</p>
                        <p className="text-[10px] text-slate-500">
                          {c.quantity.toLocaleString()} {c.unit} × {formatUsd(c.unitCost)} · {c.provider}
                        </p>
                      </div>
                      <span className="font-mono font-bold text-accent-cyan">{formatUsd(c.subtotal)}</span>
                    </div>
                  ))}
                  <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3 text-sm">
                    <span className="text-slate-400">Platform fee ({data.account.planName})</span>
                    <span className="font-mono font-bold text-white">
                      {data.summary.platformFee > 0 ? formatUsd(data.summary.platformFee) : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card p-6">
              <h3 className="mb-4 flex items-center gap-2 font-semibold text-white">
                <TrendingUp className="h-4 w-4 text-accent-cyan" />
                Daily Spend — last 30 days
              </h3>
              {data.usagePerDay.every((d) => d.cost === 0) ? (
                <p className="py-8 text-center text-sm text-slate-500">No usage recorded yet this period.</p>
              ) : (
                <>
                  <div className="flex h-40 items-end gap-1">
                    {data.usagePerDay.map((day, i) => (
                      <div key={day.date} className="group flex flex-1 flex-col items-center gap-1">
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${(day.cost / maxDayCost) * 100}%` }}
                          transition={{ delay: i * 0.01 }}
                          className="w-full min-h-[2px] rounded-t bg-gradient-to-t from-accent-pink/80 to-accent-violet/60"
                          title={`${day.date}: ${formatUsd(day.cost)}`}
                        />
                        <span className="text-[8px] text-slate-600">{day.date.split(' ')[1]}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3 text-accent-cyan" /> Voice
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="h-3 w-3 text-accent-emerald" /> WhatsApp
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3 text-accent-violet" /> Email
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-accent-pink" /> AI sessions
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="glass-card p-6">
                <h3 className="mb-4 font-semibold text-white">Plans</h3>
                <div className="space-y-3">
                  {plans.map((plan) => {
                    const active = plan.tier === data.account.planTier;
                    return (
                      <button
                        key={plan.tier}
                        type="button"
                        disabled={saving}
                        onClick={() => handlePlanChange(plan.tier)}
                        className={`w-full rounded-xl border p-4 text-left transition-all ${
                          active
                            ? 'border-accent-violet/40 bg-accent-violet/10'
                            : 'border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-white">{plan.name}</p>
                          <p className="text-sm text-accent-cyan">
                            {plan.monthlyPrice > 0 ? `${formatUsd(plan.monthlyPrice)}/mo` : 'Contact sales'}
                          </p>
                        </div>
                        <ul className="mt-2 space-y-0.5">
                          {plan.features.map((f) => (
                            <li key={f} className="text-[11px] text-slate-500">
                              · {f}
                            </li>
                          ))}
                        </ul>
                        {active && (
                          <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-accent-violet">
                            <CheckCircle2 className="h-3 w-3" /> Current plan
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="glass-card overflow-hidden p-6">
                <h3 className="mb-4 font-semibold text-white">Invoices</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/5 text-[10px] uppercase text-slate-500">
                        <th className="px-2 py-2">Period</th>
                        <th className="px-2 py-2">Status</th>
                        <th className="px-2 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.invoices.map((inv) => (
                        <tr key={inv.id} className="border-b border-white/5">
                          <td className="px-2 py-2.5">
                            <p className="text-white">{inv.period}</p>
                            <p className="text-[10px] text-slate-600">{inv.id}</p>
                          </td>
                          <td className="px-2 py-2.5">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
                                inv.status === 'paid'
                                  ? 'bg-accent-emerald/15 text-accent-emerald'
                                  : inv.status === 'open'
                                    ? 'bg-accent-cyan/15 text-accent-cyan'
                                    : 'bg-white/10 text-slate-400'
                              }`}
                            >
                              {inv.status}
                            </span>
                          </td>
                          <td className="px-2 py-2.5 text-right font-mono font-bold text-white">
                            {formatUsd(inv.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-[10px] text-slate-600">
                  VAT estimated at 20%. Provider costs use Twilio actuals when available.
                </p>
              </div>
            </div>

            {message && (
              <p className="flex items-center gap-2 text-sm text-accent-emerald">
                <CheckCircle2 className="h-4 w-4" />
                {message}
              </p>
            )}

            <div className="flex items-start gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-xs text-slate-500">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
              <p>
                Usage is calculated from your call history, WhatsApp and email campaigns, and team seats.
                Voice costs prefer Twilio-reported prices; other channels use standard rate estimates.
                Connect payment in a future release — plan changes apply immediately for demo purposes.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}