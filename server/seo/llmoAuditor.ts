import { buildMarketingReport, checkItem, finalizeCategory } from './auditShared.js';
import type { PageAuditContext } from './pageContext.js';

function brandAlignment(ctx: PageAuditContext): 'pass' | 'warn' | 'fail' {
  const names = [ctx.title, ctx.h1s[0], ctx.ogTitle].filter(Boolean);
  if (names.length < 2) return names.length === 1 ? 'warn' : 'fail';
  const first = names[0].toLowerCase().slice(0, 20);
  const aligned = names.every((n) => n.toLowerCase().includes(first.slice(0, 8)) || first.includes(n.toLowerCase().slice(0, 8)));
  return aligned ? 'pass' : 'warn';
}

export function buildLlmoReport(ctx: PageAuditContext) {
  const brandAlign = brandAlignment(ctx);

  const brand: ReturnType<typeof checkItem>[] = [
    checkItem({
      id: 'llmo-brand-alignment',
      label: 'Consistent brand naming',
      status: brandAlign,
      maxScore: 12,
      detail:
        brandAlign === 'pass'
          ? 'Title, H1, and OG title align'
          : `Title: "${ctx.title.slice(0, 40)}" · H1: "${(ctx.h1s[0] ?? 'none').slice(0, 40)}"`,
      explanation: 'LLMs build a mental model of your brand from title, headings, and metadata — inconsistency causes wrong summaries.',
      action: brandAlign === 'pass' ? 'keep' : 'improve',
      actionText:
        brandAlign === 'pass'
          ? 'Brand naming is consistent across key fields.'
          : 'Align <title>, H1, and og:title to use the same brand name and core value proposition.',
      priority: 'critical',
    }),
    checkItem({
      id: 'llmo-value-prop',
      label: 'Clear value proposition',
      status: ctx.metaDesc.length >= 80 && ctx.h1s.length >= 1 ? 'pass' : ctx.metaDesc || ctx.h1s.length ? 'warn' : 'fail',
      maxScore: 10,
      detail: ctx.metaDesc ? `Meta: ${ctx.metaDesc.slice(0, 70)}…` : ctx.h1s[0] ?? 'No value proposition detected',
      explanation: 'LLMs summarize what you do in one sentence — your meta description and H1 are the primary training signals.',
      action: ctx.metaDesc.length >= 80 ? 'keep' : 'improve',
      actionText:
        ctx.metaDesc.length >= 80
          ? 'Value proposition is articulated clearly.'
          : 'Write a one-sentence value proposition: who you serve, what problem you solve, and how.',
      priority: 'high',
    }),
    checkItem({
      id: 'llmo-org-schema',
      label: 'Machine-readable company profile',
      status: ctx.hasOrganizationSchema ? 'pass' : 'fail',
      maxScore: 12,
      detail: ctx.hasOrganizationSchema ? 'Organization JSON-LD found' : 'No Organization schema',
      explanation: 'Organization schema gives LLMs structured facts: legal name, URL, logo, description, and social profiles.',
      action: ctx.hasOrganizationSchema ? 'keep' : 'add',
      actionText: ctx.hasOrganizationSchema
        ? 'Organization schema helps LLMs describe your company accurately.'
        : 'Add Organization JSON-LD with name, url, logo, description, sameAs (LinkedIn, etc.).',
      priority: 'critical',
    }),
  ];

  const readability: ReturnType<typeof checkItem>[] = [
    checkItem({
      id: 'llmo-structured-content',
      label: 'Structured, parseable layout',
      status: ctx.hasMain && ctx.h2Count >= 2 ? 'pass' : ctx.h2Count >= 1 ? 'warn' : 'fail',
      maxScore: 10,
      detail: `<main>: ${ctx.hasMain ? 'yes' : 'no'}, H2 sections: ${ctx.h2Count}`,
      explanation: 'Semantic HTML and section headings help LLMs chunk and summarize content without hallucinating structure.',
      action: ctx.hasMain && ctx.h2Count >= 2 ? 'keep' : 'improve',
      actionText:
        ctx.hasMain && ctx.h2Count >= 2
          ? 'Content structure is LLM-friendly.'
          : 'Use <main> and descriptive H2 sections for each service, product, or topic.',
      priority: 'high',
    }),
    checkItem({
      id: 'llmo-factual-lists',
      label: 'Extractable facts and offerings',
      status: ctx.listCount >= 2 && ctx.wordCount >= 250 ? 'pass' : ctx.wordCount >= 150 ? 'warn' : 'fail',
      maxScore: 8,
      detail: `${ctx.listCount} lists, ${ctx.wordCount} words`,
      explanation: 'Bullet lists of services, features, and capabilities are directly quoted when LLMs describe B2B companies.',
      action: ctx.listCount >= 2 ? 'keep' : 'add',
      actionText:
        ctx.listCount >= 2
          ? 'Factual lists help LLMs enumerate your offerings.'
          : 'Add explicit bullet lists of services, industries served, integrations, and key capabilities.',
      priority: 'medium',
    }),
    checkItem({
      id: 'llmo-contact-path',
      label: 'Contact and conversion path',
      status: ctx.hasContactLink ? 'pass' : 'warn',
      maxScore: 8,
      detail: ctx.hasContactLink ? 'Contact link found' : 'No clear contact/demo link',
      explanation: 'When LLMs recommend vendors, they often surface companies with clear contact or demo paths.',
      action: ctx.hasContactLink ? 'keep' : 'add',
      actionText: ctx.hasContactLink
        ? 'Contact path is visible.'
        : 'Add a prominent Contact, Book a Demo, or Get Started link in navigation and footer.',
      priority: 'medium',
    }),
    checkItem({
      id: 'llmo-lang',
      label: 'Language declaration',
      status: ctx.htmlLang ? 'pass' : 'warn',
      maxScore: 4,
      detail: ctx.htmlLang ? `lang="${ctx.htmlLang}"` : 'No lang attribute',
      explanation: 'Language tags prevent LLMs from misidentifying content language when summarizing for global audiences.',
      action: ctx.htmlLang ? 'keep' : 'add',
      actionText: ctx.htmlLang ? 'Language declared.' : 'Set lang="en" (or appropriate code) on the <html> element.',
      priority: 'low',
    }),
  ];

  const aiPolicy: ReturnType<typeof checkItem>[] = [
    checkItem({
      id: 'llmo-llms-txt',
      label: 'llms.txt AI usage policy',
      status: ctx.hasLlmsTxt ? 'pass' : 'warn',
      maxScore: 10,
      detail: ctx.hasLlmsTxt
        ? `llms.txt found (${ctx.llmsTxtText.length} chars)`
        : 'No llms.txt — LLMs may not know which pages to prioritize',
      explanation: 'llms.txt is the emerging standard for telling AI systems which pages best represent your brand and how to cite you.',
      action: ctx.hasLlmsTxt ? 'keep' : 'add',
      actionText: ctx.hasLlmsTxt
        ? 'llms.txt guides LLM crawlers — keep your best pages listed.'
        : 'Create /llms.txt with your homepage, about, product pages, and a one-paragraph brand summary.',
      priority: 'high',
    }),
    checkItem({
      id: 'llmo-robots-access',
      label: 'Crawler access for AI bots',
      status: ctx.hasRobotsTxt && !ctx.robotsText.toLowerCase().includes('disallow: /') ? 'pass' : ctx.hasRobotsTxt ? 'warn' : 'warn',
      maxScore: 8,
      detail: ctx.hasRobotsTxt ? 'robots.txt present' : 'No robots.txt',
      explanation: 'Blocking all crawlers in robots.txt prevents LLM training and retrieval systems from learning about your brand.',
      action: ctx.hasRobotsTxt ? 'keep' : 'add',
      actionText: ctx.hasRobotsTxt
        ? 'Review robots.txt — avoid blanket Disallow rules that block AI crawlers from public content.'
        : 'Add robots.txt that allows access to public marketing pages.',
      priority: 'medium',
    }),
    checkItem({
      id: 'llmo-https-trust',
      label: 'Trustworthy delivery (HTTPS)',
      status: ctx.hasHttps ? 'pass' : 'fail',
      maxScore: 8,
      detail: ctx.hasHttps ? 'HTTPS' : 'HTTP only',
      explanation: 'LLM-powered tools deprioritize or warn on non-secure sites when recommending businesses.',
      action: ctx.hasHttps ? 'keep' : 'add',
      actionText: ctx.hasHttps ? 'Site is secure.' : 'Enable HTTPS across all pages.',
      priority: 'critical',
    }),
  ];

  return buildMarketingReport('llmo', 'LLMO (Large Language Model Optimization)', [
    finalizeCategory('llmo-brand', 'Brand Representation', brand),
    finalizeCategory('llmo-readability', 'LLM Readability', readability),
    finalizeCategory('llmo-policy', 'AI Crawler Policy', aiPolicy),
  ]);
}