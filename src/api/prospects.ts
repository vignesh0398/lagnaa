export type CountryCode =
  | 'GB'
  | 'US'
  | 'AU'
  | 'CA'
  | 'DE'
  | 'FR'
  | 'IN'
  | 'AE'
  | 'SG'
  | 'IE'
  | 'NL'
  | 'ZA';

export type TitleLevel = 'ceo' | 'cfo' | 'director' | 'all';

export interface ProspectResult {
  id: string;
  country: CountryCode | string;
  firstName: string;
  lastName: string;
  fullName: string;
  title: string;
  officerRole: string;
  company: string;
  companyNumber: string;
  industry: string;
  sicCodes: string[];
  region: string;
  address: string;
  postcode: string;
  email?: string;
  phone?: string;
  website?: string;
  enriched: boolean;
  appointedOn?: string;
}

export interface ProspectSearchFilters {
  country?: CountryCode | string;
  query?: string;
  sicCode?: string;
  region?: string;
  titleLevel?: TitleLevel;
  hasEmail?: boolean;
  hasPhone?: boolean;
  enrichWebsites?: boolean;
  page?: number;
  pageSize?: number;
}

export interface ProspectSearchResponse {
  prospects: ProspectResult[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  country: CountryCode | string;
  source: 'live' | 'demo';
  apiKeyConfigured: boolean;
  message?: string;
}

export interface CountryMeta {
  code: CountryCode;
  label: string;
  flag: string;
  mode: 'live_officers' | 'live_companies' | 'demo';
  liveSource: string;
  signupUrl?: string;
  envKey?: string;
  envKeyLabel?: string;
  configured: boolean;
  liveReady: boolean;
}

export interface ProspectMeta {
  countries: CountryMeta[];
  country: CountryCode;
  industries: { code: string; label: string }[];
  regions: { value: string; label: string }[];
  titleLevels: { value: TitleLevel; label: string }[];
  apiKeyConfigured: boolean;
  dataSource: string;
  dataMode: string;
  disclaimer: string;
  signupUrl?: string;
  envKey?: string;
  envKeyLabel?: string;
}

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data;
}

export async function getProspectMeta(country?: CountryCode | string): Promise<ProspectMeta> {
  const qs = country ? `?country=${encodeURIComponent(country)}` : '';
  const res = await fetch(`/api/prospects/meta${qs}`);
  return parseJson(res);
}

export async function searchProspects(filters: ProspectSearchFilters): Promise<ProspectSearchResponse> {
  const res = await fetch('/api/prospects/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(filters),
  });
  return parseJson(res);
}

export async function enrichProspects(
  ids: string[],
  prospects: ProspectResult[]
): Promise<{ success: boolean; prospects: ProspectResult[] }> {
  const res = await fetch('/api/prospects/enrich', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, prospects }),
  });
  return parseJson(res);
}

export async function importProspects(
  prospects: ProspectResult[],
  tag?: string
): Promise<{ success: boolean; imported: number; skipped: number; emailOnly: number; message: string }> {
  const res = await fetch('/api/prospects/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prospects, tag }),
  });
  return parseJson(res);
}