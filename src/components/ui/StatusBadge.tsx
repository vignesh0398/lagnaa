import type { CallStatus } from '../../types/calls';

const styles: Record<CallStatus, string> = {
  completed: 'bg-accent-emerald/15 text-accent-emerald border-accent-emerald/30',
  interrupted: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  in_progress: 'bg-accent-cyan/15 text-accent-cyan border-accent-cyan/30',
  voicemail: 'bg-accent-violet/15 text-accent-violet border-accent-violet/30',
  queued: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

const labels: Record<CallStatus, string> = {
  completed: 'Completed',
  interrupted: 'Interrupted',
  in_progress: 'In Progress',
  voicemail: 'Voicemail',
  queued: 'Queued',
};

export function StatusBadge({ status }: { status: CallStatus | string }) {
  const key = (status in styles ? status : 'queued') as CallStatus;
  return (
    <span className={`status-pill border ${styles[key]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {labels[key]}
    </span>
  );
}