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

export interface SicOption {
  code: string;
  label: string;
}

export interface RegionOption {
  value: string;
  label: string;
}