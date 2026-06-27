import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Bot,
  PhoneCall,
  ShieldCheck,
  FileText,
  BookOpen,
  Cable,
  Users,
  MessageCircle,
  MessagesSquare,
  Mail,
  Inbox,
  BarChart3,
  Webhook,
  CreditCard,
  Building2,
  ChevronDown,
  Search,
  Settings2,
  Megaphone,
  GitCompare,
  Share2,
  MapPin,
  Calendar,
  Palette,
  PenSquare,
  UserSearch,
  MapPinned,
} from 'lucide-react';
import { LagnaaLogo } from '../brand/LagnaaLogo';
import { useAuth } from '../../hooks/useAuth';
import { canAccessPath } from '../../utils/roleAccess';

type NavItem = { to: string; icon: typeof Bot; label: string };

type NavGroup = {
  id: string;
  label: string;
  icon: typeof PhoneCall;
  items: NavItem[];
};

const topItems: NavItem[] = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/contacts', icon: Users, label: 'Contacts' },
  { to: '/conversations', icon: MessagesSquare, label: 'Conversations' },
];

const channelGroups: NavGroup[] = [
  {
    id: 'calls',
    label: 'Voice Calls',
    icon: PhoneCall,
    items: [
      { to: '/agents', icon: Bot, label: 'Agents' },
      { to: '/calls', icon: PhoneCall, label: 'Call History' },
      { to: '/prompts', icon: FileText, label: 'Agent Prompts' },
    ],
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: MessageCircle,
    items: [
      { to: '/whatsapp', icon: MessageCircle, label: 'Campaign' },
      { to: '/whatsapp/chats', icon: MessagesSquare, label: 'Chat History' },
    ],
  },
  {
    id: 'email',
    label: 'Email',
    icon: Mail,
    items: [
      { to: '/email', icon: Mail, label: 'Campaign' },
      { to: '/email/chats', icon: Inbox, label: 'Email History' },
    ],
  },
  {
    id: 'prospects',
    label: 'Prospect Finder',
    icon: UserSearch,
    items: [{ to: '/prospects', icon: UserSearch, label: 'Lead Search (beta)' }],
  },
  {
    id: 'maps-leads',
    label: 'Maps Leads',
    icon: MapPinned,
    items: [{ to: '/maps-leads', icon: MapPinned, label: 'Local Business Finder (beta)' }],
  },
];

const marketingGroup: NavGroup = {
  id: 'marketing',
  label: 'Marketing',
  icon: Megaphone,
  items: [
    { to: '/marketing/seo', icon: Search, label: 'SEO Marketing' },
    { to: '/marketing/studio', icon: PenSquare, label: 'Social Studio (beta)' },
    { to: '/marketing/competitors', icon: GitCompare, label: 'Competitor Compare' },
    { to: '/marketing/social', icon: Share2, label: 'Social Preview' },
    { to: '/marketing/local', icon: MapPin, label: 'Local SEO' },
    { to: '/marketing/roadmap', icon: Calendar, label: '90-Day Roadmap' },
    { to: '/marketing/white-label', icon: Palette, label: 'White-label PDF' },
  ],
};

const personalItems: NavItem[] = [
  { to: '/settings/appearance', icon: Palette, label: 'Appearance' },
];

const settingsItems: NavItem[] = [
  { to: '/analytics', icon: BarChart3, label: 'Analytics Hub' },
  { to: '/integrations', icon: Webhook, label: 'API & Webhooks' },
  { to: '/ghl', icon: Building2, label: 'GoHighLevel Sync' },
  { to: '/billing', icon: CreditCard, label: 'Billing & Usage' },
  { to: '/knowledge', icon: BookOpen, label: 'Knowledge Base' },
  { to: '/gateway', icon: Cable, label: 'Connections' },
  { to: '/team', icon: Users, label: 'Team' },
  { to: '/security', icon: ShieldCheck, label: 'Security' },
];

const comingSoonItems: { icon: typeof Building2; label: string; desc: string }[] = [];

