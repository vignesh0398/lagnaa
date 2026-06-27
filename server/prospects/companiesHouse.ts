import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'https://api.company-information.service.gov.uk';
const RATE_DELAY_MS = 550;

export function isCompaniesHouseConfigured(): boolean {
  return Boolean(process.env.COMPANIES_HOUSE_API_KEY?.trim());
}

function authHeader(): string {
  const key = process.env.COMPANIES_HOUSE_API_KEY?.trim();
  if (!key) throw new Error('COMPANIES_HOUSE_API_KEY not configured');
  return `Basic ${Buffer.from(`${key}:`).toString('base64')}`;
}

async function chFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Authorization: authHeader(),
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(20000),
  });

  if (response.status === 429) {
    throw new Error('Companies House rate limit reached. Wait a minute and try again.');
  }
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Companies House error (${response.status}): ${text.slice(0, 200)}`);
  }

  return response.json() as Promise<T>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface ChCompanyHit {
  company_name: string;
  company_number: string;
  company_status: string;
  company_type?: string;
  date_of_creation?: string;
  registered_office_address?: {
    address_line_1?: string;
    address_line_2?: string;
    locality?: string;
    region?: string;
    postal_code?: string;
    country?: string;
  };
  sic_codes?: string[];
}

export interface ChAdvancedSearchResult {
  items: ChCompanyHit[];
  hits: number;
  items_per_page: number;
  start_index: number;
}

export interface ChOfficer {
  name: string;
  officer_role: string;
  occupation?: string;
  appointed_on?: string;
  resigned_on?: string;
}

export interface ChOfficersResult {
  items: ChOfficer[];
  total_results: number;
}

export async function searchCompanies(params: {
  query?: string;
  sicCode?: string;
  region?: string;
  startIndex?: number;
  itemsPerPage?: number;
}): Promise<ChAdvancedSearchResult> {
  const qs = new URLSearchParams();
  qs.set('company_status', 'active');
  if (params.query?.trim()) qs.set('company_name_includes', params.query.trim());
  if (params.sicCode?.trim()) qs.set('sic_codes', params.sicCode.trim());
  if (params.region?.trim()) qs.set('location', params.region.trim());
  qs.set('size', String(Math.min(params.itemsPerPage ?? 20, 25)));
  qs.set('start_index', String(params.startIndex ?? 0));

  return chFetch<ChAdvancedSearchResult>(`/advanced-search/companies?${qs.toString()}`);
}

export async function getCompanyOfficers(companyNumber: string): Promise<ChOfficersResult> {
  await sleep(RATE_DELAY_MS);
  return chFetch<ChOfficersResult>(`/company/${companyNumber}/officers?register_view=false`);
}

export function formatRegisteredAddress(company: ChCompanyHit): { line: string; postcode: string; region: string } {
  const addr = company.registered_office_address;
  if (!addr) return { line: '', postcode: '', region: '' };
  const parts = [addr.address_line_1, addr.address_line_2, addr.locality, addr.region, addr.country]
    .map((s) => s?.trim())
    .filter(Boolean) as string[];
  return {
    line: parts.join(', '),
    postcode: addr.postal_code?.trim() ?? '',
    region: addr.region?.trim() ?? '',
  };
}

/** Parse "SURNAME, Forename Middle" into parts. */
export function parseOfficerName(raw: string): { firstName: string; lastName: string; fullName: string } {
  const name = raw.trim();
  if (!name) return { firstName: '', lastName: '', fullName: '' };

  if (name.includes(',')) {
    const [last, rest] = name.split(',').map((s) => s.trim());
    const firstParts = (rest ?? '').split(/\s+/).filter(Boolean);
    const firstName = firstParts[0] ?? '';
    const lastName = last ?? '';
    const fullName = [firstName, ...firstParts.slice(1), lastName].filter(Boolean).join(' ');
    return { firstName, lastName, fullName: fullName || name };
  }

  const bits = name.split(/\s+/).filter(Boolean);
  if (bits.length === 1) return { firstName: bits[0], lastName: '', fullName: name };
  return {
    firstName: bits[0],
    lastName: bits[bits.length - 1],
    fullName: name,
  };
}