import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  accent?: 'cyan' | 'violet' | 'emerald' | 'pink';
  delay?: number;
}

const accentMap = {
  cyan: 'from-accent-cyan/20 to-accent-cyan/5 text-accent-cyan',
  violet: 'from-accent-violet/20 to-accent-violet/5 text-accent-violet',
  emerald: 'from-accent-emerald/20 to-accent-emerald/5 text-accent-emerald',
  pink: 'from-accent-pink/20 to-accent-pink/5 text-accent-pink',
};

export function StatCard({ label, value, icon: Icon, trend, accent = 'cyan', delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.25, duration: 0.12, ease: 'easeOut' }}
      className="glass-card-hover group relative overflow-hidden p-5"
    >
      <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br ${accentMap[accent]} opacity-60 blur-2xl transition-opacity group-hover:opacity-100`} />
      <div className="relative">
        <div className={`mb-3 inline-flex rounded-xl bg-gradient-to-br p-2.5 ${accentMap[accent]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
        <p className="mt-1 font-display text-3xl font-bold text-white">{value}</p>
        {trend && <p className="mt-1 text-xs text-slate-400">{trend}</p>}
      </div>
    </motion.div>
  );
}