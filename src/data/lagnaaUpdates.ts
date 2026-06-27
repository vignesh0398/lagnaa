import type { LucideIcon } from 'lucide-react';
import { Clock, Rocket, Sparkles } from 'lucide-react';

export type UpdateSection = 'new' | 'soon';

export interface LagnaaUpdate {
  id: string;
  title: string;
  message: string;
  time: string;
  unread: boolean;
  icon: LucideIcon;
  section: UpdateSection;
  highlight?: boolean;
}

export const LAGNAA_UPDATES: LagnaaUpdate[] = [
  {
    id: 'social-studio-beta',
    section: 'new',
    title: 'Social Studio (beta)',
    message:
      'AI captions + topic images for Instagram, Facebook, LinkedIn & X. Eight styles, client logo upload, style quiz, and scheduling.',
    time: 'Just shipped',
    unread: true,
    icon: Sparkles,
    highlight: true,
  },
  {
    id: 'prospect-finder-beta',
    section: 'new',
    title: 'Prospect Finder (beta)',
    message:
      'Multi-country lead search across 12 markets — UK directors, US SEC, EU via GLEIF. Free website scan & import to Contacts.',
    time: 'Just shipped',
    unread: true,
    icon: Sparkles,
    highlight: true,
  },
  {
    id: 'contacts-crm',
    section: 'new',
    title: 'Contacts CRM',
    message: 'Excel import, field filters, pagination, bulk tag/call, DND per contact, and extended contact fields.',
    time: 'New',
    unread: true,
    icon: Sparkles,
  },
  {
    id: 'conversations',
    section: 'new',
    title: 'Conversations hub',
    message: 'Unified Voice + WhatsApp + Email threads in one inbox, matched by phone or email.',
    time: 'New',
    unread: true,
    icon: Sparkles,
  },
  {
    id: 'lagnaa-brand',
    section: 'new',
    title: 'Lagnaa One branding',
    message: 'New L1 logo, tagline "One platform, Infinite Growth", and refreshed login + sidebar.',
    time: 'New',
    unread: true,
    icon: Rocket,
  },
  {
    id: 'marketing-suite',
    section: 'new',
    title: 'Marketing suite',
    message: 'SEO Marketing, Competitor Compare, Social Preview, Local SEO, 90-Day Roadmap, and white-label PDF reports.',
    time: 'New',
    unread: false,
    icon: Sparkles,
  },
  {
    id: 'whatsapp-email',
    section: 'new',
    title: 'WhatsApp & Email campaigns',
    message: 'Bulk outreach with AI consent workflow, chat history, and campaign analytics.',
    time: 'Live',
    unread: false,
    icon: Sparkles,
  },
  {
    id: 'social-publish',
    section: 'soon',
    title: 'Live social publishing',
    message: 'OAuth connect + one-click publish to Instagram, Facebook, LinkedIn, and X.',
    time: 'Coming soon',
    unread: true,
    icon: Clock,
  },
  {
    id: 'social-inbox',
    section: 'soon',
    title: 'Social inbox',
    message: 'DMs and comments in one place with AI-suggested replies from your knowledge base.',
    time: 'Coming soon',
    unread: true,
    icon: Clock,
  },
  {
    id: 'ai-photo-images',
    section: 'soon',
    title: 'AI photo-style images',
    message: 'Photorealistic topic visuals and custom illustration styles beyond template graphics.',
    time: 'Planned',
    unread: false,
    icon: Clock,
  },
  {
    id: 'ads-cockpit',
    section: 'soon',
    title: 'Paid ads cockpit',
    message: 'Meta & LinkedIn ad spend, CPL, and ROAS tied to CRM conversions.',
    time: 'Planned',
    unread: false,
    icon: Clock,
  },
  {
    id: 'social-listening',
    section: 'soon',
    title: 'Social listening',
    message: 'Brand mentions, hashtag tracking, and sentiment alerts fed into your roadmap.',
    time: 'Planned',
    unread: false,
    icon: Clock,
  },
  {
    id: 'style-quiz-tip',
    section: 'soon',
    title: 'Tip: Style quiz in Social Studio',
    message: 'Not sure infographic vs carousel? Take the 3-question quiz in Social Studio — it picks the best format.',
    time: 'Try it',
    unread: true,
    icon: Sparkles,
  },
];

export const QUICK_DESTINATIONS = [
  { to: '/dashboard', label: 'Dashboard', desc: 'Stats & overview', color: 'from-accent-cyan/20 to-accent-cyan/5' },
  { to: '/contacts', label: 'Contacts', desc: 'CRM & outreach', color: 'from-accent-violet/20 to-accent-violet/5' },
  { to: '/conversations', label: 'Conversations', desc: 'Unified inbox', color: 'from-accent-pink/20 to-accent-pink/5' },
  { to: '/marketing/studio', label: 'Social Studio', desc: 'AI posts (beta)', color: 'from-pink-500/20 to-purple-500/5' },
  { to: '/prospects', label: 'Prospect Finder', desc: 'Free leads (beta)', color: 'from-emerald-500/20 to-cyan-500/5' },
  { to: '/agents', label: 'Voice Agents', desc: 'AI call bots', color: 'from-blue-500/20 to-indigo-500/5' },
  { to: '/whatsapp', label: 'WhatsApp', desc: 'Campaigns', color: 'from-green-500/20 to-emerald-500/5' },
  { to: '/email', label: 'Email', desc: 'Campaigns', color: 'from-amber-500/20 to-orange-500/5' },
] as const;