function groupForPath(pathname: string): string | null {
  if (['/agents', '/calls', '/prompts'].some((p) => pathname.startsWith(p))) return 'calls';
  if (pathname.startsWith('/contacts') || pathname.startsWith('/conversations')) return null;
  if (pathname.startsWith('/settings/appearance')) return 'personal';
  if (pathname.startsWith('/whatsapp')) return 'whatsapp';
  if (pathname.startsWith('/email')) return 'email';
  if (pathname.startsWith('/prospects')) return 'prospects';
  if (pathname.startsWith('/maps-leads')) return 'maps-leads';
  if (pathname.startsWith('/marketing')) return 'marketing';
  if (
    ['/analytics', '/integrations', '/ghl', '/billing', '/knowledge', '/gateway', '/team', '/security'].some(
      (p) => pathname === p || pathname.startsWith(`${p}/`)
    )
  ) {
    return 'settings';
  }
  return null;
}

function isGroupActive(group: NavGroup, pathname: string): boolean {
  return group.items.some((item) => pathname === item.to || pathname.startsWith(`${item.to}/`));
}

function linkClass(isActive: boolean, nested = false): string {
  return `group flex items-center gap-3 rounded-xl text-sm font-medium transition-[background-color,color,box-shadow] duration-100 ease-out ${
    nested ? 'px-3 py-2 pl-10' : 'px-3 py-2.5'
  } ${
    isActive
      ? 'bg-gradient-to-r from-accent-cyan/15 to-accent-violet/10 text-white shadow-glow'
      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
  }`;
}

function filterNavItems(items: NavItem[], user: ReturnType<typeof useAuth>['user']): NavItem[] {
  return items.filter((item) => canAccessPath(user, item.to));
}

function filterNavGroups(groups: NavGroup[], user: ReturnType<typeof useAuth>['user']): NavGroup[] {
  return groups
    .map((group) => ({ ...group, items: filterNavItems(group.items, user) }))
    .filter((group) => group.items.length > 0);
}

