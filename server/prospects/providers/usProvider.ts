import { titleForLevel } from '../prospectFilters.js';
import { scrapeCompanyContacts } from '../websiteContactScraper.js';
import type { ProspectResult, ProspectSearchFilters, TitleLevel } from '../prospectTypes.js';

const SEC_USER_AGENT = 'Lagnaa-ProspectFinder/1.0 (contact@lagnaa.com)';

interface SecHit {
  _source?: {
    ciks?: string[];
    display_names?: string[];
    biz_states?: string[];
    biz_locations?: string[];
    sics?: string[];
  };
}

interface SecSearchResponse {
  hits?: {
    total?: { value?: number };
    hits?: SecHit[];
  };
}

const US_SIC_LABELS: Record<string, string> = {
  '7374': 'Software & IT services',
  '6021': 'Banking',
  '2834': 'Pharmaceuticals',
  '4813': 'Telecommunications',
  '5311': 'Retail',
  '6798': 'Real estate',
  '8742': 'Management consulting',
  '8093': 'Healthcare services',
  '3711': 'Automotive',
};

function parseSecDisplayName(raw: string): { name: string; cik: string } | null {
  const match = raw.match(/^(.+?)\s+\(.*CIK\s+(\d+)\)/i);
  if (!match) return null;
  return { name: match[1].trim(), cik: match[2].replace(/^0+/, '') || match[2] };
}

function sicIndustry(codes?: string[]): string {
  if (!codes?.length) return 'Public company';
  const code = codes[0];
  return US_SIC_LABELS[code] ?? `SIC ${code}`;
}

export async function searchUsProspects(filters: ProspectSearchFilters): Promise<{
  prospects: ProspectResult[];
  total: number;
}> {
  const pageSize = Math.min(filters.pageSize ?? 20, 25);
  const page = filters.page ?? 1;
  const from = (page - 1) * pageSize;
  const q = filters.query?.trim() || 'technology';

  const params = new URLSearchParams({
    q,
    forms: '10-K',
    from: String(from),
    size: String(pageSize),
  });
  if (filters.sicCode?.trim()) params.set('sics', filters.sicCode.trim());
  if (filters.region?.trim()) params.set('biz_states', filters.region.trim());

  const response = await fetch(`https://efts.sec.gov/LATEST/search-index?${params.toString()}`, {
    headers: { 'User-Agent': SEC_USER_AGENT, Accept: 'application/json' },
    signal: AbortSignal.timeout(25000),
  });

  if (!response.ok) {
    throw new Error(`SEC EDGAR search failed (${response.status})`);
  }

  const data = (await response.json()) as SecSearchResponse;
  const hits = data.hits?.hits ?? [];
  const total = data.hits?.total?.value ?? hits.length;
  const seen = new Set<string>();
  const prospects: ProspectResult[] = [];
  const level = (filters.titleLevel ?? 'all') as TitleLevel;
  const targetTitle = titleForLevel(level);

  for (const hit of hits) {
    const source = hit._source;
    if (!source?.display_names?.length || !source.ciks?.length) continue;

    const parsed = parseSecDisplayName(source.display_names[0]);
    if (!parsed || seen.has(parsed.cik)) continue;
    seen.add(parsed.cik);

    const region = source.biz_states?.[0] ?? source.biz_locations?.[0]?.split(',').pop()?.trim() ?? '';
    const address = source.biz_locations?.[0] ?? '';
    const sicCodes = (source.sics ?? []).map(String);

    const prospect: ProspectResult = {
      id: `us-${parsed.cik}-${level}`,
      country: 'US',
      firstName: 'Executive',
      lastName: 'Leadership',
      fullName: 'Executive Leadership',
      title: targetTitle,
      officerRole: 'executive',
      company: parsed.name,
      companyNumber: parsed.cik,
      industry: sicIndustry(sicCodes),
      sicCodes,
      region,
      address,
      postcode: '',
      enriched: false,
    };

    if (filters.enrichWebsites) {
      try {
        const scraped = await scrapeCompanyContacts(parsed.name, undefined, 'US');
        if (scraped.website) prospect.website = scraped.website;
        if (scraped.email) prospect.email = scraped.email;
        if (scraped.phone) prospect.phone = scraped.phone;
        prospect.enriched = Boolean(scraped.email || scraped.phone);
      } catch {
        /* optional */
      }
    }

    if (filters.hasEmail && !prospect.email) continue;
    if (filters.hasPhone && !prospect.phone) continue;

    prospects.push(prospect);
    if (prospects.length >= pageSize) break;
  }

  return { prospects, total };
}