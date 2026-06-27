import { MAP_COUNTRIES, getIndustry } from './industries.js';
import { ALL_CITIES_VALUE } from './locations.js';
import { geocodeLocation } from './geocode.js';
import { searchGooglePlaces, getGooglePlacesApiKey, getLastGooglePlacesError } from './googlePlacesProvider.js';
import { searchNominatimPois } from './nominatimProvider.js';
import { searchOverpass } from './overpassProvider.js';
import { getDemoMapsLeads } from './demoMapsLeads.js';
import { enrichMapsLeads } from './mapsLeadEnrich.js';
import type { MapsLeadSearchFilters, MapsLeadSearchResponse, MapsLeadResult } from './mapsLeadTypes.js';

function applyFilters(leads: MapsLeadResult[], filters: MapsLeadSearchFilters): MapsLeadResult[] {
  return leads.filter((l) => {
    if (filters.hasPhone && !l.phone) return false;
    if (filters.hasEmail && !l.email) return false;
    if (filters.hasWebsite && !l.website) return false;
    if (filters.needsWebsite && !l.needsWebsite) return false;
    if (filters.needsSocial && !l.needsSocial) return false;
    if (filters.outreachOnly && l.outreachPriority !== 'high' && l.outreachPriority !== 'medium') return false;
    if (filters.query?.trim()) {
      const q = filters.query.toLowerCase();
      if (!l.name.toLowerCase().includes(q) && !l.address.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

function paginate<T>(items: T[], page: number, pageSize: number): { slice: T[]; total: number; totalPages: number } {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  return { slice: items.slice(start, start + pageSize), total, totalPages };
}

function normalizeCity(city?: string): string | undefined {
  const trimmed = city?.trim();
  if (!trimmed || trimmed === ALL_CITIES_VALUE) return undefined;
  return trimmed;
}

function dedupeLeads(leads: MapsLeadResult[]): MapsLeadResult[] {
  const seen = new Set<string>();
  return leads.filter((l) => {
    const key = `${l.name.toLowerCase()}|${l.address.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mergeLeads(...groups: MapsLeadResult[][]): MapsLeadResult[] {
  return dedupeLeads(groups.flat());
}

export async function searchMapsLeads(filters: MapsLeadSearchFilters): Promise<MapsLeadSearchResponse> {
  const state = filters.state?.trim() ?? '';
  const city = normalizeCity(filters.city);

  if (!state && !city) {
    return {
      leads: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 1,
      source: 'demo',
      googleApiConfigured: !!getGooglePlacesApiKey(),
      message: 'Select a state and city (or search all cities in a state).',
    };
  }

  const countryCode = filters.country ?? 'GB';
  const countryLabel = MAP_COUNTRIES.find((c) => c.code === countryCode)?.label ?? countryCode;
  const industry = getIndustry(filters.industry);
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const googleApiConfigured = !!getGooglePlacesApiKey();

  const geocodeCity = city;
  const geocodeState = state || undefined;
  const bounds = await geocodeLocation(geocodeCity, geocodeState, countryLabel);

  let leads: MapsLeadResult[] = [];
  let source: MapsLeadSearchResponse['source'] = 'demo';
  let message: string | undefined;

  const googleLeads: MapsLeadResult[] = [];
  const nominatimLeads: MapsLeadResult[] = [];
  const overpassLeads: MapsLeadResult[] = [];

  if (googleApiConfigured) {
    const fetched = await searchGooglePlaces(
      industry,
      city,
      state || undefined,
      countryCode,
      countryLabel,
      bounds,
      filters.query,
      60
    );
    googleLeads.push(...fetched);
  }

  const nominatimFetched = await searchNominatimPois(
    industry,
    city,
    state,
    countryCode,
    countryLabel,
    bounds,
    filters.query,
    80
  );
  nominatimLeads.push(...nominatimFetched);

  if (bounds) {
    try {
      const fetched = await searchOverpass(
        bounds,
        industry,
        city ?? state,
        state,
        countryCode,
        80
      );
      overpassLeads.push(...fetched);
    } catch {
      // Overpass is best-effort; Nominatim is the reliable OSM source.
    }
  }

  const osmLeads = mergeLeads(nominatimLeads, overpassLeads);
  leads = mergeLeads(googleLeads, osmLeads);

  const googleError = getLastGooglePlacesError();

  if (googleLeads.length && osmLeads.length) {
    source = 'google_places';
    message = `Found ${leads.length} businesses (${googleLeads.length} Google, ${osmLeads.length} OpenStreetMap).`;
  } else if (googleLeads.length) {
    source = 'google_places';
    message = `Found ${leads.length} businesses from Google Places.`;
  } else if (osmLeads.length) {
    source = 'openstreetmap';
    message = `Found ${leads.length} businesses from OpenStreetMap.`;
    if (googleError) {
      message += ` Google API issue: ${googleError}`;
    } else if (googleApiConfigured) {
      message += ' Enable "Places API (New)" in Google Cloud for richer Maps data.';
    }
  }

  if (!leads.length) {
    leads = getDemoMapsLeads({ country: countryCode, state, city, industryId: industry.id });
    if (leads.length) {
      source = 'demo';
      message = 'Showing sample leads for this location. Try a major city for live data.';
    } else {
      source = 'demo';
      message = googleApiConfigured
        ? `No businesses found for ${[city, state, countryLabel].filter(Boolean).join(', ')}. Try a larger city or different industry.`
        : `No results found. Add GOOGLE_PLACES_API_KEY for better coverage, or try a major city like Chennai or London.`;
    }
  }

  if (filters.enrichWebsites) {
    const ids = leads.map((l) => l.id);
    leads = await enrichMapsLeads(ids, leads);
  }

  leads = applyFilters(leads, filters);
  const { slice, total, totalPages } = paginate(leads, page, pageSize);

  return {
    leads: slice,
    total,
    page,
    pageSize,
    totalPages,
    source,
    googleApiConfigured,
    message,
    googleApiError: getLastGooglePlacesError() ?? undefined,
  };
}

export { enrichMapsLeads };