export function Sidebar() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const visibleTopItems = filterNavItems(topItems, user);
  const visiblePersonalItems = filterNavItems(personalItems, user);
  const visibleChannelGroups = filterNavGroups(channelGroups, user);
  const visibleMarketingGroup = filterNavItems(marketingGroup.items, user).length
    ? { ...marketingGroup, items: filterNavItems(marketingGroup.items, user) }
    : null;
  const visibleSettingsItems = filterNavItems(settingsItems, user);
  const navGroups = [...visibleChannelGroups, ...(visibleMarketingGroup ? [visibleMarketingGroup] : [])];

  useEffect(() => {
    const group = groupForPath(pathname);
    if (group === 'settings') {
      setSettingsOpen(true);
      setExpanded(null);
    } else if (group) {
      setExpanded(group);
      setSettingsOpen(false);
    }
  }, [pathname]);

  const toggleGroup = (id: string) => {
    setSettingsOpen(false);
    setExpanded((prev) => (prev === id ? null : id));
  };

  const toggleSettings = () => {
    setExpanded(null);
    setSettingsOpen((prev) => !prev);
  };

  return (
    <aside className="theme-sidebar fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-white/5 bg-surface-900/80 backdrop-blur-2xl">
      <NavLink
        to="/home"
        className="flex items-center gap-3 border-b border-white/5 px-6 py-5 transition hover:bg-white/[0.03]"
        title="Lagnaa One home — news & updates"
      >
        <LagnaaLogo size={48} />
        <div>
          <h1 className="text-lg font-bold text-white">
            Lagnaa <span className="gradient-text">One</span>
          </h1>
          <p className="text-[10px] font-medium text-slate-400">One platform, Infinite Growth</p>
          <p className="text-[9px] font-medium uppercase tracking-widest text-slate-600">Powered by DataCrew</p>
        </div>
      </NavLink>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-600">Channels</p>

        {visibleTopItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) => linkClass(isActive)}>
            {({ isActive }) => (
              <>
                <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-accent-cyan' : 'text-slate-500 group-hover:text-slate-300'}`} />
                {label}
                {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent-cyan shadow-glow" />}
              </>
            )}
          </NavLink>
        ))}

        {navGroups.map((group) => {
          const open = expanded === group.id;
          const active = isGroupActive(group, pathname);

          return (
            <div key={group.id} className="pt-1">
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-[background-color,color] duration-100 ease-out ${
                  active && !open
                    ? 'bg-white/5 text-white'
                    : open
                      ? 'bg-white/[0.07] text-white'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <group.icon className={`h-4.5 w-4.5 ${active || open ? 'text-accent-cyan' : 'text-slate-500'}`} />
                <span className="flex-1 text-left">{group.label}</span>
                <ChevronDown
                  className={`h-4 w-4 text-slate-500 transition-transform duration-100 ease-out ${open ? 'rotate-180 text-accent-cyan' : ''}`}
                />
              </button>

              {open && (
                <div className="mt-0.5 space-y-0.5 border-l border-accent-cyan/20 ml-5 pl-1">
                  {group.items.map(({ to, icon: Icon, label }) => (
                    <NavLink key={to} to={to} className={({ isActive }) => linkClass(isActive, true)}>
                      {({ isActive }) => (
                        <>
                          <Icon className={`h-4 w-4 ${isActive ? 'text-accent-cyan' : 'text-slate-500 group-hover:text-slate-300'}`} />
                          {label}
                          {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent-cyan shadow-glow" />}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {visiblePersonalItems.length > 0 && (
          <>
            <p className="mb-2 mt-5 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-600">Personal</p>
            {visiblePersonalItems.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to} className={({ isActive }) => linkClass(isActive)}>
                {({ isActive }) => (
                  <>
                    <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-[var(--theme-accent)]' : 'text-slate-500 group-hover:text-slate-300'}`} />
                    {label}
                    {isActive && (
                      <span
                        className="ml-auto h-1.5 w-1.5 rounded-full shadow-glow"
                        style={{ backgroundColor: 'var(--theme-accent)' }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </>
        )}

        {visibleSettingsItems.length > 0 && (
          <>
            <p className="mb-2 mt-5 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-600">Settings</p>

            <button
              type="button"
              onClick={toggleSettings}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-[background-color,color] duration-100 ease-out ${
                settingsOpen || visibleSettingsItems.some((i) => pathname === i.to || pathname.startsWith(`${i.to}/`))
                  ? 'bg-white/[0.07] text-white'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Settings2 className={`h-4.5 w-4.5 ${settingsOpen ? 'text-accent-violet' : 'text-slate-500'}`} />
              <span className="flex-1 text-left">Settings</span>
              <ChevronDown
                className={`h-4 w-4 text-slate-500 transition-transform duration-100 ease-out ${settingsOpen ? 'rotate-180 text-accent-violet' : ''}`}
              />
            </button>

            {settingsOpen && (
              <div className="mt-0.5 space-y-0.5 border-l border-accent-violet/20 ml-5 pl-1">
                {visibleSettingsItems.map(({ to, icon: Icon, label }) => (
                  <NavLink key={to} to={to} className={({ isActive }) => linkClass(isActive, true)}>
                    {({ isActive }) => (
                      <>
                        <Icon className={`h-4 w-4 ${isActive ? 'text-accent-violet' : 'text-slate-500 group-hover:text-slate-300'}`} />
                        {label}
                        {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent-violet shadow-glow" />}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            )}
          </>
        )}

        {comingSoonItems.length > 0 && (
          <>
            <p className="mb-2 mt-6 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-600">Roadmap</p>
            {comingSoonItems.map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-600 opacity-50"
                title={`${label} — ${desc}`}
              >
                <Icon className="h-4 w-4 shrink-0 text-slate-600" />
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-xs">{label}</span>
                </div>
              </div>
            ))}
          </>
        )}
      </nav>

      <div className="border-t border-white/5 p-4">
        <div className="rounded-xl bg-gradient-to-br from-accent-cyan/10 to-accent-violet/10 p-3">
          <p className="text-xs font-semibold text-white">Lagnaa One</p>
          <p className="mt-1 text-[10px] leading-relaxed text-slate-400">One platform, Infinite Growth</p>
          {user?.role === 'member' && (
            <p className="mt-2 text-[10px] font-medium uppercase tracking-wider text-accent-cyan/80">Member access</p>
          )}
        </div>
        <p className="mt-3 text-center text-[10px] text-slate-600">v1.0 · © Lagnaa One · Powered by DataCrew</p>
      </div>
    </aside>
  );
}