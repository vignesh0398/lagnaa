import { buildMarketingReport, checkItem, finalizeCategory } from './auditShared.js';
import type { PageAuditContext } from './pageContext.js';

export function buildGeoReport(ctx: PageAuditContext) {
  const entity: ReturnType<typeof checkItem>[] = [
    checkItem({
      id: 'geo-organization-schema',
      label: 'Organization entity schema',
      status: ctx.hasOrganizationSchema || ctx.hasLocalBusinessSchema ? 'pass' : 'fail',
      maxScore: 12,
      detail:
        ctx.hasOrganizationSchema || ctx.hasLocalBusinessSchema
          ? 'Organization or LocalBusiness JSON-LD detected'
          : 'No Organization schema found',
      explanation: 'Generative engines use structured entity data to cite and summarize your brand accurately in AI answers.',
      action: ctx.hasOrganizationSchema || ctx.hasLocalBusinessSchema ? 'keep' : 'add',
      actionText:
        ctx.hasOrganizationSchema || ctx.hasLocalBusinessSchema
          ? 'Entity schema is present — keep name, URL, and description aligned with your site.'
          : 'Add JSON-LD Organization (or LocalBusiness) with name, url, logo, and description.',
      priority: 'critical',
    }),
    checkItem({
      id: 'geo-brand-clarity',
      label: 'Clear brand identity on page',
      status: ctx.title && ctx.h1s.length === 1 ? 'pass' : ctx.title ? 'warn' : 'fail',
      maxScore: 10,
      detail: ctx.title ? `Brand signal: "${ctx.brandNameGuess}"` : 'No clear brand in title',
      explanation: 'AI search engines need an unambiguous brand name to attribute citations and recommendations correctly.',
      action: ctx.title && ctx.h1s.length === 1 ? 'keep' : 'improve',
      actionText:
        ctx.title && ctx.h1s.length === 1
          ? 'Brand naming is clear in title and H1.'
          : 'Ensure title and H1 clearly state your brand name and what you do in one sentence.',
      priority: 'high',
    }),
    checkItem({
      id: 'geo-canonical',
      label: 'Canonical URL for citations',
      status: ctx.canonical ? 'pass' : 'warn',
      maxScore: 8,
      detail: ctx.canonical || 'No canonical tag — AI may cite duplicate URLs',
      explanation: 'A canonical URL tells generative engines which version of a page to reference when citing your content.',
      action: ctx.canonical ? 'keep' : 'add',
      actionText: ctx.canonical
        ? 'Canonical is set — good for citation consistency.'
        : 'Add <link rel="canonical"> so AI engines cite the preferred URL.',
      priority: 'high',
    }),
    checkItem({
      id: 'geo-eeat-about',
      label: 'About / trust signals (E-E-A-T)',
      status: ctx.hasAboutLink && ctx.hasAuthorSignal ? 'pass' : ctx.hasAboutLink || ctx.hasAuthorSignal ? 'warn' : 'fail',
      maxScore: 10,
      detail: [
        ctx.hasAboutLink ? 'About page linked' : 'No about link',
        ctx.hasAuthorSignal ? 'Author signal found' : 'No author markup',
      ].join(' · '),
      explanation: 'Experience, expertise, authority, and trust signals help AI systems decide whether to cite you as a source.',
      action: ctx.hasAboutLink && ctx.hasAuthorSignal ? 'keep' : 'add',
      actionText:
        ctx.hasAboutLink && ctx.hasAuthorSignal
          ? 'Trust signals present — maintain accurate team and author info.'
          : 'Add an About page, author bylines, and link to them from key content pages.',
      priority: 'high',
    }),
  ];

  const aiReadiness: ReturnType<typeof checkItem>[] = [
    checkItem({
      id: 'geo-llms-txt',
      label: 'llms.txt for AI crawlers',
      status: ctx.hasLlmsTxt ? 'pass' : 'warn',
      maxScore: 10,
      detail: ctx.hasLlmsTxt ? 'llms.txt found at site root' : 'No llms.txt — emerging standard for AI crawler guidance',
      explanation: 'llms.txt tells large language model crawlers what content to use and how to represent your brand.',
      action: ctx.hasLlmsTxt ? 'keep' : 'add',
      actionText: ctx.hasLlmsTxt
        ? 'llms.txt is live — keep it updated with key pages and usage policy.'
        : 'Publish /llms.txt listing your most authoritative pages and brand description for AI systems.',
      priority: 'medium',
    }),
    checkItem({
      id: 'geo-structured-facts',
      label: 'Structured, quotable content',
      status: ctx.listCount >= 2 || ctx.tableCount >= 1 ? 'pass' : ctx.wordCount >= 200 ? 'warn' : 'fail',
      maxScore: 8,
      detail: `Lists: ${ctx.listCount}, Tables: ${ctx.tableCount}, ${ctx.wordCount} words`,
      explanation: 'Generative engines prefer content they can extract as bullet facts, steps, or data points to quote in answers.',
      action: ctx.listCount >= 2 ? 'keep' : 'add',
      actionText:
        ctx.listCount >= 2
          ? 'Content uses lists/tables — easy for AI to quote.'
          : 'Add bullet lists, comparison tables, or step-by-step sections with concrete facts and figures.',
      priority: 'medium',
    }),
    checkItem({
      id: 'geo-freshness',
      label: 'Content freshness signals',
      status: ctx.lastModified || (ctx.copyrightYear && ctx.copyrightYear >= new Date().getFullYear() - 1) ? 'pass' : 'warn',
      maxScore: 6,
      detail: ctx.lastModified
        ? `Last modified: ${ctx.lastModified}`
        : ctx.copyrightYear
          ? `Copyright year: ${ctx.copyrightYear}`
          : 'No freshness signals detected',
      explanation: 'AI search engines favor recently updated sources when generating answers on current topics.',
      action: ctx.lastModified ? 'keep' : 'improve',
      actionText: ctx.lastModified
        ? 'Freshness metadata present.'
        : 'Add article:modified_time meta or visibly update copyright dates when content changes.',
      priority: 'medium',
    }),
    checkItem({
      id: 'geo-external-citations',
      label: 'Outbound authority links',
      status: ctx.externalLinks >= 2 ? 'pass' : ctx.externalLinks >= 1 ? 'warn' : 'fail',
      maxScore: 6,
      detail: `${ctx.externalLinks} external link(s) to other domains`,
      explanation: 'Citing reputable external sources signals your content is well-researched — a factor AI systems weigh when choosing citations.',
      action: ctx.externalLinks >= 2 ? 'keep' : 'add',
      actionText:
        ctx.externalLinks >= 2
          ? 'Outbound citations present — good for authority.'
          : 'Link to authoritative sources (studies, standards, official docs) where relevant.',
      priority: 'low',
    }),
  ];

  const visibility: ReturnType<typeof checkItem>[] = [
    checkItem({
      id: 'geo-indexable',
      label: 'Page indexable for AI crawlers',
      status: ctx.metaRobots.includes('noindex') ? 'fail' : 'pass',
      maxScore: 10,
      detail: ctx.metaRobots.includes('noindex') ? 'Page blocked with noindex' : 'Page is indexable',
      explanation: 'If a page is noindex, neither Google nor AI crawlers can use it as a citable source.',
      action: ctx.metaRobots.includes('noindex') ? 'remove' : 'keep',
      actionText: ctx.metaRobots.includes('noindex')
        ? 'Remove noindex if you want this page cited in AI-generated answers.'
        : 'Page is crawlable — good for generative visibility.',
      priority: 'critical',
    }),
    checkItem({
      id: 'geo-og-complete',
      label: 'Rich preview metadata',
      status: ctx.ogTitle && ctx.ogDesc && ctx.ogImage ? 'pass' : ctx.ogTitle ? 'warn' : 'fail',
      maxScore: 8,
      detail: [ctx.ogTitle && 'og:title', ctx.ogDesc && 'og:description', ctx.ogImage && 'og:image'].filter(Boolean).join(', ') || 'Incomplete OG tags',
      explanation: 'When AI tools surface your links, complete Open Graph data ensures professional, trustworthy previews.',
      action: ctx.ogTitle && ctx.ogDesc && ctx.ogImage ? 'keep' : 'add',
      actionText:
        ctx.ogTitle && ctx.ogDesc && ctx.ogImage
          ? 'OG metadata complete.'
          : 'Add og:title, og:description, and og:image for consistent AI and social previews.',
      priority: 'medium',
    }),
    checkItem({
      id: 'geo-https',
      label: 'Secure HTTPS delivery',
      status: ctx.hasHttps ? 'pass' : 'fail',
      maxScore: 8,
      detail: ctx.hasHttps ? 'HTTPS active' : 'Not served over HTTPS',
      explanation: 'Secure sites are more likely to be trusted and cited by generative search engines.',
      action: ctx.hasHttps ? 'keep' : 'add',
      actionText: ctx.hasHttps ? 'HTTPS enabled.' : 'Enable SSL — required for trust in AI citations.',
      priority: 'critical',
    }),
  ];

  return buildMarketingReport('geo', 'GEO (Generative Engine Optimization)', [
    finalizeCategory('geo-entity', 'Entity & Authority', entity),
    finalizeCategory('geo-ai-ready', 'AI Readiness', aiReadiness),
    finalizeCategory('geo-visibility', 'Crawl & Visibility', visibility),
  ]);
}