import * as cheerio from 'cheerio';
import type { Cheerio, CheerioAPI } from 'cheerio';
import type { Element } from 'domhandler';

export interface TechNewsArticle {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string;
  imageUrl: string;
}

const AI_RSS_FEEDS: { source: string; url: string }[] = [
  { source: 'VentureBeat AI', url: 'https://venturebeat.com/category/ai/feed/' },
  { source: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
  { source: 'AI News', url: 'https://www.artificialintelligence-news.com/feed/' },
  { source: 'MIT Tech Review', url: 'https://www.technologyreview.com/feed/' },
];

const AI_KEYWORDS =
  /\b(ai|artificial intelligence|machine learning|llm|gpt|openai|anthropic|gemini|nvidia|chip|robot|automation|neural|deep learning|generative|chatbot|model|copilot|claude|tech|software|cloud|startup|semiconductor|data center|agentic|inference)\b/i;

const EXCLUDE_KEYWORDS = /\b(sports?|tennis|djokovic|recipe|fashion|celebrity|horoscope)\b/i;

const CACHE_TTL_MS = 20 * 60 * 1000;
const FETCH_TIMEOUT_MS = 12_000;
const OG_TIMEOUT_MS = 6_000;
const MAX_OG_LOOKUPS = 8;

let cache: { articles: TechNewsArticle[]; fetchedAt: number } | null = null;

function stripHtml(html: string): string {
  return html
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function upgradeImageUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('ctfassets.net') || parsed.searchParams.has('w')) {
      parsed.searchParams.set('w', '900');
      parsed.searchParams.set('q', '80');
      return parsed.toString();
    }
    return url;
  } catch {
    return url;
  }
}

function firstImageFromHtml(html: string): string | null {
  if (!html?.trim()) return null;
  const $ = cheerio.load(html);
  const src =
    $('img').first().attr('src') ||
    $('img').first().attr('data-src') ||
    $('source').first().attr('srcset')?.split(/\s+/)[0];
  return src?.trim() || null;
}

function extractImage($: CheerioAPI, el: Cheerio<Element>): string | null {
  const media =
    el.find('media\\:content').attr('url') ||
    el.find('media\\:thumbnail').attr('url') ||
    el.find('thumbnail').attr('url');
  if (media?.startsWith('http')) return upgradeImageUrl(media);

  const enclosure = el.find('enclosure');
  const encUrl = enclosure.attr('url');
  const encType = enclosure.attr('type') ?? '';
  if (encUrl?.startsWith('http') && (!encType || encType.startsWith('image'))) {
    return upgradeImageUrl(encUrl);
  }

  const rawDesc = el.find('description').html() ?? '';
  const rawContent = el.find('content\\:encoded').html() ?? el.find('content').html() ?? '';
  return (
    firstImageFromHtml(rawContent) ||
    firstImageFromHtml(rawDesc) ||
    null
  );
}

function parseRssItems(xml: string, source: string): TechNewsArticle[] {
  const $ = cheerio.load(xml, { xml: true });
  const articles: TechNewsArticle[] = [];

  $('item').each((_, node) => {
    const el = $(node);
    const title = stripHtml(el.find('title').first().text());
    const link =
      el.find('link').first().text().trim() ||
      el.find('link').attr('href')?.trim() ||
      '';
    const pubDate =
      el.find('pubDate').first().text().trim() ||
      el.find('dc\\:date').first().text().trim() ||
      new Date().toISOString();
    const rawDesc =
      el.find('description').first().text() ||
      el.find('content\\:encoded').first().text() ||
      el.find('summary').first().text() ||
      '';
    const summary = stripHtml(rawDesc).slice(0, 180);
    const imageUrl = extractImage($, el);

    if (!title || !link) return;
    if (!isAiTechArticle(title, summary)) return;

    articles.push({
      id: `${source}-${link}`.replace(/[^a-zA-Z0-9-]/g, '-').slice(0, 120),
      title,
      summary: summary || title,
      url: link,
      source,
      publishedAt: new Date(pubDate).toISOString(),
      imageUrl: imageUrl ? upgradeImageUrl(imageUrl) : buildPlaceholderUrl(title, source),
    });
  });

  return articles;
}

function parseAtomEntries(xml: string, source: string): TechNewsArticle[] {
  const $ = cheerio.load(xml, { xml: true });
  const articles: TechNewsArticle[] = [];

  $('entry').each((_, node) => {
    const el = $(node);
    const title = stripHtml(el.find('title').first().text());
    const link =
      el.find('link[rel="alternate"]').attr('href') ||
      el.find('link').attr('href') ||
      el.find('link').first().text().trim() ||
      '';
    const pubDate =
      el.find('published').first().text().trim() ||
      el.find('updated').first().text().trim() ||
      new Date().toISOString();
    const rawContent = el.find('content').html() ?? el.find('summary').html() ?? '';
    const summary = stripHtml(rawContent).slice(0, 180);
    const imageUrl = extractImage($, el) || firstImageFromHtml(rawContent);

    if (!title || !link) return;
    if (!isAiTechArticle(title, summary)) return;

    articles.push({
      id: `${source}-${link}`.replace(/[^a-zA-Z0-9-]/g, '-').slice(0, 120),
      title,
      summary: summary || title,
      url: link,
      source,
      publishedAt: new Date(pubDate).toISOString(),
      imageUrl: imageUrl ? upgradeImageUrl(imageUrl) : buildPlaceholderUrl(title, source),
    });
  });

  return articles;
}

