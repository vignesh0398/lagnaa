import { useEffect, useRef, useState } from 'react';
import { Bell, ChevronDown, LogOut, RefreshCw, Search, User } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { LAGNAA_UPDATES, type LagnaaUpdate } from '../../data/lagnaaUpdates';
import { ProfilePanel } from './ProfilePanel';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, onRefresh, actions }: HeaderProps) {
  const { user, logout, initials } = useAuth();
  const [showNotif, setShowNotif] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const unreadCount = LAGNAA_UPDATES.filter((n) => n.unread).length;
  const newItems = LAGNAA_UPDATES.filter((n) => n.section === 'new');
  const soonItems = LAGNAA_UPDATES.filter((n) => n.section === 'soon');

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setShowUser(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const renderNotif = (n: LagnaaUpdate) => (
    <div key={n.id} className={`rounded-xl p-3 ${n.unread ? 'bg-accent-cyan/5' : 'hover:bg-white/5'}`}>
      <div className="flex gap-2">
        <n.icon className={`mt-0.5 h-4 w-4 shrink-0 ${n.unread ? 'text-accent-cyan' : 'text-slate-500'}`} />
        <div>
          <p className="text-sm font-semibold text-white">{n.title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{n.message}</p>
          <p className="mt-1 text-[10px] text-slate-600">{n.time}</p>
        </div>
      </div>
    </div>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-surface-950/80 px-8 py-4 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div>
          {subtitle && (
            <span className="mb-1 inline-block rounded-full border border-accent-cyan/20 bg-accent-cyan/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-accent-cyan">
              {subtitle}
            </span>
          )}
          <h2 className="text-2xl font-bold text-white">{title}</h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input type="text" placeholder="Search anything..." className="input-field w-64 pl-10" />
          </div>

          {onRefresh && (
            <button onClick={onRefresh} className="btn-secondary">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          )}

          {actions}

          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                setShowNotif(!showNotif);
                setShowUser(false);
              }}
              className="relative rounded-xl border border-white/10 bg-white/5 p-2.5 text-slate-400 transition hover:text-white"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent-pink text-[9px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotif && (
              <div className="absolute right-0 top-full z-50 mt-2 max-h-[70vh] w-96 overflow-y-auto rounded-2xl border border-white/10 bg-surface-900 p-2 shadow-2xl">
                <p className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-500">What&apos;s new</p>
                {newItems.map(renderNotif)}
                <p className="mt-2 px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-500">Coming soon</p>
                {soonItems.map(renderNotif)}
              </div>
            )}
          </div>

          <div className="relative" ref={userRef}>
            <button
              onClick={() => {
                setShowUser(!showUser);
                setShowNotif(false);
              }}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 py-1.5 pl-1.5 pr-3 transition hover:border-white/20"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-brand text-xs font-bold text-white">
                {initials}
              </div>
              <span className="hidden max-w-[100px] truncate text-xs text-slate-300 sm:block">
                {user?.name ?? 'User'}
              </span>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>

            {showUser && (
              <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-white/10 bg-surface-900 p-2 shadow-2xl">
                <div className="border-b border-white/5 px-3 py-2">
                  <p className="text-sm font-semibold text-white">{user?.name ?? 'Lagnaa One User'}</p>
                  <p className="text-xs text-slate-500">{user?.email ?? ''}</p>
                  <p className="mt-0.5 text-[10px] capitalize text-accent-cyan">{user?.role ?? 'member'}</p>
                </div>
                <button
                  onClick={() => {
                    setShowUser(false);
                    setShowProfile(true);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-white"
                >
                  <User className="h-4 w-4" />
                  Profile
                </button>
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <ProfilePanel open={showProfile} onClose={() => setShowProfile(false)} />
    </header>
  );
}