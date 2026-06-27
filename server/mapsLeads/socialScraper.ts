import * as cheerio from 'cheerio';

const SOCIAL_PATTERNS: { field: keyof SocialLinks; re: RegExp }[] = [
  { field: 'facebook', re: /https?:\/\/(?:www\.)?facebook\.com\/[a-zA-Z0-9._-]+/gi },
  { field: 'instagram', re: /https?:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9._-]+/gi },
  { field: 'linkedin', re: /https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/[a-zA-Z0-9._-]+/gi },
  { field: 'twitter', re: /https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/[a-zA-Z0-9._-]+/gi },
  { field: 'tiktok', re: /https?:\/\/(?:www\.)?tiktok\.com\/@?[a-zA-Z0-9._-]+/gi },
];

export interface SocialLinks {
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  twitter?: string;
  tiktok?: string;
}

function pickFirst(match: RegExpMatchArray | null): string | undefined {
  if (!match?.[0]) return undefined;
  return match[0].split('?')[0].replace(/\/$/, '');
}

export function extractSocialFromHtml(html: string): SocialLinks {
  const $ = cheerio.load(html);
  const hrefs = $('a[href]')
    .map((_, el) => $(el).attr('href') ?? '')
    .get()
    .join(' ');
  const blob = `${html} ${hrefs}`;

  const out: SocialLinks = {};
  for (const { field, re } of SOCIAL_PATTERNS) {
    const found = pickFirst(blob.match(re));
    if (found) out[field] = found;
  }
  return out;
}

export async function fetchSocialFromWebsite(website: string): Promise<SocialLinks> {
  try {
    const url = website.startsWith('http') ? website : `https://${website}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Lagnaa-MapsLeadFinder/1.0', Accept: 'text/html' },
      signal: AbortSignal.timeout(10000),
      redirect: 'follow',
    });
    if (!response.ok) return {};
    const html = await response.text();
    return extractSocialFromHtml(html);
  } catch {
    return {};
  }
}