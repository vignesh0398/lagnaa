import { startAuditJob } from './fetchJson';

export type CheckStatus = 'pass' | 'warn' | 'fail';
export type SeoAction = 'add' | 'remove' | 'improve' | 'keep';
export type AudienceType = 'b2b' | 'b2c';
export type ReportKind = 'seo' | 'geo' | 'llmo' | 'aeo';

export interface SeoCheck {
  id: string;
  label: string;
  status: CheckStatus;
  score: number;
  maxScore: number;
  detail: string;
  explanation: string;
  action: SeoAction;
  actionText: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface SeoCategory {
  id: string;
  name: string;
  score: number;
  maxScore: number;
  checks: SeoCheck[];
}

export interface SeoActionItem {
  id: string;
  label: string;
  category: string;
  status: CheckStatus;
  priority: 'critical' | 'high' | 'medium' | 'low';
  detail: string;
  explanation: string;
  actionText: string;
  action: SeoAction;
}

export interface SeoActionPlan {
  criticalFailures: SeoActionItem[];
  needsImprovement: SeoActionItem[];
  shouldAdd: SeoActionItem[];
  shouldRemove: SeoActionItem[];
  workingWell: SeoActionItem[];
}

export interface SeoAuditCounts {
  pass: number;
  warn: number;
  fail: number;
  total: number;
}

export interface MarketingReport {
  kind: ReportKind;
  label: string;
  score: number;
  grade: string;
  summary: string;
  categories: SeoCategory[];
  recommendations: string[];
  actionPlan: SeoActionPlan;
  counts: SeoAuditCounts;
}

export interface SeoAuditResult {
  id: string;
  url: string;
  finalUrl: string;
  domain: string;
  auditedAt: string;
  audienceType?: AudienceType;
  reports?: MarketingReport[];
  score: number;
  grade: string;
  summary: string;
  categories: SeoCategory[];
  recommendations: string[];
  actionPlan: SeoActionPlan;
  counts: SeoAuditCounts;
  metrics: {
    responseTimeMs: number;
    pageSizeKb: number;
    statusCode: number;
    wordCount: number;
    imageCount: number;
    imagesMissingAlt: number;
    internalLinks: number;
    externalLinks: number;
    headingCount: { h1: number; h2: number; h3: number };
    hasHttps: boolean;
    hasSitemap: boolean;
    hasRobotsTxt: boolean;
    hasMetaKeywords?: boolean;
    httpImageCount?: number;
    emptyLinkCount?: number;
  };
}

export interface SeoAuditSummary {
  id: string;
  url: string;
  finalUrl: string;
  domain?: string;
  audienceType?: AudienceType;
  score: number;
  grade: string;
  auditedAt: string;
  counts: SeoAuditCounts;
  failCount: number;
  warnCount: number;
  reportScores?: { kind: ReportKind; label: string; score: number; grade: string }[];
}

export async function runSeoAudit(url: string, audienceType: AudienceType = 'b2c'): Promise<SeoAuditResult> {
  return startAuditJob<SeoAuditResult>('/api/seo/audit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, audienceType }),
  });
}

export async function getSeoHistory(): Promise<{ audits: SeoAuditSummary[]; total: number }> {
  const res = await fetch('/api/seo/history');
  if (!res.ok) throw new Error('Failed to load history');
  return res.json();
}

export async function getSeoAudit(id: string): Promise<SeoAuditResult> {
  const res = await fetch(`/api/seo/${id}`);
  if (!res.ok) throw new Error('Audit not found');
  return res.json();
}

export async function deleteSeoAudit(id: string): Promise<void> {
  const res = await fetch(`/api/seo/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete audit');
}

export function getSeoExportUrl(id: string, format: 'html' | 'csv' | 'json' | 'pdf'): string {
  return `/api/seo/${id}/export?format=${format}`;
}