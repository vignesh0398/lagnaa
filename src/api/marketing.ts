import { fetchJson, startAuditJob } from './fetchJson';
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
  return startAuditJob<MarketingToolResult>('/api/marketing/competitors/audit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, competitors }),
  });
}

export async function runSocialAudit(url: string): Promise<MarketingToolResult> {
  return startAuditJob<MarketingToolResult>('/api/marketing/social/audit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
}

export async function runLocalAudit(url: string, businessName?: string, city?: string): Promise<MarketingToolResult> {
  return startAuditJob<MarketingToolResult>('/api/marketing/local/audit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, businessName, city }),
  });
}

export async function generateRoadmap(opts: {
  auditId?: string;
  url?: string;
  audienceType?: AudienceType;
}): Promise<MarketingToolResult> {
  return startAuditJob<MarketingToolResult>('/api/marketing/roadmap/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(opts),
  });
}

export async function getMarketingHistory(type?: MarketingToolType): Promise<MarketingHistoryItem[]> {
  const q = type ? `?type=${type}` : '';
  const data = await fetchJson<{ items: MarketingHistoryItem[] }>(`/api/marketing/history${q}`);
  return data.items;
}

export async function getWhiteLabel(): Promise<WhiteLabelConfig> {
  return fetchJson<WhiteLabelConfig>('/api/marketing/white-label');
}

export async function saveWhiteLabel(config: Partial<WhiteLabelConfig>): Promise<WhiteLabelConfig> {
  const data = await fetchJson<{ config: WhiteLabelConfig }>('/api/marketing/white-label', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  return data.config;
}

export async function getSeoAuditsForRoadmap(): Promise<
  { id: string; url: string; score: number; grade: string; audienceType: string; auditedAt: string }[]
> {
  const data = await fetchJson<{ audits: { id: string; url: string; score: number; grade: string; audienceType: string; auditedAt: string }[] }>(
    '/api/marketing/seo-audits'
  );
  return data.audits;
}

export function getMarketingExportUrl(id: string, format: 'html' | 'csv' | 'pdf'): string {
  return `/api/marketing/${id}/export?format=${format}`;
}