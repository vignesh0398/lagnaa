import {
  type SeoActionPlan,
  type SeoAuditCounts,
  type SeoCategory,
  type SeoCheck,
} from './seoActionPlan.js';
import {
  type AudienceType,
  type MarketingReport,
  checkItem,
  finalizeCategory,
} from './auditShared.js';
import type { PageAuditContext } from './pageContext.js';

export type { CheckStatus, SeoAction, SeoActionPlan, SeoAuditCounts, SeoCategory, SeoCheck } from './seoActionPlan.js';
export type { AudienceType, MarketingReport, ReportKind } from './auditShared.js';

export interface SeoAuditResult {
  id: string;
  url: string;
  finalUrl: string;
  domain: string;
  auditedAt: string;
  audienceType: AudienceType;
  reports: MarketingReport[];
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
    hasMetaKeywords: boolean;
    httpImageCount: number;
    emptyLinkCount: number;
  };
}

export function buildSeoCategories(ctx: PageAuditContext): SeoCategory[] {
  const {
    finalUrl,
    responseStatus,
    responseTimeMs,
    pageSizeKb,
    title,
    metaDesc,
    metaKeywords,
    metaRobots,
    canonical,
    viewport,
    charset,
    htmlLang,
    h1s,
    h2Count,
    h3Count,
    ogTitle,
    ogDesc,
    ogImage,
    ogUrl,
    twitterCard,
    jsonLdCount: jsonLd,
    favicon,
    hasMain,
    lazyImages,
    metaRefresh,
    imageCount,
    imagesMissingAlt,
    httpImageCount,
    wordCount,
    internalLinks,
    externalLinks,
    emptyLinkCount,
    hasHttps,
    hasSitemap,
    hasRobotsTxt,
    robotsHasSitemap,
  } = ctx;

  const categories: SeoCategory[] = [];

  const onPage: SeoCheck[] = [
    checkItem({
      id: 'title',
      label: 'Title tag',
      status: !title ? 'fail' : title.length >= 30 && title.length <= 60 ? 'pass' : title ? 'warn' : 'fail',
      maxScore: 12,
      detail: title ? `"${title}" (${title.length} chars)` : 'Missing title tag',
      explanation: 'The title tag is the main headline Google shows in search results. It strongly affects click-through rate and rankings.',
      action: !title ? 'add' : title.length < 30 || title.length > 60 ? 'improve' : 'keep',
      actionText: !title
        ? 'Add a <title> tag in the <head> with your primary keyword and brand (30–60 characters).'
        : title.length < 30
          ? 'Expand the title to at least 30 characters — include your main keyword and value proposition.'
          : title.length > 60
            ? 'Shorten the title to under 60 characters so it is not cut off in Google results.'
            : 'Keep this title — length and presence look good.',
      priority: !title ? 'critical' : 'high',
    }),
    checkItem({
      id: 'meta-description',
      label: 'Meta description',
      status: !metaDesc ? 'fail' : metaDesc.length >= 120 && metaDesc.length <= 160 ? 'pass' : 'warn',
      maxScore: 10,
      detail: metaDesc ? `${metaDesc.length} characters — "${metaDesc.slice(0, 80)}${metaDesc.length > 80 ? '…' : ''}"` : 'Missing meta description',
      explanation: 'Meta descriptions do not directly rank pages, but they appear under your title in Google and influence whether people click.',
      action: !metaDesc ? 'add' : 'improve',
      actionText: !metaDesc
        ? 'Add <meta name="description" content="…"> summarizing the page in 120–160 characters with a clear call to action.'
        : 'Rewrite the description to 120–160 characters — make it compelling and unique to this page.',
      priority: !metaDesc ? 'critical' : 'high',
    }),
    checkItem({
      id: 'h1',
      label: 'H1 heading',
      status: h1s.length === 1 ? 'pass' : h1s.length === 0 ? 'fail' : 'warn',
      maxScore: 10,
      detail: h1s.length === 0 ? 'No H1 found' : h1s.length === 1 ? `"${h1s[0].slice(0, 80)}"` : `${h1s.length} H1 tags found`,
      explanation: 'Each page should have one clear H1 that tells Google and visitors what the page is about.',
      action: h1s.length === 0 ? 'add' : h1s.length > 1 ? 'remove' : 'keep',
      actionText:
        h1s.length === 0
          ? 'Add one <h1> at the top of the main content with your primary topic keyword.'
          : h1s.length > 1
            ? `Remove or downgrade ${h1s.length - 1} extra H1 tag(s) to <h2> — only one H1 per page.`
            : 'Keep your single H1 — structure is correct.',
      priority: h1s.length === 0 ? 'critical' : 'high',
    }),
    checkItem({
      id: 'headings',
      label: 'Heading structure (H2/H3)',
      status: h2Count >= 1 ? 'pass' : h1s.length > 0 ? 'warn' : 'fail',
      maxScore: 6,
      detail: `H2: ${h2Count}, H3: ${h3Count}`,
      explanation: 'Subheadings break content into scannable sections and help Google understand page structure.',
      action: h2Count >= 1 ? 'keep' : 'add',
      actionText:
        h2Count >= 1
          ? 'Heading hierarchy looks reasonable — keep using H2/H3 for sections.'
          : 'Add H2 subheadings for each major section of the page content.',
      priority: 'medium',
    }),
    checkItem({
      id: 'content-length',
      label: 'Content depth',
      status: wordCount >= 300 ? 'pass' : wordCount >= 150 ? 'warn' : 'fail',
      maxScore: 8,
      detail: `${wordCount} words visible on page`,
      explanation: 'Thin pages often struggle to rank. Useful, original content signals expertise to search engines.',
      action: wordCount >= 300 ? 'keep' : 'add',
      actionText:
        wordCount >= 300
          ? 'Content depth is adequate for a landing page.'
          : 'Add more original, helpful copy — aim for 300+ words on important pages.',
      priority: wordCount < 150 ? 'high' : 'medium',
    }),
    checkItem({
      id: 'meta-keywords',
      label: 'Deprecated meta keywords',
      status: !metaKeywords ? 'pass' : 'warn',
      maxScore: 4,
      detail: metaKeywords ? `Found: "${metaKeywords.slice(0, 60)}${metaKeywords.length > 60 ? '…' : ''}"` : 'Not present (good)',
      explanation: 'Google ignores meta keywords since 2009. Keeping them adds clutter and can expose your strategy to competitors.',
      action: metaKeywords ? 'remove' : 'keep',
      actionText: metaKeywords
        ? 'Remove the <meta name="keywords"> tag — it has no SEO benefit.'
        : 'No deprecated keywords tag — nothing to remove.',
      priority: 'low',
    }),
  ];
  categories.push(finalizeCategory('on-page', 'On-Page SEO', onPage));

  const technical: SeoCheck[] = [
    checkItem({
      id: 'https',
      label: 'HTTPS secure',
      status: hasHttps ? 'pass' : 'fail',
      maxScore: 10,
      detail: hasHttps ? 'Site loads over HTTPS' : 'Page is not served over HTTPS',
      explanation: 'HTTPS is a confirmed Google ranking signal and required for user trust and browser features.',
      action: hasHttps ? 'keep' : 'add',
      actionText: hasHttps
        ? 'SSL is active — keep certificate renewed.'
        : 'Install an SSL certificate and force all HTTP traffic to redirect to HTTPS.',
      priority: 'critical',
    }),
    checkItem({
      id: 'status-code',
      label: 'HTTP status code',
      status: responseStatus === 200 ? 'pass' : responseStatus >= 300 && responseStatus < 400 ? 'warn' : 'fail',
      maxScore: 8,
      detail: `Server returned HTTP ${responseStatus}`,
      explanation: 'Search engines expect a 200 OK for indexable pages. Errors or redirects can block indexing.',
      action: responseStatus === 200 ? 'keep' : 'improve',
      actionText:
        responseStatus === 200
          ? 'Page returns 200 OK — correct for indexing.'
          : 'Fix server configuration so this URL returns HTTP 200 without unnecessary redirect chains.',
      priority: responseStatus === 200 ? 'low' : 'critical',
    }),
    checkItem({
      id: 'canonical',
      label: 'Canonical URL',
      status: canonical ? 'pass' : 'warn',
      maxScore: 8,
      detail: canonical || 'No canonical link tag found',
      explanation: 'Canonical tags tell Google which URL is the master version when duplicate or similar pages exist.',
      action: canonical ? 'keep' : 'add',
      actionText: canonical
        ? `Canonical is set — keep it pointing to the preferred URL.`
        : 'Add <link rel="canonical" href="preferred-url"> in the <head>.',
      priority: 'high',
    }),
    checkItem({
      id: 'robots-meta',
      label: 'Indexability (noindex)',
      status: metaRobots.includes('noindex') ? 'fail' : 'pass',
      maxScore: 8,
      detail: metaRobots.includes('noindex') ? 'Page has noindex — hidden from Google' : 'Page is indexable',
      explanation: 'A noindex directive tells search engines not to list this page. It must be removed for SEO traffic.',
      action: metaRobots.includes('noindex') ? 'remove' : 'keep',
      actionText: metaRobots.includes('noindex')
        ? 'Remove noindex from the robots meta tag or page headers if you want this page in search results.'
        : 'No blocking noindex detected — page can be indexed.',
      priority: 'critical',
    }),
    checkItem({
      id: 'meta-refresh',
      label: 'Meta refresh redirect',
      status: !metaRefresh ? 'pass' : 'fail',
      maxScore: 4,
      detail: metaRefresh ? 'Meta refresh redirect detected' : 'No meta refresh',
      explanation: 'Meta refresh redirects are discouraged by Google — use proper 301 server redirects instead.',
      action: metaRefresh ? 'remove' : 'keep',
      actionText: metaRefresh
        ? 'Remove <meta http-equiv="refresh"> and use a server-side 301 redirect.'
        : 'No problematic meta refresh — good.',
      priority: 'high',
    }),
    checkItem({
      id: 'sitemap',
      label: 'XML sitemap',
      status: hasSitemap ? 'pass' : 'warn',
      maxScore: 6,
      detail: hasSitemap ? 'sitemap.xml found at site root' : 'No sitemap.xml detected',
      explanation: 'Sitemaps help Google discover and crawl all important pages, especially on newer sites.',
      action: hasSitemap ? 'keep' : 'add',
      actionText: hasSitemap
        ? 'Submit sitemap.xml in Google Search Console if you have not already.'
        : 'Create /sitemap.xml listing all important URLs and submit it in Google Search Console.',
      priority: 'high',
    }),
    checkItem({
      id: 'robots-txt',
      label: 'robots.txt',
      status: hasRobotsTxt ? 'pass' : 'warn',
      maxScore: 6,
      detail: hasRobotsTxt
        ? robotsHasSitemap
          ? 'robots.txt found with sitemap reference'
          : 'robots.txt found (no sitemap line)'
        : 'No robots.txt detected',
      explanation: 'robots.txt controls crawler access and is where you point Google to your sitemap.',
      action: hasRobotsTxt ? (robotsHasSitemap ? 'keep' : 'improve') : 'add',
      actionText: !hasRobotsTxt
        ? 'Add /robots.txt with User-agent rules and Sitemap: https://yoursite.com/sitemap.xml'
        : !robotsHasSitemap
          ? 'Add a Sitemap: line to robots.txt pointing to your XML sitemap.'
          : 'robots.txt is configured — keep it updated when you add new sections.',
      priority: 'medium',
    }),
    checkItem({
      id: 'speed',
      label: 'Server response time',
      status: responseTimeMs < 800 ? 'pass' : responseTimeMs < 2000 ? 'warn' : 'fail',
      maxScore: 8,
      detail: `${responseTimeMs}ms to first byte`,
      explanation: 'Slow pages hurt rankings and conversions. Google uses Core Web Vitals as a ranking factor.',
      action: responseTimeMs < 800 ? 'keep' : 'improve',
      actionText:
        responseTimeMs < 800
          ? 'Response time is healthy.'
          : 'Improve hosting, enable caching, compress images, and use a CDN to get under 800ms.',
      priority: responseTimeMs >= 2000 ? 'high' : 'medium',
    }),
    checkItem({
      id: 'page-size',
      label: 'HTML page weight',
      status: pageSizeKb < 500 ? 'pass' : pageSizeKb < 1500 ? 'warn' : 'fail',
      maxScore: 6,
      detail: `${pageSizeKb} KB of HTML downloaded`,
      explanation: 'Heavy HTML slows mobile loading. Large inline scripts and bloated markup hurt performance scores.',
      action: pageSizeKb < 500 ? 'keep' : 'improve',
      actionText:
        pageSizeKb < 500
          ? 'HTML size is acceptable.'
          : 'Minify HTML/CSS/JS, defer non-critical scripts, and remove unused code.',
      priority: 'medium',
    }),
  ];
  categories.push(finalizeCategory('technical', 'Technical SEO', technical));

  const mobile: SeoCheck[] = [
    checkItem({
      id: 'viewport',
      label: 'Mobile viewport',
      status: viewport ? 'pass' : 'fail',
      maxScore: 12,
      detail: viewport || 'Missing viewport meta tag',
      explanation: 'Without a viewport tag, mobile browsers render a desktop-width page that is unreadable on phones.',
      action: viewport ? 'keep' : 'add',
      actionText: viewport
        ? 'Viewport is set — mobile rendering should work.'
        : 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> immediately.',
      priority: 'critical',
    }),
    checkItem({
      id: 'lang',
      label: 'HTML language attribute',
      status: htmlLang ? 'pass' : 'warn',
      maxScore: 6,
      detail: htmlLang ? `lang="${htmlLang}"` : 'No lang on <html>',
      explanation: 'The lang attribute helps screen readers and tells Google which language the content is in.',
      action: htmlLang ? 'keep' : 'add',
      actionText: htmlLang ? 'Language is declared — keep it accurate.' : 'Add lang="en" (or your language) to the <html> tag.',
      priority: 'medium',
    }),
    checkItem({
      id: 'charset',
      label: 'Character encoding',
      status: charset ? 'pass' : 'warn',
      maxScore: 4,
      detail: charset ? 'UTF-8 charset declared' : 'No charset meta',
      explanation: 'Correct encoding prevents garbled characters in titles and descriptions shown in search.',
      action: charset ? 'keep' : 'add',
      actionText: charset ? 'Encoding declared.' : 'Add <meta charset="UTF-8"> in the first 1024 bytes of <head>.',
      priority: 'low',
    }),
    checkItem({
      id: 'favicon',
      label: 'Favicon',
      status: favicon ? 'pass' : 'warn',
      maxScore: 4,
      detail: favicon ? 'Favicon linked' : 'No favicon detected',
      explanation: 'Favicons appear in browser tabs and bookmarks — they improve brand recognition and trust.',
      action: favicon ? 'keep' : 'add',
      actionText: favicon ? 'Favicon present.' : 'Add a favicon.ico or PNG icon linked in <head>.',
      priority: 'low',
    }),
    checkItem({
      id: 'main-landmark',
      label: 'Semantic <main> element',
      status: hasMain ? 'pass' : 'warn',
      maxScore: 4,
      detail: hasMain ? '<main> landmark found' : 'No <main> element',
      explanation: 'Semantic HTML helps accessibility tools and search engines identify primary page content.',
      action: hasMain ? 'keep' : 'add',
      actionText: hasMain ? 'Main landmark exists.' : 'Wrap primary content in a <main> element.',
      priority: 'low',
    }),
  ];
  categories.push(finalizeCategory('mobile', 'Mobile & UX', mobile));

  const social: SeoCheck[] = [
    checkItem({
      id: 'og-tags',
      label: 'Open Graph tags',
      status: ogTitle && ogDesc && ogImage ? 'pass' : ogTitle || ogDesc ? 'warn' : 'fail',
      maxScore: 10,
      detail:
        [ogTitle && 'og:title', ogDesc && 'og:description', ogImage && 'og:image', ogUrl && 'og:url']
          .filter(Boolean)
          .join(', ') || 'Missing Open Graph tags',
      explanation: 'Open Graph controls how your link looks when shared on Facebook, LinkedIn, WhatsApp, and Slack.',
      action: ogTitle && ogDesc && ogImage ? 'keep' : 'add',
      actionText:
        ogTitle && ogDesc && ogImage
          ? 'OG tags complete — previews should render well.'
          : 'Add og:title, og:description, og:image, and og:url meta tags in <head>.',
      priority: 'high',
    }),
    checkItem({
      id: 'twitter-card',
      label: 'Twitter / X card',
      status: twitterCard ? 'pass' : 'warn',
      maxScore: 6,
      detail: twitterCard ? `twitter:card=${twitterCard}` : 'No Twitter card meta',
      explanation: 'Twitter/X cards enable large image previews when your URL is posted on the platform.',
      action: twitterCard ? 'keep' : 'add',
      actionText: twitterCard
        ? 'Twitter card configured.'
        : 'Add <meta name="twitter:card" content="summary_large_image"> plus title and image.',
      priority: 'medium',
    }),
  ];
  categories.push(finalizeCategory('social', 'Social & Sharing', social));

  const media: SeoCheck[] = [
    checkItem({
      id: 'image-alt',
      label: 'Image alt text',
      status: imageCount === 0 ? 'warn' : imagesMissingAlt === 0 ? 'pass' : imagesMissingAlt <= imageCount * 0.2 ? 'warn' : 'fail',
      maxScore: 10,
      detail: imageCount === 0 ? 'No images on page' : `${imagesMissingAlt} of ${imageCount} images missing alt text`,
      explanation: 'Alt text describes images for screen readers and helps Google Image Search understand your visuals.',
      action: imagesMissingAlt === 0 ? 'keep' : 'add',
      actionText:
        imagesMissingAlt === 0
          ? 'All images have alt text.'
          : `Add descriptive alt attributes to ${imagesMissingAlt} image(s). Use empty alt="" only for decorative images.`,
      priority: imagesMissingAlt > imageCount * 0.5 ? 'high' : 'medium',
    }),
    checkItem({
      id: 'http-images',
      label: 'Mixed HTTP images on HTTPS',
      status: httpImageCount === 0 ? 'pass' : 'warn',
      maxScore: 6,
      detail: httpImageCount === 0 ? 'No insecure image URLs' : `${httpImageCount} image(s) loaded over HTTP`,
      explanation: 'Mixed content triggers browser warnings and can block images on secure pages.',
      action: httpImageCount === 0 ? 'keep' : 'improve',
      actionText:
        httpImageCount === 0
          ? 'Images use HTTPS or relative URLs.'
          : 'Update image URLs to https:// or host assets on your secure domain.',
      priority: 'medium',
    }),
    checkItem({
      id: 'lazy-load',
      label: 'Image lazy loading',
      status: imageCount === 0 ? 'pass' : lazyImages > 0 ? 'pass' : 'warn',
      maxScore: 4,
      detail: imageCount === 0 ? 'N/A' : lazyImages > 0 ? `${lazyImages} images use loading="lazy"` : 'No lazy loading detected',
      explanation: 'Lazy loading defers off-screen images and improves initial page load speed.',
      action: lazyImages > 0 || imageCount === 0 ? 'keep' : 'add',
      actionText:
        lazyImages > 0
          ? 'Lazy loading in use — good for performance.'
          : 'Add loading="lazy" to below-the-fold images.',
      priority: 'low',
    }),
    checkItem({
      id: 'structured-data',
      label: 'Schema.org JSON-LD',
      status: jsonLd > 0 ? 'pass' : 'warn',
      maxScore: 10,
      detail: jsonLd > 0 ? `${jsonLd} structured data block(s)` : 'No JSON-LD found',
      explanation: 'Structured data can earn rich results in Google (stars, FAQs, breadcrumbs) and clarifies entity type.',
      action: jsonLd > 0 ? 'keep' : 'add',
      actionText:
        jsonLd > 0
          ? 'Structured data present — validate at search.google.com/test/rich-results.'
          : 'Add JSON-LD for Organization, WebSite, or relevant type (LocalBusiness, Article, etc.).',
      priority: 'high',
    }),
    checkItem({
      id: 'internal-links',
      label: 'Internal linking',
      status: internalLinks >= 3 ? 'pass' : internalLinks >= 1 ? 'warn' : 'fail',
      maxScore: 6,
      detail: `${internalLinks} internal links, ${externalLinks} external`,
      explanation: 'Internal links distribute authority and help Google discover deeper pages on your site.',
      action: internalLinks >= 3 ? 'keep' : 'add',
      actionText:
        internalLinks >= 3
          ? 'Internal linking is reasonable.'
          : 'Add contextual links to related service pages, blog posts, or contact page.',
      priority: 'medium',
    }),
    checkItem({
      id: 'empty-links',
      label: 'Links without visible text',
      status: emptyLinkCount === 0 ? 'pass' : emptyLinkCount <= 2 ? 'warn' : 'fail',
      maxScore: 4,
      detail: emptyLinkCount === 0 ? 'All links have text or aria-label' : `${emptyLinkCount} link(s) with no text`,
      explanation: 'Empty links hurt accessibility and provide no keyword context for SEO.',
      action: emptyLinkCount === 0 ? 'keep' : 'improve',
      actionText:
        emptyLinkCount === 0
          ? 'Link text looks good.'
          : 'Add visible text or aria-label to icon-only links (e.g. social icons).',
      priority: 'medium',
    }),
  ];
  categories.push(finalizeCategory('media', 'Content & Media', media));

  return categories;
}