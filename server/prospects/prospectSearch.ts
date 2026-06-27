import { COUNTRY_REGISTRY, getCountry, isCountryEnvConfigured, type CountryCode } from './countries.js';
import { getDemoProspectsForCountry } from './demoProspects.js';
import { filterProspects, paginate } from './prospectFilters.js';
import { isAbrConfigured, searchAuProspects } from './providers/auProvider.js';
import { searchGleifProspects } from './providers/gleifProvider.js';
import { isUkLiveReady, searchUkProspects } from './providers/ukProvider.js';
import { searchUsProspects } from './providers/usProvider.js';
import { scrapeCompanyContacts } from './websiteContactScraper.js';
import type { ProspectResult, ProspectSearchFilters, ProspectSearchResponse } from './prospectTypes.js';

const GLEIF_COUNTRIES = new Set<CountryCode>(['CA', 'DE', 'FR', 'SG', 'IE', 'NL']);

function pageSizeOf(filters: ProspectSearchFilters): number {
  return Math.min(Math.max(filters.pageSize ?? 20, 5), 50);
}

function canUseLive(countryCode: CountryCode): boolean {
  const country = getCountry(countryCode);
  if (country.mode === 'demo') return false;
  if (!isCountryEnvConfigured(country)) return false;
  if (countryCode === 'GB') return isUkLiveReady();
  if (countryCode === 'AU') return isAbrConfigured();
  return true;
}

async function searchLive(countryCode: CountryCode, filters: ProspectSearchFilters) {
  if (countryCode === 'GB') return searchUkProspects(filters);
  if (countryCode === 'US') return searchUsProspects(filters);
  if (countryCode === 'AU') return searchAuProspects(filters);
  if (GLEIF_COUNTRIES.has(countryCode)) return searchGleifProspects(countryCode, filters);
  throw new Error(`No live provider for ${countryCode}`);
}

function demoMessage(countryCode: CountryCode): string {
  const country = getCountry(countryCode);
  if (country.envKey && !isCountryEnvConfigured(country)) {
    return `Showing sample ${country.label} prospects. Add free ${country.envKeyLabel} (${country.envKey} in .env) for live registry data.`;
  }
  if (country.mode === 'demo') {
    return `Showing sample ${country.label} prospects. Free public officer registry API for this country is not yet integrated — website scan still works on import.`;
  }
  return `Showing sample ${country.label} prospects. Live source: ${country.liveSource}.`;
}

function liveMessage(countryCode: CountryCode, enrichWebsites?: boolean): string {
  const country = getCountry(countryCode);
  const base = `Live ${country.label} data from ${country.liveSource}.`;
  if (country.mode === 'live_officers') {
    return enrichWebsites
      ? `${base} Director names from registry; website scan adds emails/phones when public.`
      : base;
  }
  return enrichWebsites
    ? `${base} Company records from free registries — enable website scan to find contact emails & phones. Individual officer names vary by country.`
    : `${base} Company-level leadership targets; scan websites to enrich contact details.`;
}

export async function searchProspects(filters: ProspectSearchFilters): Promise<ProspectSearchResponse> {
  const pageSize = pageSizeOf(filters);
  const page = filters.page ?? 1;
  const countryCode = (filters.country?.toUpperCase() ?? 'GB') as CountryCode;
  const country = getCountry(countryCode);

  if (canUseLive(countryCode)) {
    try {
      const { prospects, total } = await searchLive(countryCode, { ...filters, pageSize });
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      return {
        prospects,
        total,
        page,
        pageSize,
        totalPages,
        country: countryCode,
        source: 'live',
        apiKeyConfigured: true,
        message: liveMessage(countryCode, filters.enrichWebsites),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Search failed';
      return {
        prospects: [],
        total: 0,
        page: 1,
        pageSize,
        totalPages: 1,
        country: countryCode,
        source: 'live',
        apiKeyConfigured: isCountryEnvConfigured(country),
        message,
      };
    }
  }

  const filtered = filterProspects(getDemoProspectsForCountry(countryCode), filters);
  const paged = paginate(filtered, page, pageSize);
  return {
    prospects: paged.items,
    total: paged.total,
    page: paged.page,
    pageSize: paged.pageSize,
    totalPages: paged.totalPages,
    country: countryCode,
    source: 'demo',
    apiKeyConfigured: isCountryEnvConfigured(country),
    message: demoMessage(countryCode),
  };
}

export async function enrichProspects(ids: string[], prospects: ProspectResult[]): Promise<ProspectResult[]> {
  const map = new Map(prospects.map((p) => [p.id, { ...p }]));
  const targets = ids.map((id) => map.get(id)).filter((p): p is ProspectResult => Boolean(p));

  for (const prospect of targets) {
    if (prospect.enriched && prospect.email && prospect.phone) continue;
    try {
      const scraped = await scrapeCompanyContacts(
        prospect.company,
        prospect.website,
        prospect.country ?? 'GB'
      );
      if (scraped.website) prospect.website = scraped.website;
      if (scraped.email) prospect.email = scraped.email;
      if (scraped.phone) prospect.phone = scraped.phone;
      prospect.enriched = Boolean(scraped.email || scraped.phone || scraped.website);
    } catch {
      prospect.enriched = prospect.enriched || Boolean(prospect.website);
    }
  }

  return [...map.values()];
}

export function getProspectCountriesMeta() {
  return COUNTRY_REGISTRY.map((c) => ({
    code: c.code,
    label: c.label,
    flag: c.flag,
    mode: c.mode,
    liveSource: c.liveSource,
    signupUrl: c.signupUrl,
    envKey: c.envKey,
    envKeyLabel: c.envKeyLabel,
    configured: isCountryEnvConfigured(c),
    liveReady: c.mode === 'demo' ? false : c.code === 'GB' ? isUkLiveReady() : c.code === 'AU' ? isAbrConfigured() : c.code === 'US' || GLEIF_COUNTRIES.has(c.code),
  }));
}