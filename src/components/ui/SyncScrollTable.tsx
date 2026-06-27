import { useCallback, useRef, type ReactNode } from 'react';

interface SyncScrollTableProps {
  children: ReactNode;
  minWidth?: number;
}

export function SyncScrollTable({ children, minWidth = 2400 }: SyncScrollTableProps) {
  const topRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const sync = useCallback((from: 'top' | 'body') => {
    const top = topRef.current;
    const body = bodyRef.current;
    if (!top || !body) return;
    if (from === 'top') body.scrollLeft = top.scrollLeft;
    else top.scrollLeft = body.scrollLeft;
  }, []);

  return (
    <div>
      <div
        ref={topRef}
        onScroll={() => sync('top')}
        className="overflow-x-auto border-b border-white/5"
        style={{ height: 14 }}
      >
        <div style={{ width: minWidth, height: 1 }} />
      </div>
      <div ref={bodyRef} onScroll={() => sync('body')} className="overflow-x-auto">
        {children}
      </div>
    </div>
  );
}