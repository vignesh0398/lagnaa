import { buildMarketingReport, checkItem, finalizeCategory } from '../seo/auditShared.js';
import { fetchPageContext } from '../seo/pageContext.js';
import type { SocialPreviewCard, SocialPreviewResult } from './marketingTypes.js';

function buildPreview(
  platform: string,
  title: string,
  description: string,
  imageUrl: string,
  requiredImage: boolean
): SocialPreviewCard {
  const issues: string[] = [];
  if (!title) issues.push('Missing title');
  if (!description) issues.push('Missing description');
  if (requiredImage && !imageUrl) issues.push('Missing preview image');
  if (title.length > 70) issues.push('Title may be truncated');
  if (description.length > 160) issues.push('Description may be truncated');

  const status = issues.length === 0 ? 'pass' : issues.length <= 1 ? 'warn' : 'fail';
  return { platform, title: title || '(No title)', description: description || '(No description)', imageUrl, status, issues };
}

export async function runSocialPreviewAudit(inputUrl: string): Promise<SocialPreviewResult> {
  const ctx = await fetchPageContext(inputUrl);
  const title = ctx.ogTitle || ctx.title;
  const description = ctx.ogDesc || ctx.metaDesc;
  const image = ctx.ogImage;

  const previews: SocialPreviewCard[] = [
    buildPreview('Facebook / LinkedIn', title, description, image, true),
    buildPreview('Twitter / X', ctx.twitterCard ? title : title, description, image, true),
    buildPreview('WhatsApp', title, description, image, true),
    buildPreview('Slack / iMessage', title, description, image, false),
  ];

  const checks = [
    checkItem({
      id: 'og-title',
      label: 'Open Graph title',
      status: ctx.ogTitle ? (ctx.ogTitle.length <= 70 ? 'pass' : 'warn') : 'fail',
      maxScore: 12,
      detail: ctx.ogTitle ? `"${ctx.ogTitle.slice(0, 60)}"` : 'Missing og:title',
      explanation: 'og:title controls the headline when your link is shared on Facebook, LinkedIn, and WhatsApp.',
      action: ctx.ogTitle ? 'keep' : 'add',
      actionText: ctx.ogTitle ? 'OG title set.' : 'Add <meta property="og:title" content="…">',
      priority: 'critical',
    }),
    checkItem({
      id: 'og-desc',
      label: 'Open Graph description',
      status: ctx.ogDesc ? (ctx.ogDesc.length <= 200 ? 'pass' : 'warn') : 'fail',
      maxScore: 12,
      detail: ctx.ogDesc ? `${ctx.ogDesc.length} chars` : 'Missing og:description',
      explanation: 'The preview snippet under your title on social platforms.',
      action: ctx.ogDesc ? 'keep' : 'add',
      actionText: ctx.ogDesc ? 'OG description set.' : 'Add og:description — aim for 120–160 compelling characters.',
      priority: 'high',
    }),
    checkItem({
      id: 'og-image',
      label: 'Share preview image',
      status: ctx.ogImage ? 'pass' : 'fail',
      maxScore: 15,
      detail: ctx.ogImage ? ctx.ogImage.slice(0, 80) : 'No og:image — links will look plain',
      explanation: 'Large image previews get 2–3× more clicks on social. Recommended 1200×630px.',
      action: ctx.ogImage ? 'keep' : 'add',
      actionText: ctx.ogImage
        ? 'Preview image configured.'
        : 'Add og:image pointing to a 1200×630px branded image.',
      priority: 'critical',
    }),
    checkItem({
      id: 'twitter-card',
      label: 'Twitter / X card',
      status: ctx.twitterCard ? 'pass' : 'warn',
      maxScore: 10,
      detail: ctx.twitterCard ? `twitter:card=${ctx.twitterCard}` : 'No Twitter card meta',
      explanation: 'Twitter cards enable large image previews on X.',
      action: ctx.twitterCard ? 'keep' : 'add',
      actionText: ctx.twitterCard
        ? 'Twitter card type set.'
        : 'Add twitter:card, twitter:title, twitter:description, twitter:image.',
      priority: 'high',
    }),
    checkItem({
      id: 'og-url',
      label: 'Canonical share URL',
      status: ctx.ogUrl || ctx.canonical ? 'pass' : 'warn',
      maxScore: 8,
      detail: ctx.ogUrl || ctx.canonical || 'No og:url or canonical',
      explanation: 'Ensures social platforms attribute shares to the correct URL.',
      action: ctx.ogUrl ? 'keep' : 'add',
      actionText: 'Add og:url matching your canonical page URL.',
      priority: 'medium',
    }),
    checkItem({
      id: 'title-fallback',
      label: 'Fallback page title',
      status: ctx.title ? 'pass' : 'fail',
      maxScore: 8,
      detail: ctx.title || 'No <title> tag',
      explanation: 'Platforms fall back to <title> when OG tags are missing.',
      action: ctx.title ? 'keep' : 'add',
      actionText: 'Ensure <title> is compelling — it appears when OG tags are absent.',
      priority: 'high',
    }),
  ];

  const categories = [finalizeCategory('social-meta', 'Social Meta Tags', checks)];
  const report = buildMarketingReport('seo', 'Social Preview', categories);
  const failPreviews = previews.filter((p) => p.status === 'fail').length;

  return {
    id: `mkt-social-${Date.now()}`,
    type: 'social',
    url: inputUrl,
    finalUrl: ctx.finalUrl,
    domain: ctx.domain,
    auditedAt: new Date().toISOString(),
    score: report.score,
    grade: report.grade,
    summary:
      failPreviews === 0
        ? `Social previews look strong at ${report.score}%. Your links should render well across major platforms.`
        : `Social score ${report.score}% — ${failPreviews} platform preview(s) have critical gaps. Fix og:image and og:title first.`,
    categories: report.categories,
    actionPlan: report.actionPlan,
    counts: report.counts,
    recommendations: report.recommendations,
    meta: {
      previews,
      ogTitle: ctx.ogTitle,
      ogDescription: ctx.ogDesc,
      ogImage: ctx.ogImage,
      twitterCard: ctx.twitterCard,
    },
  };
}