import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { BeeIcon } from './BeeIcon';
import { WorkerBeeChat } from './WorkerBeeChat';

export function WorkerBeeWidget() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === '/home';
  const idle = isHome && !open;

  return (
    <div className="pointer-events-none fixed bottom-5 right-6 z-50 flex flex-col items-end gap-3">
      {open && <WorkerBeeChat onClose={() => setOpen(false)} />}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`pointer-events-auto group relative flex h-14 w-14 items-center justify-center rounded-full border shadow-lg backdrop-blur-md transition hover:scale-105 ${
          open
            ? 'border-amber-400/50 bg-amber-400/15'
            : 'border-amber-400/30 bg-surface-900/90 hover:border-amber-400/45'
        } ${idle ? 'workerbee-idle' : ''}`}
        title={open ? 'Close WorkerBee' : 'Ask WorkerBee for help'}
        aria-label={open ? 'Close WorkerBee chat' : 'Open WorkerBee help chat'}
        aria-expanded={open}
      >
        {idle && (
          <span
            className="workerbee-pulse-ring absolute inset-0 rounded-full"
            aria-hidden
          />
        )}
        <span
          className={`relative transition ${idle ? 'workerbee-bob' : ''}`}
        >
          <BeeIcon size={30} animated={idle || open} />
        </span>
        {!open && isHome && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400/40 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-400/80" />
          </span>
        )}
      </button>
    </div>
  );
}