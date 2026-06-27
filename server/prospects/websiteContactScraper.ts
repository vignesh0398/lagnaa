import * as cheerio from 'cheerio';

const FETCH_TIMEOUT = 12000;
const CONTACT_PATH_HINTS = ['contact', 'about', 'team', 'people', 'leadership', 'management'];

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_PATTERNS: Record<string, RegExp> = {
  GB: /(?:\+44\s?|0)(?:\d[\s-]?){9,12}\d/g,
  US: /(?:\+1\s?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/g,
  CA: /(?:\+1\s?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/g,
  AU: /(?:\+61\s?|0)(?:\d[\s-]?){8,10}\d/g,
  DE: /(?:\+49\s?|0)(?:\d[\s/-]?){8,12}\d/g,
  FR: /(?:\+33\s?|0)(?:\d[\s.-]?){8,10}\d/g,
  IN: /(?:\+91\s?|0)(?:\d[\s-]?){8,10}\d/g,
  AE: /(?:\+971\s?|0)(?:\d[\s-]?){8,9}\d/g,
  SG: /(?:\+65\s?)(?:\d[\s-]?){7,8}\d/g,
  IE: /(?:\+353\s?|0)(?:\d[\s-]?){8,10}\d/g,
  NL: /(?:\+31\s?|0)(?:\d[\s-]?){8,10}\d/g,
  ZA: /(?:\+27\s?|0)(?:\d[\s-]?){8,9}\d/g,
};

const BLOCKED_EMAIL_DOMAINS = new Set([
  'example.com',
  'sentry.io',
  'wixpress.com',
  'schema.org',
  'googleusercontent.com',
]);

function normalizeUrl(url: string): string {
  const parsed = new URL(url);
  return parsed.origin;
}

function slugifyCompany(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(ltd|limited|plc|llp|uk|group|holdings|the)\b/gi, '')
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

const TLD_BY_COUNTRY: Record<string, string[]> = {
  GB: ['.co.uk', '.com', '.uk'],
  US: ['.com', '.io', '.co'],
  AU: ['.com.au', '.com'],
  CA: ['.ca', '.com'],
  DE: ['.de', '.com'],
  FR: ['.fr', '.com'],
  IN: ['.in', '.co.in', '.com'],
  AE: ['.ae', '.com'],
  SG: ['.sg', '.com'],
  IE: ['.ie', '.com'],
  NL: ['.nl', '.com'],
  ZA: ['.co.za', '.com'],
};

export function guessWebsiteUrls(companyName: string, country = 'GB'): string[] {
  const slug = slugifyCompany(companyName);
  if (!slug || slug.length < 3) return [];
  const tlds = TLD_BY_COUNTRY[country] ?? ['.com'];
  return tlds.flatMap((tld) => [`https://www.${slug}${tld}`, `https://${slug}${tld}`]);
}

function phoneRegex(country: string): RegExp {
  return PHONE_PATTERNS[country] ?? /(?:\+\d{1,3}\s?)?(?:\d[\s()-]?){8,14}\d/g;
}

function cleanEmails(raw: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of raw) {
    const email = e.toLowerCase().trim();
    const domain = email.split('@')[1];
    if (!domain || BLOCKED_EMAIL_DOMAINS.has(domain)) continue;
    if (email.includes('noreply') || email.includes('no-reply')) continue;
    if (seen.has(email)) continue;
    seen.add(email);
    out.push(email);
  }
  return out.slice(0, 5);
}

function cleanPhones(raw: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of raw) {
    const digits = p.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 13) continue;
    if (seen.has(digits)) continue;
    seen.add(digits);
    out.push(p.trim());
  }
  return out.slice(0, 3);
}

function extractFromHtml(html: string, country: string): { emails: string[]; phones: string[] } {
  const $ = cheerio.load(html);
  const text = $('body').text();
  const mailto = $('a[href^="mailto:"]')
    .map((_, el) => $(el).attr('href')?.replace(/^mailto:/i, '').split('?')[0] ?? '')
    .get();
  const tel = $('a[href^="tel:"]')
    .map((_, el) => $(el).attr('href')?.replace(/^tel:/i, '') ?? '')
    .get();

  const emails = cleanEmails([...mailto, ...(text.match(EMAIL_RE) ?? [])]);
  const phones = cleanPhones([...tel, ...(text.match(phoneRegex(country)) ?? [])]);
  return { emails, phones };
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Lagnaa-ProspectFinder/1.0',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
      redirect: 'follow',
    });
    if (!response.ok) return null;
    const type = response.headers.get('content-type') ?? '';
    if (!type.includes('text/html') && !type.includes('application/xhtml')) return null;
    return response.text();
  } catch {
    return null;
  }
}

function contactLinksFromHome(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const base = new URL(baseUrl);
  const links = new Set<string>();

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    const label = $(el).text().toLowerCase();
    if (!href) return;
    const combined = `${href} ${label}`;
    if (!CONTACT_PATH_HINTS.some((h) => combined.includes(h))) return;
    try {
      const absolute = new URL(href, baseUrl);
      if (absolute.origin === base.origin) links.add(absolute.href.split('#')[0]);
    } catch {
      /* ignore */
    }
  });

  return [...links].slice(0, 4);
}

export interface ScrapeContactResult {
  website?: string;
  email?: string;
  phone?: string;
  emailsFound: string[];
  phonesFound: string[];
}

export async function scrapeCompanyContacts(
  companyName: string,
  websiteHint?: string,
  country = 'GB'
): Promise<ScrapeContactResult> {
  const candidates = websiteHint?.trim()
    ? [websiteHint.trim().startsWith('http') ? websiteHint.trim() : `https://${websiteHint.trim()}`]
    : guessWebsiteUrls(companyName, country);

  let best: ScrapeContactResult = { emailsFound: [], phonesFound: [] };

  for (const candidate of candidates) {
    let origin: string;
    try {
      origin = normalizeUrl(candidate);
    } catch {
      continue;
    }

    const homeHtml = await fetchHtml(origin);
    if (!homeHtml) continue;

    const collectedEmails: string[] = [];
    const collectedPhones: string[] = [];

    const home = extractFromHtml(homeHtml, country);
    collectedEmails.push(...home.emails);
    collectedPhones.push(...home.phones);

    const extraLinks = contactLinksFromHome(homeHtml, origin);
    for (const link of extraLinks) {
      const html = await fetchHtml(link);
      if (!html) continue;
      const extra = extractFromHtml(html, country);
      collectedEmails.push(...extra.emails);
      collectedPhones.push(...extra.phones);
    }

    const emailsFound = cleanEmails(collectedEmails);
    const phonesFound = cleanPhones(collectedPhones);

    if (emailsFound.length || phonesFound.length) {
      return {
        website: origin,
        email: emailsFound[0],
        phone: phonesFound[0],
        emailsFound,
        phonesFound,
      };
    }

    if (!best.website) {
      best = { website: origin, emailsFound, phonesFound };
    }
  }

  return best;
}