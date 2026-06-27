export type MapsLeadSource = 'google_places' | 'openstreetmap' | 'demo';

export type OutreachPriority = 'high' | 'medium' | 'low' | 'none';

export interface MapsLeadSearchFilters {
  country?: string;
  state?: string;
  city?: string;
  industry?: string;
  query?: string;
  hasPhone?: boolean;
  hasEmail?: boolean;
  hasWebsite?: boolean;
  needsWebsite?: boolean;
  needsSocial?: boolean;
  outreachOnly?: boolean;
  enrichWebsites?: boolean;
  page?: number;
  pageSize?: number;
}

export interface MapsLeadResult {
  id: string;
  name: string;
  industry: string;
  industryId: string;
  country: string;
  state: string;
  city: string;
  address: string;
  postcode: string;
  phone?: string;
  email?: string;
  website?: string;
  googleMapsUrl?: string;
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  twitter?: string;
  tiktok?: string;
  rating?: number;
  reviewCount?: number;
  needsWebsite: boolean;
  needsSocial: boolean;
  outreachPriority: OutreachPriority;
  outreachReason: string;
  enriched: boolean;
  source: MapsLeadSource;
}

export interface MapsLeadSearchResponse {
  leads: MapsLeadResult[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  source: MapsLeadSource;
  googleApiConfigured: boolean;
  message?: string;
  googleApiError?: string;
}

export interface IndustryOption {
  id: string;
  label: string;
  placesQuery: string;
  osmTags: { key: string; value: string }[];
}

export interface CountryOption {
  code: string;
  label: string;
}