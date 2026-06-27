import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  minWidth: number;
}

export function DualScrollTable({ children, minWidth }: Props) {
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);

  const sync = (from: 'top' | 'bottom') => {
    const top = topRef.current;
    const bottom = bottomRef.current;
    if (!top || !bottom || syncing.current) return;
    syncing.current = true;
    if (from === 'top') bottom.scrollLeft = top.scrollLeft;
    else top.scrollLeft = bottom.scrollLeft;
    syncing.current = false;
  };

  useEffect(() => {
    const bottom = bottomRef.current;
    const top = topRef.current;
    if (!bottom || !top) return;
    top.scrollLeft = bottom.scrollLeft;
  }, [minWidth]);

  return (
    <div>
      <div
        ref={topRef}
        onScroll={() => sync('top')}
        className="mb-1 overflow-x-auto overflow-y-hidden rounded-t-lg border border-b-0 border-white/10 bg-white/[0.02]"
        aria-hidden
      >
        <div style={{ width: minWidth, height: 1 }} />
      </div>
      <div
        ref={bottomRef}
        onScroll={() => sync('bottom')}
        className="overflow-x-auto rounded-b-lg border border-white/10"
      >
        {children}
      </div>
    </div>
  );
}