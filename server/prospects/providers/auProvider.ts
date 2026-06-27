import dotenv from 'dotenv';
import { titleForLevel } from '../prospectFilters.js';
import { scrapeCompanyContacts } from '../websiteContactScraper.js';
import type { ProspectResult, ProspectSearchFilters } from '../prospectTypes.js';

dotenv.config();

export function isAbrConfigured(): boolean {
  return Boolean(process.env.ABR_GUID?.trim());
}

interface AbrNameRecord {
  Abn?: string;
  Name?: string;
  State?: string;
  Postcode?: string;
  Score?: number;
}

async function abrMatchingNames(name: string): Promise<AbrNameRecord[]> {
  const guid = process.env.ABR_GUID?.trim();
  if (!guid) throw new Error('ABR_GUID not configured');

  const url = `https://abr.business.gov.au/json/MatchingNames.aspx?name=${encodeURIComponent(name)}&maxResults=20&guid=${guid}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`ABR lookup failed (${response.status})`);

  const text = await response.text();
  const jsonText = text.replace(/^[^(]*\(/, '').replace(/\)\s*;?\s*$/, '');
  const data = JSON.parse(jsonText) as { Names?: AbrNameRecord[] };
  return data.Names ?? [];
}

export async function searchAuProspects(filters: ProspectSearchFilters): Promise<{
  prospects: ProspectResult[];
  total: number;
}> {
  const pageSize = Math.min(filters.pageSize ?? 20, 25);
  const page = filters.page ?? 1;
  const query = filters.query?.trim() || 'digital';

  const names = await abrMatchingNames(query);
  let filtered = names;

  if (filters.region?.trim()) {
    const region = filters.region.trim().toUpperCase();
    filtered = filtered.filter((n) => (n.State ?? '').toUpperCase() === region);
  }

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const slice = filtered.slice(start, start + pageSize);
  const level = filters.titleLevel ?? 'all';
  const targetTitle = titleForLevel(level);
  const prospects: ProspectResult[] = [];

  for (const row of slice) {
    if (!row.Name || !row.Abn) continue;

    const prospect: ProspectResult = {
      id: `au-${row.Abn}-${level}`,
      country: 'AU',
      firstName: 'Business',
      lastName: 'Owner',
      fullName: 'Business Owner / Director',
      title: targetTitle,
      officerRole: 'director',
      company: row.Name,
      companyNumber: row.Abn,
      industry: 'Registered Australian business',
      sicCodes: [],
      region: row.State ?? '',
      address: '',
      postcode: row.Postcode ?? '',
      enriched: false,
    };

    if (filters.enrichWebsites) {
      try {
        const scraped = await scrapeCompanyContacts(row.Name, undefined, 'AU');
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
  }

  return { prospects, total };
}