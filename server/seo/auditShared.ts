import { buildActionPlan, countChecks, type SeoAction, type SeoCategory, type SeoCheck, type CheckStatus } from './seoActionPlan.js';

export type AudienceType = 'b2b' | 'b2c';
export type ReportKind = 'seo' | 'geo' | 'llmo' | 'aeo';

export interface MarketingReport {
  kind: ReportKind;
  label: string;
  score: number;
  grade: string;
  summary: string;
  categories: SeoCategory[];
  recommendations: string[];
  actionPlan: ReturnType<typeof buildActionPlan>;
  counts: ReturnType<typeof countChecks>;
}

interface CheckInput {
  id: string;
  label: string;
  status: CheckStatus;
  maxScore: number;
  detail: string;
  explanation: string;
  action: SeoAction;
  actionText: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export function checkItem(input: CheckInput): SeoCheck {
  const ratio = input.status === 'pass' ? 1 : input.status === 'warn' ? 0.5 : 0;
  return {
    id: input.id,
    label: input.label,
    status: input.status,
    score: Math.round(input.maxScore * ratio),
    maxScore: input.maxScore,
    detail: input.detail,
    explanation: input.explanation,
    action: input.action,
    actionText: input.actionText,
    priority: input.priority,
  };
}

export function gradeFromScore(score: number): string {
  if (score >= 95) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

export function finalizeCategory(id: string, name: string, checks: SeoCheck[]): SeoCategory {
  return {
    id,
    name,
    checks,
    score: checks.reduce((s, c) => s + c.score, 0),
    maxScore: checks.reduce((s, c) => s + c.maxScore, 0),
  };
}

export function buildMarketingReport(kind: ReportKind, label: string, categories: SeoCategory[]): MarketingReport {
  const totalScore = categories.reduce((s, c) => s + c.score, 0);
  const totalMax = categories.reduce((s, c) => s + c.maxScore, 0);
  const score = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
  const counts = countChecks(categories);
  const grade = gradeFromScore(score);

  const recommendations = categories
    .flatMap((c) => c.checks)
    .filter((c) => c.status !== 'pass')
    .sort((a, b) => {
      const p = { critical: 0, high: 1, medium: 2, low: 3 };
      return p[a.priority] - p[b.priority] || a.status.localeCompare(b.status);
    })
    .map((c) => c.actionText)
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .slice(0, 12);

  let summary: string;
  if (score >= 90) {
    summary = `Strong ${label} score at ${score}%. ${counts.fail === 0 ? 'Address remaining warnings to reach excellence.' : `Fix ${counts.fail} critical issue(s), then polish warnings.`}`;
  } else if (score >= 70) {
    summary = `Solid ${label} foundation at ${score}%. ${counts.fail} critical failure(s) and ${counts.warn} warning(s) — follow the action plan below.`;
  } else {
    summary = `${label} score ${score}% — significant improvements needed. Prioritize critical failures first.`;
  }

  return {
    kind,
    label,
    score,
    grade,
    summary,
    categories,
    recommendations,
    actionPlan: buildActionPlan(categories),
    counts,
  };
}

export function reportsForAudience(audience: AudienceType): ReportKind[] {
  if (audience === 'b2b') return ['seo', 'geo', 'llmo'];
  return ['seo', 'aeo', 'geo'];
}

export function audienceLabel(audience: AudienceType): string {
  return audience === 'b2b' ? 'B2B' : 'B2C';
}

export function compositeSummary(audience: AudienceType, reports: MarketingReport[]): string {
  const names = reports.map((r) => r.label).join(', ');
  const avg = Math.round(reports.reduce((s, r) => s + r.score, 0) / reports.length);
  const totalFail = reports.reduce((s, r) => s + r.counts.fail, 0);
  const audienceName = audience === 'b2b' ? 'B2B' : 'B2C';

  if (avg >= 85) {
    return `${audienceName} marketing audit averaged ${avg}% across ${names}. ${totalFail === 0 ? 'Strong readiness — refine warnings to maximize visibility.' : `Resolve ${totalFail} critical issue(s) across reports for best results.`}`;
  }
  if (avg >= 65) {
    return `${audienceName} audit: ${avg}% average across ${names}. ${totalFail} critical issue(s) found — use each report tab for targeted fixes.`;
  }
  return `${audienceName} audit: ${avg}% average — substantial work needed across ${names}. Start with critical failures in each report.`;
}

export async function fetchResource(url: string, userAgent: string): Promise<{ ok: boolean; status: number; text?: string }> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': userAgent, Accept: 'text/html,text/plain,application/xml' },
      signal: AbortSignal.timeout(10000),
      redirect: 'follow',
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  } catch {
    return { ok: false, status: 0 };
  }
}