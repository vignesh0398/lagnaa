import type { GeoBounds } from './geocode.js';
import type { IndustryOption, MapsLeadResult } from './mapsLeadTypes.js';
import { applyOutreachScores } from './outreachScore.js';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

const INDUSTRY_SEARCH_TERMS: Record<string, string[]> = {
  hospital: ['hospital', 'clinic', 'medical centre', 'nursing home'],
  school: ['school', 'college', 'university'],
  restaurant: ['restaurant', 'cafe', 'fast food'],
  retail: ['shop', 'supermarket', 'store'],
  hotel: ['hotel', 'guest house'],
  fitness: ['gym', 'fitness centre'],
  automotive: ['car repair', 'garage'],
  professional: ['salon', 'plumber', 'lawyer'],
  all: ['business'],
};

interface NominatimHit {
  place_id?: number;
  osm_type?: string;
  osm_id?: number;
  lat?: string;
  lon?: string;
  display_name?: string;
  type?: string;
  class?: string;
  address?: Record<string, string>;
  extratags?: Record<string, string>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildLocationLabel(city: string | undefined, state: string, countryLabel: string): string {
  return [city, state, countryLabel].filter(Boolean).join(', ');
}

function hitToLead(
  hit: NominatimHit,
  industry: IndustryOption,
  countryCode: string,
  state: string,
  city: string | undefined
): MapsLeadResult | null {
  const name = hit.display_name?.split(',')[0]?.trim();
  if (!name) return null;

  const addr = hit.address ?? {};
  const resultCity = addr.city ?? addr.town ?? addr.village ?? addr.suburb ?? city ?? '';
  const resultState = addr.state ?? state;
  const lat = hit.lat ? Number(hit.lat) : undefined;
  const lon = hit.lon ? Number(hit.lon) : undefined;
  const tags = hit.extratags ?? {};

  return {
    id: `nominatim-${hit.osm_type ?? 'node'}-${hit.osm_id ?? hit.place_id ?? name}`,
    name,
    industry: industry.label,
    industryId: industry.id,
    country: countryCode,
    state: resultState,
    city: resultCity,
    address: hit.display_name ?? '',
    postcode: addr.postcode ?? '',
    phone: tags.phone ?? tags['contact:phone'],
    email: tags.email ?? tags['contact:email'],
    website: tags.website ?? tags['contact:website'],
    googleMapsUrl:
      lat != null && lon != null
        ? `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`
        : undefined,
    needsWebsite: false,
    needsSocial: false,
    outreachPriority: 'none',
    outreachReason: '',
    enriched: false,
    source: 'openstreetmap',
  };
}

function isRelevantHit(hit: NominatimHit, industry: IndustryOption): boolean {
  if (industry.id === 'all') return true;
  const osmTypes = new Set(industry.osmTags.map((t) => `${t.key}:${t.value}`));
  const cls = hit.class ?? '';
  const typ = hit.type ?? '';
  if (osmTypes.has(`${cls}:${typ}`)) return true;

  const typeMatches: Record<string, string[]> = {
    hospital: ['hospital', 'clinic', 'doctors', 'dentist'],
    school: ['school', 'college', 'university', 'kindergarten'],
    restaurant: ['restaurant', 'cafe', 'fast_food', 'bar', 'food_court'],
    retail: ['supermarket', 'convenience', 'mall', 'department_store', 'clothes'],
    hotel: ['hotel', 'guest_house', 'hostel', 'motel'],
    fitness: ['fitness_centre', 'sports_centre', 'gym'],
    automotive: ['car_repair', 'car_wash', 'fuel'],
  };

  const allowed = typeMatches[industry.id];
  if (allowed) return allowed.includes(typ);
  return cls === 'amenity' || cls === 'shop' || cls === 'office';
}

async function fetchNominatimPage(
  searchTerm: string,
  location: string,
  bounds: GeoBounds | null,
  limit: number
): Promise<NominatimHit[]> {
  const params = new URLSearchParams({
    q: `${searchTerm} ${location}`,
    format: 'json',
    limit: String(Math.min(limit, 50)),
    addressdetails: '1',
    extratags: '1',
    'accept-language': 'en',
  });

  if (bounds) {
    params.set('viewbox', `${bounds.west},${bounds.north},${bounds.east},${bounds.south}`);
    params.set('bounded', '1');
  }

  const response = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: {
      'User-Agent': 'Lagnaa-MapsLeadFinder/1.0 (contact@datacrew.ai)',
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) return [];
  return (await response.json()) as NominatimHit[];
}

export async function searchNominatimPois(
  industry: IndustryOption,
  city: string | undefined,
  state: string,
  countryCode: string,
  countryLabel: string,
  bounds: GeoBounds | null,
  extraQuery?: string,
  maxResults = 80
): Promise<MapsLeadResult[]> {
  const location = buildLocationLabel(city, state, countryLabel);
  const terms = extraQuery?.trim()
    ? [extraQuery.trim()]
    : (INDUSTRY_SEARCH_TERMS[industry.id] ?? [industry.placesQuery.split(' ')[0]]);

  const leads: MapsLeadResult[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < terms.length; i++) {
    if (leads.length >= maxResults) break;
    if (i > 0) await sleep(1100);

    const hits = await fetchNominatimPage(terms[i], location, bounds, 50);
    for (const hit of hits) {
      if (!isRelevantHit(hit, industry)) continue;
      const lead = hitToLead(hit, industry, countryCode, state, city);
      if (!lead) continue;
      const key = `${lead.name.toLowerCase()}|${lead.address.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      leads.push(lead);
      if (leads.length >= maxResults) break;
    }
  }

  return applyOutreachScores(leads);
}