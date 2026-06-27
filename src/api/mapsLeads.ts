import { fetchJson } from './fetchJson';

export type OutreachPriority = 'high' | 'medium' | 'low' | 'none';
export type MapsLeadSource = 'google_places' | 'openstreetmap' | 'demo';

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

export interface LocationState {
  code: string;
  label: string;
  cities: string[];
}

export const ALL_CITIES_VALUE = '__all__';

export interface MapsLeadMeta {
  countries: { code: string; label: string }[];
  locations: Record<string, LocationState[]>;
  industries: { id: string; label: string }[];
  googleApiConfigured: boolean;
  disclaimer: string;
  signupUrl?: string;
  envKey?: string;
  envKeyLabel?: string;
}

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

export async function getMapsLeadMeta(): Promise<MapsLeadMeta> {
  return fetchJson<MapsLeadMeta>('/api/maps-leads/meta');
}

export async function searchMapsLeads(filters: MapsLeadSearchFilters): Promise<MapsLeadSearchResponse> {
  return fetchJson<MapsLeadSearchResponse>('/api/maps-leads/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(filters),
  });
}

export async function enrichMapsLeads(
  ids: string[],
  leads: MapsLeadResult[]
): Promise<{ success: boolean; leads: MapsLeadResult[] }> {
  return fetchJson('/api/maps-leads/enrich', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, leads }),
  });
}

export async function exportMapsLeads(leads: MapsLeadResult[]): Promise<{ csv: string; filename: string }> {
  return fetchJson('/api/maps-leads/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leads }),
  });
}

export async function importMapsLeads(
  leads: MapsLeadResult[],
  tag?: string
): Promise<{ success: boolean; message: string; imported: number; skipped: number }> {
  return fetchJson('/api/maps-leads/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leads, tag }),
  });
}

export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}