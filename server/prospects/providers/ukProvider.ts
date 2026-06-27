import {
  formatRegisteredAddress,
  getCompanyOfficers,
  isCompaniesHouseConfigured,
  parseOfficerName,
  searchCompanies,
} from '../companiesHouse.js';
import { sicLabel } from '../sicCodes.js';
import { matchesTitleLevel } from '../prospectFilters.js';
import { scrapeCompanyContacts } from '../websiteContactScraper.js';
import type { ProspectResult, ProspectSearchFilters } from '../prospectTypes.js';

function officerTitle(officer: { officer_role: string; occupation?: string }): string {
  const occ = officer.occupation?.trim();
  if (occ) return occ;
  const role = officer.officer_role?.replace(/-/g, ' ') ?? 'officer';
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function isUkLiveReady(): boolean {
  return isCompaniesHouseConfigured();
}

export async function searchUkProspects(filters: ProspectSearchFilters): Promise<{
  prospects: ProspectResult[];
  total: number;
}> {
  const pageSize = Math.min(filters.pageSize ?? 20, 25);
  const page = filters.page ?? 1;
  const startIndex = (page - 1) * pageSize;

  const companyResult = await searchCompanies({
    query: filters.query,
    sicCode: filters.sicCode,
    region: filters.region,
    startIndex,
    itemsPerPage: pageSize,
  });

  const companies = companyResult.items ?? [];
  const prospects: ProspectResult[] = [];

  for (const company of companies.slice(0, 8)) {
    if (company.company_status !== 'active') continue;

    let officers;
    try {
      officers = await getCompanyOfficers(company.company_number);
    } catch {
      continue;
    }

    const activeOfficers = (officers.items ?? []).filter((o) => !o.resigned_on);
    const addr = formatRegisteredAddress(company);
    const sicCodes = company.sic_codes ?? [];
    const industry = sicCodes[0] ? sicLabel(sicCodes[0]) : 'Unknown';

    for (const officer of activeOfficers) {
      const title = officerTitle(officer);
      const level = filters.titleLevel ?? 'all';
      if (!matchesTitleLevel(level, title, officer.officer_role)) continue;

      const parsed = parseOfficerName(officer.name);
      const prospect: ProspectResult = {
        id: `gb-${company.company_number}-${officer.name.replace(/\s+/g, '-')}`,
        country: 'GB',
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        fullName: parsed.fullName,
        title,
        officerRole: officer.officer_role,
        company: company.company_name,
        companyNumber: company.company_number,
        industry,
        sicCodes,
        region: addr.region || (filters.region ?? ''),
        address: addr.line,
        postcode: addr.postcode,
        enriched: false,
        appointedOn: officer.appointed_on,
      };

      if (filters.enrichWebsites) {
        try {
          const scraped = await scrapeCompanyContacts(company.company_name, undefined, 'GB');
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

    if (prospects.length >= pageSize) break;
  }

  return { prospects, total: companyResult.hits ?? prospects.length };
}