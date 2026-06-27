export type MemberFeature =
  | 'dashboard'
  | 'contacts'
  | 'conversations'
  | 'voice_agents'
  | 'voice_calls'
  | 'voice_prompts'
  | 'whatsapp'
  | 'email'
  | 'prospects'
  | 'maps_leads'
  | 'marketing'
  | 'analytics'
  | 'integrations'
  | 'ghl'
  | 'billing'
  | 'knowledge'
  | 'gateway'
  | 'security'
  | 'appearance';

export interface FeatureOption {
  id: MemberFeature;
  label: string;
  description: string;
  group: string;
}

export const MEMBER_FEATURE_OPTIONS: FeatureOption[] = [
  { id: 'dashboard', label: 'Dashboard', description: 'Stats and overview', group: 'Core' },
  { id: 'contacts', label: 'Contacts', description: 'CRM, import, bulk calls', group: 'Core' },
  { id: 'conversations', label: 'Conversations', description: 'Unified inbox per contact', group: 'Core' },
  { id: 'voice_agents', label: 'Voice Agents', description: 'AI agent list and test calls', group: 'Voice' },
  { id: 'voice_calls', label: 'Call History', description: 'Past calls and recordings', group: 'Voice' },
  { id: 'voice_prompts', label: 'Agent Prompts', description: 'Edit call scripts', group: 'Voice' },
  { id: 'whatsapp', label: 'WhatsApp', description: 'Campaigns and chat history', group: 'Channels' },
  { id: 'email', label: 'Email', description: 'Campaigns and email history', group: 'Channels' },
  { id: 'prospects', label: 'Prospect Finder', description: 'Multi-country lead search', group: 'Leads' },
  { id: 'maps_leads', label: 'Maps Leads', description: 'Local business finder', group: 'Leads' },
  { id: 'marketing', label: 'Marketing', description: 'SEO, Social Studio, local SEO', group: 'Marketing' },
  { id: 'analytics', label: 'Analytics Hub', description: 'Performance dashboards', group: 'Settings' },
  { id: 'integrations', label: 'API & Webhooks', description: 'API keys and webhooks', group: 'Settings' },
  { id: 'ghl', label: 'GoHighLevel', description: 'GHL sync and import', group: 'Settings' },
  { id: 'billing', label: 'Billing & Usage', description: 'Plans and usage costs', group: 'Settings' },
  { id: 'knowledge', label: 'Knowledge Base', description: 'AI knowledge documents', group: 'Settings' },
  { id: 'gateway', label: 'Connections', description: 'Twilio and provider setup', group: 'Settings' },
  { id: 'security', label: 'Security', description: 'Security scans', group: 'Settings' },
  { id: 'appearance', label: 'Appearance', description: 'Theme and display prefs', group: 'Personal' },
];

export const DEFAULT_MEMBER_FEATURES: MemberFeature[] = [
  'dashboard',
  'contacts',
  'conversations',
  'voice_agents',
  'voice_calls',
  'whatsapp',
  'email',
  'prospects',
  'maps_leads',
  'appearance',
];

const FEATURE_PATHS: Record<MemberFeature, string[]> = {
  dashboard: ['/dashboard'],
  contacts: ['/contacts'],
  conversations: ['/conversations'],
  voice_agents: ['/agents'],
  voice_calls: ['/calls'],
  voice_prompts: ['/prompts'],
  whatsapp: ['/whatsapp'],
  email: ['/email'],
  prospects: ['/prospects'],
  maps_leads: ['/maps-leads'],
  marketing: ['/marketing', '/seo'],
  analytics: ['/analytics'],
  integrations: ['/integrations'],
  ghl: ['/ghl'],
  billing: ['/billing'],
  knowledge: ['/knowledge'],
  gateway: ['/gateway'],
  security: ['/security', '/settings/privacy', '/settings/gdpr'],
  appearance: ['/settings/appearance'],
};

const ALL_FEATURES = new Set<MemberFeature>(MEMBER_FEATURE_OPTIONS.map((f) => f.id));

export function normalizeMemberFeatures(features?: MemberFeature[] | null): MemberFeature[] {
  if (!features?.length) return [...DEFAULT_MEMBER_FEATURES];
  const valid = features.filter((f) => ALL_FEATURES.has(f));
  return valid.length ? valid : [...DEFAULT_MEMBER_FEATURES];
}

export function resolveFeatureForPath(pathname: string): MemberFeature | null {
  for (const [feature, paths] of Object.entries(FEATURE_PATHS) as [MemberFeature, string[]][]) {
    if (paths.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      return feature;
    }
  }
  return null;
}

export function isAlwaysAllowedPath(pathname: string): boolean {
  return pathname === '/home' || pathname.startsWith('/home/');
}

export function memberCanAccessPath(pathname: string, features: MemberFeature[]): boolean {
  if (isAlwaysAllowedPath(pathname)) return true;
  const required = resolveFeatureForPath(pathname);
  if (!required) return false;
  return features.includes(required);
}

export function validateFeatureList(features: unknown): MemberFeature[] {
  if (!Array.isArray(features)) return [...DEFAULT_MEMBER_FEATURES];
  const valid = features.filter((f): f is MemberFeature => typeof f === 'string' && ALL_FEATURES.has(f as MemberFeature));
  if (!valid.length) throw new Error('Select at least one feature for this member.');
  return valid;
}