function isAiTechArticle(title: string, summary: string): boolean {
  const text = `${title} ${summary}`;
  if (EXCLUDE_KEYWORDS.test(text)) return false;
  return AI_KEYWORDS.test(text);
}

export function buildPlaceholderUrl(title: string, source: string): string {
  const params = new URLSearchParams({
    title: title.slice(0, 72),
    source: source.slice(0, 32),
  });
  return `/api/news/placeholder?${params.toString()}`;
}

export function buildPlaceholderSvg(title: string, source: string): string {
  const hash = [...title].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const hue1 = hash % 360;
  const hue2 = (hue1 + 48) % 360;
  const safeTitle = title.replace(/[<>&"']/g, '').slice(0, 80);
  const safeSource = source.replace(/[<>&"']/g, '').slice(0, 40);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:hsl(${hue1},70%,42%)"/>
      <stop offset="100%" style="stop-color:hsl(${hue2},65%,28%)"/>
    </linearGradient>
  </defs>
  <rect width="800" height="500" fill="url(#bg)"/>
  <circle cx="680" cy="90" r="120" fill="rgba(255,255,255,0.08)"/>
  <circle cx="120" cy="420" r="90" fill="rgba(255,255,255,0.06)"/>
  <text x="40" y="56" fill="rgba(255,255,255,0.85)" font-family="system-ui,sans-serif" font-size="18" font-weight="700">${safeSource}</text>
  <text x="40" y="400" fill="#ffffff" font-family="system-ui,sans-serif" font-size="28" font-weight="700">${safeTitle}</text>
  <text x="40" y="440" fill="rgba(255,255,255,0.75)" font-family="system-ui,sans-serif" font-size="16">AI · Tech</text>
</svg>`;
}

async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Lagnaa-NewsBot/1.0', Accept: 'text/html' },
      signal: AbortSignal.timeout(OG_TIMEOUT_MS),
      redirect: 'follow',
    });
    if (!response.ok) return null;
    const html = await response.text();
    const match =
      html.match(/property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/content=["']([^"']+)["'][^>]*property=["']og:image["']/i) ||
      html.match(/name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);
    const image = match?.[1]?.trim();
    return image?.startsWith('http') ? upgradeImageUrl(image) : null;
  } catch {
    return null;
  }
}

async function enrichMissingImages(articles: TechNewsArticle[]): Promise<TechNewsArticle[]> {
  let lookups = 0;
  const enriched = await Promise.all(
    articles.map(async (article) => {
      if (!article.imageUrl.includes('/api/news/placeholder')) return article;
      if (lookups >= MAX_OG_LOOKUPS) return article;
      lookups += 1;
      const og = await fetchOgImage(article.url);
      if (!og) return article;
      return { ...article, imageUrl: og };
    })
  );
  return enriched;
}

async function fetchFeed(feed: { source: string; url: string }): Promise<TechNewsArticle[]> {
  const response = await fetch(feed.url, {
    headers: {
      'User-Agent': 'Lagnaa-NewsBot/1.0',
      Accept: 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*',
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`${feed.source} returned ${response.status}`);
  }

  const xml = await response.text();
  const isAtom = xml.includes('<feed') && xml.includes('<entry');
  const articles = isAtom ? parseAtomEntries(xml, feed.source) : parseRssItems(xml, feed.source);
  return articles.slice(0, 10);
}

function sortByDate(articles: TechNewsArticle[]): TechNewsArticle[] {
  return [...articles].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

function dedupe(articles: TechNewsArticle[]): TechNewsArticle[] {
  const seen = new Set<string>();
  return articles.filter((a) => {
    const key = a.title.toLowerCase().slice(0, 80);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function preferRealImages(articles: TechNewsArticle[]): TechNewsArticle[] {
  return [...articles].sort((a, b) => {
    const aReal = a.imageUrl.includes('/api/news/placeholder') ? 0 : 1;
    const bReal = b.imageUrl.includes('/api/news/placeholder') ? 0 : 1;
    if (bReal !== aReal) return bReal - aReal;
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });
}

export async function getTechNews(limit = 12): Promise<{
  articles: TechNewsArticle[];
  fetchedAt: string;
  cached: boolean;
}> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return {
      articles: cache.articles.slice(0, limit),
      fetchedAt: new Date(cache.fetchedAt).toISOString(),
      cached: true,
    };
  }

  const results = await Promise.allSettled(AI_RSS_FEEDS.map((feed) => fetchFeed(feed)));
  const merged: TechNewsArticle[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      merged.push(...result.value);
    } else {
      console.warn('[TechNews] Feed failed:', result.reason);
    }
  }

  if (!merged.length) {
    if (cache) {
      return {
        articles: cache.articles.slice(0, limit),
        fetchedAt: new Date(cache.fetchedAt).toISOString(),
        cached: true,
      };
    }
    throw new Error('Could not load AI tech news right now.');
  }

  let articles = dedupe(sortByDate(merged));
  articles = await enrichMissingImages(articles.slice(0, 18));
  articles = preferRealImages(articles).slice(0, 24);
  cache = { articles, fetchedAt: now };

  return {
    articles: articles.slice(0, limit),
    fetchedAt: new Date(now).toISOString(),
    cached: false,
  };
}