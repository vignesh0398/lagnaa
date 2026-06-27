import { buildAeoReport } from './aeoAuditor.js';
import {
  type AudienceType,
  buildMarketingReport,
  compositeSummary,
  gradeFromScore,
  reportsForAudience,
} from './auditShared.js';
import { buildGeoReport } from './geoAuditor.js';
import { buildLlmoReport } from './llmoAuditor.js';
import { fetchPageContext } from './pageContext.js';
import { buildSeoCategories, type SeoAuditResult } from './seoAuditor.js';

function aggregateCounts(reports: ReturnType<typeof buildMarketingReport>[]) {
  return reports.reduce(
    (acc, r) => ({
      pass: acc.pass + r.counts.pass,
      warn: acc.warn + r.counts.warn,
      fail: acc.fail + r.counts.fail,
      total: acc.total + r.counts.total,
    }),
    { pass: 0, warn: 0, fail: 0, total: 0 }
  );
}

export async function runMarketingAudit(inputUrl: string, audienceType: AudienceType = 'b2c'): Promise<SeoAuditResult> {
  const ctx = await fetchPageContext(inputUrl);
  const kinds = reportsForAudience(audienceType);

  const reportBuilders = {
    seo: () => buildMarketingReport('seo', 'SEO', buildSeoCategories(ctx)),
    geo: () => buildGeoReport(ctx),
    llmo: () => buildLlmoReport(ctx),
    aeo: () => buildAeoReport(ctx),
  };

  const reports = kinds.map((k) => reportBuilders[k]());
  const seoReport = reports.find((r) => r.kind === 'seo')!;
  const score = Math.round(reports.reduce((s, r) => s + r.score, 0) / reports.length);
  const counts = aggregateCounts(reports);

  return {
    id: `seo-${Date.now()}`,
    url: ctx.startUrl,
    finalUrl: ctx.finalUrl,
    domain: ctx.domain,
    auditedAt: new Date().toISOString(),
    audienceType,
    reports,
    score,
    grade: gradeFromScore(score),
    summary: compositeSummary(audienceType, reports),
    categories: seoReport.categories,
    recommendations: reports.flatMap((r) => r.recommendations).slice(0, 15),
    actionPlan: seoReport.actionPlan,
    counts,
    metrics: {
      responseTimeMs: ctx.responseTimeMs,
      pageSizeKb: ctx.pageSizeKb,
      statusCode: ctx.responseStatus,
      wordCount: ctx.wordCount,
      imageCount: ctx.imageCount,
      imagesMissingAlt: ctx.imagesMissingAlt,
      internalLinks: ctx.internalLinks,
      externalLinks: ctx.externalLinks,
      headingCount: { h1: ctx.h1s.length, h2: ctx.h2Count, h3: ctx.h3Count },
      hasHttps: ctx.hasHttps,
      hasSitemap: ctx.hasSitemap,
      hasRobotsTxt: ctx.hasRobotsTxt,
      hasMetaKeywords: Boolean(ctx.metaKeywords),
      httpImageCount: ctx.httpImageCount,
      emptyLinkCount: ctx.emptyLinkCount,
    },
  };
}

/** @deprecated Use runMarketingAudit — kept for internal importers */
export async function runSeoAudit(inputUrl: string, audienceType: AudienceType = 'b2c') {
  return runMarketingAudit(inputUrl, audienceType);
}