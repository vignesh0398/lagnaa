import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';
import { fetchResource } from './auditShared.js';

const FETCH_TIMEOUT = 20000;
export const USER_AGENT = 'Lagnaa-SEO-Audit/1.0 (+https://lagnaa.app)';

export function normalizeInputUrl(input: string): string {
  let url = input.trim();
  if (!url) throw new Error('Website URL is required.');
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('URL must use http or https.');
  }
  return parsed.href;
}

function parseJsonLdTypes($: CheerioAPI): string[] {
  const types: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = $(el).html()?.trim();
      if (!raw) return;
      const data = JSON.parse(raw) as Record<string, unknown> | Record<string, unknown>[];
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        const t = item['@type'];
        if (typeof t === 'string') types.push(t);
        else if (Array.isArray(t)) types.push(...t.filter((x): x is string => typeof x === 'string'));
        const graph = item['@graph'];
        if (Array.isArray(graph)) {
          for (const g of graph) {
            if (g && typeof g === 'object' && typeof (g as Record<string, unknown>)['@type'] === 'string') {
              types.push((g as Record<string, string>)['@type']);
            }
          }
        }
      }
    } catch {
      /* skip invalid JSON-LD */
    }
  });
  return types.map((t) => t.toLowerCase());
}

function hasSchemaType(types: string[], ...names: string[]): boolean {
  const lower = names.map((n) => n.toLowerCase());
  return types.some((t) => lower.some((n) => t.includes(n)));
}

export interface PageAuditContext {
  startUrl: string;
  finalUrl: string;
  domain: string;
  html: string;
  $: CheerioAPI;
  responseStatus: number;
  responseTimeMs: number;
  pageSizeKb: number;
  title: string;
  metaDesc: string;
  metaKeywords: string;
  metaRobots: string;
  canonical: string;
  viewport: string;
  charset: string;
  htmlLang: string;
  h1s: string[];
  h2Count: number;
  h3Count: number;
  h2Texts: string[];
  ogTitle: string;
  ogDesc: string;
  ogImage: string;
  ogUrl: string;
  twitterCard: string;
  jsonLdCount: number;
  schemaTypes: string[];
  favicon: boolean;
  hasMain: boolean;
  lazyImages: number;
  metaRefresh: boolean;
  imageCount: number;
  imagesMissingAlt: number;
  httpImageCount: number;
  bodyText: string;
  wordCount: number;
  internalLinks: number;
  externalLinks: number;
  emptyLinkCount: number;
  hasHttps: boolean;
  hasSitemap: boolean;
  hasRobotsTxt: boolean;
  robotsHasSitemap: boolean;
  robotsText: string;
  hasLlmsTxt: boolean;
  llmsTxtText: string;
  hasAboutLink: boolean;
  hasContactLink: boolean;
  hasAuthorSignal: boolean;
  hasFaqSection: boolean;
  hasFaqSchema: boolean;
  hasHowToSchema: boolean;
  hasSpeakableSchema: boolean;
  hasOrganizationSchema: boolean;
  hasLocalBusinessSchema: boolean;
  hasArticleSchema: boolean;
  hasProductSchema: boolean;
  listCount: number;
  tableCount: number;
  questionHeadings: number;
  firstParagraphWords: number;
  copyrightYear: number | null;
  lastModified: string;
  brandNameGuess: string;
}

