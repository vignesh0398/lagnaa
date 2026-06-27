import { buildActionPlan } from '../seo/seoActionPlan.js';
import type { AudienceType } from '../seo/auditShared.js';
import { runMarketingAudit } from '../seo/marketingAuditor.js';
import { getAuditById } from '../seo/seoStore.js';
import type { RoadmapPhase, RoadmapResult } from './marketingTypes.js';
import type { SeoActionItem } from '../seo/seoActionPlan.js';

function collectActionItems(audit: Awaited<ReturnType<typeof runMarketingAudit>>): SeoActionItem[] {
  const items: SeoActionItem[] = [];
  if (audit.reports?.length) {
    for (const report of audit.reports) {
      const plan = report.actionPlan;
      items.push(
        ...plan.criticalFailures,
        ...plan.shouldAdd.filter((i) => i.status !== 'pass'),
        ...plan.shouldRemove,
        ...plan.needsImprovement
      );
    }
  } else {
    const plan = audit.actionPlan;
    items.push(...plan.criticalFailures, ...plan.shouldAdd, ...plan.shouldRemove, ...plan.needsImprovement);
  }
  const seen = new Set<string>();
  return items.filter((i) => {
    if (seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });
}

function toPhaseItem(item: SeoActionItem) {
  return {
    label: item.label,
    actionText: item.actionText,
    priority: item.priority,
    category: item.category,
  };
}

function buildPhases(items: SeoActionItem[]): RoadmapPhase[] {
  const critical = items.filter((i) => i.priority === 'critical' || i.status === 'fail');
  const high = items.filter((i) => i.priority === 'high' && !critical.includes(i));
  const medium = items.filter((i) => i.priority === 'medium');
  const low = items.filter((i) => i.priority === 'low');

  return [
    {
      phase: 'Phase 1 — Quick wins',
      timeframe: 'Week 1–2',
      items: critical.slice(0, 8).map(toPhaseItem),
    },
    {
      phase: 'Phase 2 — Foundation',
      timeframe: 'Week 3–4',
      items: [...critical.slice(8), ...high].slice(0, 8).map(toPhaseItem),
    },
    {
      phase: 'Phase 3 — Growth',
      timeframe: 'Month 2',
      items: [...high.slice(8), ...medium].slice(0, 8).map(toPhaseItem),
    },
    {
      phase: 'Phase 4 — Polish',
      timeframe: 'Month 3',
      items: [...medium.slice(8), ...low].slice(0, 8).map(toPhaseItem),
    },
  ].filter((p) => p.items.length > 0);
}

export async function runRoadmapGenerate(
  options: { auditId?: string; url?: string; audienceType?: AudienceType }
): Promise<RoadmapResult> {
  let audit: Awaited<ReturnType<typeof runMarketingAudit>>;
  let sourceUrl: string;

  if (options.auditId) {
    const saved = getAuditById(options.auditId);
    if (!saved) throw new Error('SEO audit not found — run an SEO audit first or provide a URL.');
    audit = saved as Awaited<ReturnType<typeof runMarketingAudit>>;
    sourceUrl = saved.url;
  } else if (options.url?.trim()) {
    audit = await runMarketingAudit(options.url.trim(), options.audienceType ?? 'b2c');
    sourceUrl = options.url.trim();
  } else {
    throw new Error('Provide a URL or select a previous SEO audit.');
  }

  const items = collectActionItems(audit);
  const phases = buildPhases(items);
  const totalTasks = phases.reduce((s, p) => s + p.items.length, 0);

  const pseudoCategories = [
    {
      id: 'roadmap',
      name: '90-Day Marketing Roadmap',
      score: Math.max(0, 100 - items.length * 3),
      maxScore: 100,
      checks: items.slice(0, 12).map((item, idx) => ({
        id: `task-${idx}`,
        label: item.label,
        status: item.status as 'pass' | 'warn' | 'fail',
        score: item.status === 'pass' ? 10 : item.status === 'warn' ? 5 : 0,
        maxScore: 10,
        detail: item.detail,
        explanation: item.explanation,
        action: item.action,
        actionText: item.actionText,
        priority: item.priority,
      })),
    },
  ];

  const actionPlan = buildActionPlan(pseudoCategories);

  return {
    id: `mkt-roadmap-${Date.now()}`,
    type: 'roadmap',
    url: sourceUrl,
    finalUrl: audit.finalUrl,
    domain: audit.domain,
    auditedAt: new Date().toISOString(),
    score: audit.score,
    grade: audit.grade,
    summary: `90-day marketing roadmap with ${totalTasks} prioritized tasks across 4 phases, based on your ${audit.audienceType?.toUpperCase() ?? 'B2C'} audit (${audit.score}% overall).`,
    categories: pseudoCategories,
    actionPlan,
    counts: {
      pass: 0,
      warn: items.filter((i) => i.status === 'warn').length,
      fail: items.filter((i) => i.status === 'fail').length,
      total: totalTasks,
    },
    recommendations: items.slice(0, 10).map((i) => i.actionText),
    meta: {
      audienceType: audit.audienceType,
      phases,
      totalTasks,
      sourceAuditId: options.auditId,
    },
  };
}