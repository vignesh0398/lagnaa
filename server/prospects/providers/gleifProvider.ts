import { titleForLevel } from '../prospectFilters.js';
import { scrapeCompanyContacts } from '../websiteContactScraper.js';
import type { CountryCode } from '../countries.js';
import type { ProspectResult, ProspectSearchFilters } from '../prospectTypes.js';

interface GleifRecord {
  id: string;
  attributes: {
    entity: {
      legalName: { name: string };
      legalAddress: {
        country: string;
        region?: string;
        city?: string;
        postalCode?: string;
        addressLines?: string[];
      };
      category?: string;
    };
  };
}

interface GleifResponse {
  meta?: { pagination?: { total?: number } };
  data?: GleifRecord[];
}

export async function searchGleifProspects(
  country: CountryCode,
  filters: ProspectSearchFilters
): Promise<{ prospects: ProspectResult[]; total: number }> {
  const pageSize = Math.min(filters.pageSize ?? 20, 25);
  const page = filters.page ?? 1;
  const query = filters.query?.trim() || 'digital';

  const params = new URLSearchParams();
  params.set('filter[entity.legalAddress.country]', country);
  params.set('page[size]', String(pageSize));
  params.set('page[number]', String(page));
  if (query) params.set('filter[entity.legalName]', query);

  const response = await fetch(`https://api.gleif.org/api/v1/lei-records?${params.toString()}`, {
    headers: { Accept: 'application/vnd.api+json' },
    signal: AbortSignal.timeout(25000),
  });

  if (!response.ok) {
    throw new Error(`GLEIF search failed (${response.status})`);
  }

  const data = (await response.json()) as GleifResponse;
  const records = data.data ?? [];
  const total = data.meta?.pagination?.total ?? records.length;
  const level = filters.titleLevel ?? 'all';
  const targetTitle = titleForLevel(level);
  const prospects: ProspectResult[] = [];

  for (const record of records) {
    const entity = record.attributes.entity;
    const name = entity.legalName?.name?.trim();
    if (!name) continue;

    const addr = entity.legalAddress;
    const address = addr.addressLines?.join(', ') ?? '';
    const region = addr.region ?? addr.city ?? '';

    if (filters.region?.trim()) {
      const want = filters.region.trim().toLowerCase();
      if (!region.toLowerCase().includes(want) && !address.toLowerCase().includes(want)) continue;
    }

    const prospect: ProspectResult = {
      id: `${country.toLowerCase()}-${record.id}-${level}`,
      country,
      firstName: 'Corporate',
      lastName: 'Leadership',
      fullName: 'Corporate Leadership',
      title: targetTitle,
      officerRole: 'executive',
      company: name,
      companyNumber: record.id,
      industry: entity.category?.replace(/_/g, ' ') ?? 'Legal entity',
      sicCodes: [],
      region,
      address,
      postcode: addr.postalCode ?? '',
      enriched: false,
    };

    if (filters.enrichWebsites) {
      try {
        const scraped = await scrapeCompanyContacts(name, undefined, country);
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