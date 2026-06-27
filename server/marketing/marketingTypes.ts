import type { SeoActionPlan, SeoAuditCounts, SeoCategory } from '../seo/seoActionPlan.js';

export type MarketingToolType =
  | 'competitor'
  | 'social'
  | 'local'
  | 'roadmap';

export interface MarketingToolResult {
  id: string;
  type: MarketingToolType;
  url: string;
  finalUrl: string;
  domain: string;
  auditedAt: string;
  score: number;
  grade: string;
  summary: string;
  categories: SeoCategory[];
  actionPlan: SeoActionPlan;
  counts: SeoAuditCounts;
  recommendations: string[];
  meta?: Record<string, unknown>;
}

export interface CompetitorSiteScore {
  url: string;
  finalUrl: string;
  domain: string;
  score: number;
  grade: string;
  wordCount: number;
  hasHttps: boolean;
  title: string;
  metaDesc: string;
  h1Count: number;
  internalLinks: number;
  schemaCount: number;
  highlights: string[];
  weaknesses: string[];
}

export interface CompetitorCompareResult extends MarketingToolResult {
  type: 'competitor';
  meta: {
    yourSite: CompetitorSiteScore;
    competitors: CompetitorSiteScore[];
    winner: string;
    gaps: string[];
  };
}

export interface SocialPreviewCard {
  platform: string;
  title: string;
  description: string;
  imageUrl: string;
  status: 'pass' | 'warn' | 'fail';
  issues: string[];
}

export interface SocialPreviewResult extends MarketingToolResult {
  type: 'social';
  meta: {
    previews: SocialPreviewCard[];
    ogTitle: string;
    ogDescription: string;
    ogImage: string;
    twitterCard: string;
  };
}

export interface RoadmapPhase {
  phase: string;
  timeframe: string;
  items: { label: string; actionText: string; priority: string; category: string }[];
}

export interface RoadmapResult extends MarketingToolResult {
  type: 'roadmap';
  meta: {
    audienceType?: string;
    phases: RoadmapPhase[];
    totalTasks: number;
  };
}

export interface WhiteLabelConfig {
  agencyName: string;
  agencyTagline: string;
  logoUrl: string;
  primaryColor: string;
  contactEmail: string;
  website: string;
  showPoweredBy: boolean;
}

export const DEFAULT_WHITE_LABEL: WhiteLabelConfig = {
  agencyName: '',
  agencyTagline: '',
  logoUrl: '',
  primaryColor: '#22d3ee',
  contactEmail: '',
  website: '',
  showPoweredBy: true,
};