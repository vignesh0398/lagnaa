import { fetchJsonAudit } from './fetchJson';
import type { AudienceType, SeoActionPlan, SeoAuditCounts, SeoCategory } from './seo';

export type MarketingToolType = 'competitor' | 'social' | 'local' | 'roadmap';

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

export interface WhiteLabelConfig {
  agencyName: string;
  agencyTagline: string;
  logoUrl: string;
  primaryColor: string;
  contactEmail: string;
  website: string;
  showPoweredBy: boolean;
}

export interface MarketingHistoryItem {
  id: string;
  type: MarketingToolType;
  url: string;
  finalUrl: string;
  score: number;
  grade: string;
  auditedAt: string;
  summary: string;
}

export async function runCompetitorAudit(url: string, competitors: string[]): Promise<MarketingToolResult> {
  const data = await fetchJsonAudit<{ result: MarketingToolResult }>('/api/marketing/competitors/audit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, competitors }),
  });
  return data.result;
}

export async function runSocialAudit(url: string): Promise<MarketingToolResult> {
  const data = await fetchJsonAudit<{ result: MarketingToolResult }>('/api/marketing/social/audit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  return data.result;
}

export async function runLocalAudit(url: string, businessName?: string, city?: string): Promise<MarketingToolResult> {
  const data = await fetchJsonAudit<{ result: MarketingToolResult }>('/api/marketing/local/audit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, businessName, city }),
  });
  return data.result;
}

export async function generateRoadmap(opts: {
  auditId?: string;
  url?: string;
  audienceType?: AudienceType;
}): Promise<MarketingToolResult> {
  const data = await fetchJsonAudit<{ result: MarketingToolResult }>('/api/marketing/roadmap/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(opts),
  });
  return data.result;
}

export async function getMarketingHistory(type?: MarketingToolType): Promise<MarketingHistoryItem[]> {
  const q = type ? `?type=${type}` : '';
  const res = await fetch(`/api/marketing/history${q}`);
  if (!res.ok) throw new Error('Failed to load history');
  const data = await res.json();
  return data.items;
}

export async function getWhiteLabel(): Promise<WhiteLabelConfig> {
  const res = await fetch('/api/marketing/white-label');
  if (!res.ok) throw new Error('Failed to load settings');
  return res.json();
}

export async function saveWhiteLabel(config: Partial<WhiteLabelConfig>): Promise<WhiteLabelConfig> {
  const res = await fetch('/api/marketing/white-label', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Save failed');
  return data.config;
}

export async function getSeoAuditsForRoadmap(): Promise<
  { id: string; url: string; score: number; grade: string; audienceType: string; auditedAt: string }[]
> {
  const res = await fetch('/api/marketing/seo-audits');
  if (!res.ok) throw new Error('Failed to load SEO audits');
  const data = await res.json();
  return data.audits;
}

export function getMarketingExportUrl(id: string, format: 'html' | 'csv' | 'pdf'): string {
  return `/api/marketing/${id}/export?format=${format}`;
}