export async function fetchPageContext(inputUrl: string): Promise<PageAuditContext> {
  const startUrl = normalizeInputUrl(inputUrl);
  const startTime = Date.now();

  const response = await fetch(startUrl, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT),
    redirect: 'follow',
  });

  const responseTimeMs = Date.now() - startTime;
  const html = await response.text();
  const pageSizeKb = Math.round((new TextEncoder().encode(html).length / 1024) * 10) / 10;
  const finalUrl = response.url || startUrl;
  const domain = new URL(finalUrl).origin;
  const $ = cheerio.load(html);

  const title = $('title').first().text().trim();
  const metaDesc = $('meta[name="description"]').attr('content')?.trim() ?? '';
  const metaKeywords = $('meta[name="keywords"]').attr('content')?.trim() ?? '';
  const metaRobots = $('meta[name="robots"]').attr('content')?.toLowerCase() ?? '';
  const canonical = $('link[rel="canonical"]').attr('href')?.trim() ?? '';
  const viewport = $('meta[name="viewport"]').attr('content')?.trim() ?? '';
  const charset = $('meta[charset]').attr('charset') ?? $('meta[http-equiv="Content-Type"]').attr('content') ?? '';
  const htmlLang = $('html').attr('lang')?.trim() ?? '';
  const h1s = $('h1').map((_, el) => $(el).text().trim()).get().filter(Boolean);
  const h2Count = $('h2').length;
  const h3Count = $('h3').length;
  const h2Texts = $('h2').map((_, el) => $(el).text().trim()).get();
  const ogTitle = $('meta[property="og:title"]').attr('content')?.trim() ?? '';
  const ogDesc = $('meta[property="og:description"]').attr('content')?.trim() ?? '';
  const ogImage = $('meta[property="og:image"]').attr('content')?.trim() ?? '';
  const ogUrl = $('meta[property="og:url"]').attr('content')?.trim() ?? '';
  const twitterCard = $('meta[name="twitter:card"]').attr('content')?.trim() ?? '';
  const jsonLdCount = $('script[type="application/ld+json"]').length;
  const schemaTypes = parseJsonLdTypes($);
  const favicon = $('link[rel="icon"], link[rel="shortcut icon"]').length > 0;
  const hasMain = $('main').length > 0;
  const lazyImages = $('img[loading="lazy"]').length;
  const metaRefresh = $('meta[http-equiv="refresh"]').length > 0;
  const lastModified =
    $('meta[property="article:modified_time"]').attr('content')?.trim() ??
    $('meta[name="last-modified"]').attr('content')?.trim() ??
    '';

  const images = $('img');
  const imageCount = images.length;
  let imagesMissingAlt = 0;
  let httpImageCount = 0;
  images.each((_, el) => {
    const alt = $(el).attr('alt');
    if (alt === undefined || alt.trim() === '') imagesMissingAlt += 1;
    const src = $(el).attr('src') ?? '';
    if (src.startsWith('http://')) httpImageCount += 1;
  });

  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  const wordCount = bodyText ? bodyText.split(/\s+/).length : 0;
  const firstParagraphWords = $('p').first().text().trim().split(/\s+/).filter(Boolean).length;

  let internalLinks = 0;
  let externalLinks = 0;
  let emptyLinkCount = 0;
  let hasAboutLink = false;
  let hasContactLink = false;
  $('a[href]').each((_, el) => {
    const href = ($(el).attr('href') ?? '').toLowerCase();
    const text = $(el).text().trim().toLowerCase();
    if (!text && !$(el).attr('aria-label')) emptyLinkCount += 1;
    if (href.includes('about') || text.includes('about us') || text.includes('about')) hasAboutLink = true;
    if (href.includes('contact') || text.includes('contact')) hasContactLink = true;
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    try {
      const abs = new URL(href, finalUrl);
      if (abs.origin === new URL(finalUrl).origin) internalLinks += 1;
      else externalLinks += 1;
    } catch {
      /* skip */
    }
  });

  const questionPattern = /^(what|why|how|when|where|who|which|can|do|does|is|are)\b/i;
  const questionHeadings = h2Texts.filter((t) => questionPattern.test(t) || t.includes('?')).length;

  const hasFaqSection =
    $('[itemtype*="FAQPage"], .faq, #faq, [class*="faq"], [id*="faq"]').length > 0 ||
    h2Texts.some((t) => /faq|frequently asked/i.test(t));

  const hasAuthorSignal =
    $('[rel="author"], [itemprop="author"], .author, [class*="author"]').length > 0 ||
    $('meta[name="author"]').length > 0;

  const copyrightMatch = bodyText.match(/©\s*(\d{4})|copyright\s*(\d{4})/i);
  const copyrightYear = copyrightMatch ? parseInt(copyrightMatch[1] || copyrightMatch[2], 10) : null;

  const hasHttps = finalUrl.startsWith('https://');
  const [sitemapRes, robotsRes, llmsRes] = await Promise.all([
    fetchResource(`${domain}/sitemap.xml`, USER_AGENT),
    fetchResource(`${domain}/robots.txt`, USER_AGENT),
    fetchResource(`${domain}/llms.txt`, USER_AGENT),
  ]);
  const hasSitemap = sitemapRes.ok && (sitemapRes.text?.includes('<urlset') || sitemapRes.text?.includes('<sitemapindex'));
  const hasRobotsTxt = robotsRes.ok && Boolean(robotsRes.text?.trim());
  const robotsText = robotsRes.text ?? '';
  const robotsHasSitemap = robotsText.toLowerCase().includes('sitemap:');
  const hasLlmsTxt = llmsRes.ok && Boolean(llmsRes.text?.trim());
  const llmsTxtText = llmsRes.text ?? '';

  const brandNameGuess = title.split(/[|\-–—]/)[0].trim() || h1s[0] || new URL(finalUrl).hostname;

  return {
    startUrl,
    finalUrl,
    domain,
    html,
    $,
    responseStatus: response.status,
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
    h2Texts,
    ogTitle,
    ogDesc,
    ogImage,
    ogUrl,
    twitterCard,
    jsonLdCount,
    schemaTypes,
    favicon,
    hasMain,
    lazyImages,
    metaRefresh,
    imageCount,
    imagesMissingAlt,
    httpImageCount,
    bodyText,
    wordCount,
    internalLinks,
    externalLinks,
    emptyLinkCount,
    hasHttps,
    hasSitemap,
    hasRobotsTxt,
    robotsHasSitemap,
    robotsText,
    hasLlmsTxt,
    llmsTxtText,
    hasAboutLink,
    hasContactLink,
    hasAuthorSignal,
    hasFaqSection,
    hasFaqSchema: hasSchemaType(schemaTypes, 'faqpage', 'question'),
    hasHowToSchema: hasSchemaType(schemaTypes, 'howto'),
    hasSpeakableSchema: hasSchemaType(schemaTypes, 'speakable'),
    hasOrganizationSchema: hasSchemaType(schemaTypes, 'organization', 'corporation'),
    hasLocalBusinessSchema: hasSchemaType(schemaTypes, 'localbusiness'),
    hasArticleSchema: hasSchemaType(schemaTypes, 'article', 'blogposting', 'newsarticle'),
    hasProductSchema: hasSchemaType(schemaTypes, 'product'),
    listCount: $('ul, ol').length,
    tableCount: $('table').length,
    questionHeadings,
    firstParagraphWords,
    copyrightYear,
    lastModified,
    brandNameGuess,
  };
}