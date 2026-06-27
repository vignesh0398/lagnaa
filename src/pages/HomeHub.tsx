import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Clock,
  Heart,
  Rocket,
  Sparkles,
  Wind,
} from 'lucide-react';
import { LagnaaLogo } from '../components/brand/LagnaaLogo';
import { TechNewsFeed } from '../components/home/TechNewsFeed';
import { useAuth } from '../hooks/useAuth';
import { LAGNAA_UPDATES, QUICK_DESTINATIONS } from '../data/lagnaaUpdates';
import { BRAND_ASSISTANT, BRAND_HOME_INTRO, BRAND_NAME, BRAND_TAGLINE } from '../constants/brand';
import { canAccessPath } from '../utils/roleAccess';

function FloatingOrb({ className, delay }: { className: string; delay: number }) {
  return (
    <motion.div
      className={`pointer-events-none absolute rounded-full blur-3xl ${className}`}
      animate={{ y: [0, -24, 0], x: [0, 12, 0], scale: [1, 1.08, 1] }}
      transition={{ duration: 9, repeat: Infinity, delay, ease: 'easeInOut' }}
    />
  );
}

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function HomeHub() {
  const { user } = useAuth();
  const [breathOpen, setBreathOpen] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');

  const firstName = useMemo(() => user?.name?.split(' ')[0] ?? 'there', [user?.name]);
  const quickDestinations = useMemo(
    () => QUICK_DESTINATIONS.filter((dest) => canAccessPath(user, dest.to)),
    [user]
  );
  const newUpdates = LAGNAA_UPDATES.filter((u) => u.section === 'new');
  const soonUpdates = LAGNAA_UPDATES.filter((u) => u.section === 'soon');

  const startBreath = () => {
    setBreathOpen(true);
    setBreathPhase('inhale');
    setTimeout(() => setBreathPhase('hold'), 4000);
    setTimeout(() => setBreathPhase('exhale'), 6000);
    setTimeout(() => setBreathOpen(false), 10000);
  };

  return (
    <div className="relative min-h-screen overflow-hidden pb-24">
      <FloatingOrb className="left-[10%] top-[8%] h-64 w-64 bg-accent-cyan/15" delay={0} />
      <FloatingOrb className="right-[8%] top-[20%] h-80 w-80 bg-accent-violet/12" delay={1.5} />
      <FloatingOrb className="bottom-[15%] left-[35%] h-56 w-56 bg-accent-pink/10" delay={3} />

      <div className="relative z-10 px-8 py-10">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="mb-12 text-center"
        >
          <motion.div
            className="mx-auto mb-6 flex justify-center"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <LagnaaLogo size={72} blend />
          </motion.div>

          <p className="text-sm font-medium text-accent-cyan">{timeGreeting()}, {firstName}</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-white md:text-5xl">
            Welcome to <span className="gradient-text">{BRAND_NAME}</span>
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-sm font-medium text-accent-cyan">{BRAND_TAGLINE}</p>
          <p className="mx-auto mt-3 max-w-xl text-base text-slate-400">{BRAND_HOME_INTRO}</p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button type="button" onClick={startBreath} className="btn-primary">
              <Wind className="h-4 w-4" />
              10-second calm breath
            </button>
            <Link to="/dashboard" className="btn-secondary">
              Go to Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <p className="mt-4 text-xs text-slate-600">
            Tip: tap the <span className="text-amber-400/90">{BRAND_ASSISTANT}</span> bee bottom-right for help, or ambient sound in the sidebar footer
          </p>
        </motion.section>

        <AnimatePresence>
          {breathOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-surface-950/80 backdrop-blur-sm"
              onClick={() => setBreathOpen(false)}
            >
              <motion.div
                onClick={(e) => e.stopPropagation()}
                className="flex flex-col items-center"
              >
                <motion.div
                  animate={{
                    scale: breathPhase === 'inhale' ? 1.35 : breathPhase === 'hold' ? 1.35 : 1,
                  }}
                  transition={{ duration: breathPhase === 'exhale' ? 4 : 4, ease: 'easeInOut' }}
                  className="home-breathe-ring flex h-40 w-40 items-center justify-center rounded-full border-2 border-accent-cyan/30 bg-accent-cyan/5"
                >
                  <Heart className="h-10 w-10 text-accent-cyan/80" />
                </motion.div>
                <p className="mt-6 text-lg font-medium text-white capitalize">{breathPhase}…</p>
                <p className="mt-1 text-sm text-slate-500">Tap anywhere to close</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.6 }}
          className="mb-10"
        >
          <TechNewsFeed />
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.6 }}
          className="mb-10"
        >
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
            <Sparkles className="h-5 w-5 text-accent-cyan" />
            Where would you like to go?
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {quickDestinations.map((dest, i) => (
              <motion.div
                key={dest.to}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
              >
                <Link
                  to={dest.to}
                  className={`group flex flex-col rounded-2xl border border-white/5 bg-gradient-to-br ${dest.color} p-5 transition-all hover:-translate-y-1 hover:border-white/15 hover:shadow-glow`}
                >
                  <span className="text-base font-semibold text-white group-hover:text-accent-cyan">{dest.label}</span>
                  <span className="mt-1 text-xs text-slate-400">{dest.desc}</span>
                  <ArrowRight className="mt-4 h-4 w-4 text-slate-600 transition group-hover:translate-x-1 group-hover:text-accent-cyan" />
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <div className="grid gap-8 lg:grid-cols-2">
          <motion.section
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25, duration: 0.6 }}
          >
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
              <Rocket className="h-5 w-5 text-accent-violet" />
              What&apos;s new at Lagnaa
            </h2>
            <div className="space-y-3">
              {newUpdates.map((item, i) => (
                <motion.article
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.03 * i }}
                  className={`rounded-2xl border p-4 transition hover:border-white/15 ${
                    item.highlight
                      ? 'border-accent-cyan/25 bg-accent-cyan/5'
                      : 'border-white/5 bg-surface-800/40'
                  }`}
                >
                  <div className="flex gap-3">
                    <item.icon
                      className={`mt-0.5 h-5 w-5 shrink-0 ${item.unread ? 'text-accent-cyan' : 'text-slate-500'}`}
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-white">{item.title}</h3>
                        {item.unread && (
                          <span className="rounded-full bg-accent-pink/20 px-2 py-0.5 text-[9px] font-bold uppercase text-accent-pink">
                            New
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-slate-400">{item.message}</p>
                      <p className="mt-2 text-[10px] text-slate-600">{item.time}</p>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
              <Clock className="h-5 w-5 text-accent-violet" />
              Coming soon
            </h2>
            <div className="space-y-3">
              {soonUpdates.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-white/5 border-dashed bg-surface-800/20 p-4"
                >
                  <div className="flex gap-3">
                    <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
                    <div>
                      <h3 className="font-medium text-slate-200">{item.title}</h3>
                      <p className="mt-1 text-sm text-slate-500">{item.message}</p>
                      <p className="mt-2 text-[10px] text-slate-600">{item.time}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-accent-violet/20 bg-gradient-to-br from-accent-violet/10 to-transparent p-5">
              <p className="text-sm font-semibold text-white">{BRAND_TAGLINE}</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                You&apos;re on the latest {BRAND_NAME} build — black & gold bee branding with {BRAND_ASSISTANT} built in. Open
                Contacts to start outreach, or Marketing for Social Studio — no rush, pick your pace.
              </p>
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  );
}