import * as cheerio from 'cheerio';

const MAX_PAGES = 6;
const MAX_CHARS = 45000;
const FETCH_TIMEOUT = 15000;

function normalizeUrl(url: string): string {
  const parsed = new URL(url);
  return parsed.origin + parsed.pathname.replace(/\/$/, '') || parsed.origin;
}

function isSameOrigin(base: string, link: string): boolean {
  try {
    return new URL(link).origin === new URL(base).origin;
  } catch {
    return false;
  }
}

function extractText(html: string): string {
  const $ = cheerio.load(html);
  $('script, style, noscript, nav, footer, header, iframe, svg').remove();
  const text = $('body').text() || $.root().text();
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractLinks(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const base = new URL(baseUrl);
  const links = new Set<string>();

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    try {
      const absolute = new URL(href, baseUrl).href.split('#')[0];
      if (isSameOrigin(baseUrl, absolute) && absolute !== baseUrl) {
        links.add(absolute);
      }
    } catch {
      /* ignore bad URLs */
    }
  });

  return [...links].slice(0, MAX_PAGES - 1);
}

export async function crawlWebsite(startUrl: string): Promise<{ content: string; pagesCrawled: number }> {
  let parsed: URL;
  try {
    parsed = new URL(startUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('URL must start with http:// or https://');
    }
  } catch {
    throw new Error('Invalid URL format');
  }

  const visited = new Set<string>();
  const queue = [parsed.href];
  const chunks: string[] = [];

  while (queue.length > 0 && visited.size < MAX_PAGES) {
    const url = queue.shift()!;
    const norm = normalizeUrl(url);
    if (visited.has(norm)) continue;
    visited.add(norm);

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Lagnaa-KnowledgeBot/1.0',
          Accept: 'text/html,application/xhtml+xml',
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT),
      });

      if (!response.ok) continue;

      const html = await response.text();
      const text = extractText(html);
      if (text.length > 100) {
        chunks.push(`--- Page: ${url} ---\n${text}`);
      }

      if (visited.size === 1) {
        for (const link of extractLinks(html, url)) {
          if (!visited.has(normalizeUrl(link))) queue.push(link);
        }
      }
    } catch (err) {
      if (visited.size === 1) {
        throw new Error(err instanceof Error ? err.message : 'Failed to fetch URL');
      }
    }
  }

  if (chunks.length === 0) {
    throw new Error('No readable content found on this website.');
  }

  let content = chunks.join('\n\n');
  if (content.length > MAX_CHARS) {
    content = content.slice(0, MAX_CHARS) + '\n\n[Content truncated for AI context limit]';
  }

  return { content, pagesCrawled: visited.size };
}