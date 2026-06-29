import { buildMarketingReport, finalizeCategory, checkItem, gradeFromScore } from '../seo/auditShared.js';
import { buildSeoCategories } from '../seo/seoAuditor.js';
import { fetchPageContext } from '../seo/pageContext.js';
import type { CompetitorCompareResult, CompetitorSiteScore } from './marketingTypes.js';

async function scoreSite(inputUrl: string, label: string): Promise<CompetitorSiteScore> {
  const ctx = await fetchPageContext(inputUrl);
  const categories = buildSeoCategories(ctx);
  const totalScore = categories.reduce((s, c) => s + c.score, 0);
  const totalMax = categories.reduce((s, c) => s + c.maxScore, 0);
  const score = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

  const fails = categories.flatMap((c) => c.checks).filter((c) => c.status === 'fail');
  const passes = categories.flatMap((c) => c.checks).filter((c) => c.status === 'pass');

  return {
    url: inputUrl,
    finalUrl: ctx.finalUrl,
    domain: ctx.domain,
    score,
    grade: gradeFromScore(score),
    wordCount: ctx.wordCount,
    hasHttps: ctx.hasHttps,
    title: ctx.title,
    metaDesc: ctx.metaDesc,
    h1Count: ctx.h1s.length,
    internalLinks: ctx.internalLinks,
    schemaCount: ctx.jsonLdCount,
    highlights: passes.slice(0, 4).map((c) => c.label),
    weaknesses: fails.slice(0, 4).map((c) => c.label),
  };
}

export async function runCompetitorCompare(yourUrl: string, competitorUrls: string[]): Promise<CompetitorCompareResult> {
  const competitors = competitorUrls.slice(0, 3).filter(Boolean);
  if (!competitors.length) throw new Error('Add at least one competitor URL.');

  const settled = await Promise.allSettled([
    scoreSite(yourUrl, 'Your site'),
    ...competitors.map((u) => scoreSite(u, 'Competitor')),
  ]);

  const yourResult = settled[0];
  if (yourResult.status === 'rejected') {
    throw yourResult.reason instanceof Error ? yourResult.reason : new Error('Could not analyze your website.');
  }
  const yourSite = yourResult.value;

  const rivalScores = settled.slice(1).flatMap((result, i) => {
    if (result.status === 'fulfilled') return [result.value];
    const reason = result.reason instanceof Error ? result.reason.message : 'Unknown error';
    throw new Error(`Competitor ${i + 1} failed: ${reason}`);
  });

  const all = [yourSite, ...rivalScores];
  const winner = all.reduce((best, cur) => (cur.score > best.score ? cur : best));
  const yourRank = [...all].sort((a, b) => b.score - a.score).findIndex((s) => s.finalUrl === yourSite.finalUrl) + 1;

  const gaps: string[] = [];
  for (const rival of rivalScores) {
    if (rival.score > yourSite.score) {
      gaps.push(`${rival.domain} scores ${rival.score}% vs your ${yourSite.score}%`);
    }
    if (rival.wordCount > yourSite.wordCount * 1.3) {
      gaps.push(`${rival.domain} has ${rival.wordCount} words — yours has ${yourSite.wordCount}`);
    }
    if (rival.schemaCount > yourSite.schemaCount) {
      gaps.push(`${rival.domain} uses more structured data (${rival.schemaCount} blocks)`);
    }
  }

  const checks = [
    checkItem({
      id: 'your-rank',
      label: 'Your ranking vs competitors',
      status: yourRank === 1 ? 'pass' : yourRank === 2 ? 'warn' : 'fail',
      maxScore: 15,
      detail: `You rank #${yourRank} of ${all.length} (score ${yourSite.score}%)`,
      explanation: 'Overall SEO score compared head-to-head with each competitor URL.',
      action: yourRank === 1 ? 'keep' : 'improve',
      actionText:
        yourRank === 1
          ? 'You lead this comparison — maintain content and technical edge.'
          : `Close the gap: study ${winner.domain}'s title, content depth, and schema usage.`,
      priority: yourRank > 2 ? 'critical' : 'high',
    }),
    checkItem({
      id: 'content-depth',
      label: 'Content depth vs rivals',
      status:
        yourSite.wordCount >= Math.max(...rivalScores.map((r) => r.wordCount))
          ? 'pass'
          : yourSite.wordCount >= Math.min(...rivalScores.map((r) => r.wordCount))
            ? 'warn'
            : 'fail',
      maxScore: 12,
      detail: `Your site: ${yourSite.wordCount} words`,
      explanation: 'Thin content often loses to competitors targeting the same keywords.',
      action: 'improve',
      actionText: 'Expand key pages to match or exceed the longest competitor page in this set.',
      priority: 'high',
    }),
    checkItem({
      id: 'technical-parity',
      label: 'HTTPS & technical parity',
      status: yourSite.hasHttps && rivalScores.every((r) => !r.hasHttps || yourSite.hasHttps) ? 'pass' : !yourSite.hasHttps ? 'fail' : 'warn',
      maxScore: 10,
      detail: yourSite.hasHttps ? 'HTTPS enabled' : 'Missing HTTPS',
      explanation: 'Technical trust signals must match competitors to stay competitive.',
      action: yourSite.hasHttps ? 'keep' : 'add',
      actionText: yourSite.hasHttps ? 'SSL is active.' : 'Enable HTTPS immediately — competitors may already have it.',
      priority: 'critical',
    }),
    ...rivalScores.map((rival, i) =>
      checkItem({
        id: `vs-${i}`,
        label: `vs ${rival.domain}`,
        status: yourSite.score >= rival.score ? 'pass' : yourSite.score >= rival.score - 10 ? 'warn' : 'fail',
        maxScore: 8,
        detail: `You ${yourSite.score}% · Them ${rival.score}%`,
        explanation: `Direct score comparison with ${rival.domain}.`,
        action: yourSite.score >= rival.score ? 'keep' : 'improve',
        actionText:
          yourSite.score >= rival.score
            ? `Ahead of ${rival.domain} — protect your lead.`
            : `Review ${rival.domain}: title "${rival.title.slice(0, 50)}", ${rival.wordCount} words, ${rival.schemaCount} schema blocks.`,
        priority: yourSite.score < rival.score ? 'high' : 'medium',
      })
    ),
  ];

  const categories = [finalizeCategory('compare', 'Competitive Analysis', checks)];
  const report = buildMarketingReport('seo', 'Competitor Compare', categories);
  const avgGap = Math.round(rivalScores.reduce((s, r) => s + Math.max(0, r.score - yourSite.score), 0) / rivalScores.length);

  return {
    id: `mkt-comp-${Date.now()}`,
    type: 'competitor',
    url: yourUrl,
    finalUrl: yourSite.finalUrl,
    domain: yourSite.domain,
    auditedAt: new Date().toISOString(),
    score: yourSite.score,
    grade: yourSite.grade,
    summary:
      yourRank === 1
        ? `You lead this competitive set at ${yourSite.score}%. ${winner.domain === yourSite.domain ? '' : `Stay ahead of ${rivalScores.map((r) => r.domain).join(', ')}.`}`
        : `You rank #${yourRank} at ${yourSite.score}%. Leader is ${winner.domain} at ${winner.score}%. Average gap: ${avgGap} pts.`,
    categories: report.categories,
    actionPlan: report.actionPlan,
    counts: report.counts,
    recommendations: report.recommendations,
    meta: { yourSite, competitors: rivalScores, winner: winner.domain, gaps },
  };
}