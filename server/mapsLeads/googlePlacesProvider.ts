import type { GeoBounds } from './geocode.js';
import type { IndustryOption, MapsLeadResult } from './mapsLeadTypes.js';
import { applyOutreachScores } from './outreachScore.js';

export function getGooglePlacesApiKey(): string | null {
  return (
    process.env.GOOGLE_PLACES_API_KEY?.trim() ||
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    null
  );
}

const STATE_ALIASES: Record<string, string[]> = {
  'tamil nadu': ['tamil nadu', 'tn'],
  'maharashtra': ['maharashtra', 'mh'],
  'karnataka': ['karnataka', 'ka'],
  'kerala': ['kerala', 'kl'],
  'andhra pradesh': ['andhra pradesh', 'ap'],
  'telangana': ['telangana', 'ts', 'tg'],
  'west bengal': ['west bengal', 'wb'],
  'uttar pradesh': ['uttar pradesh', 'up'],
  'gujarat': ['gujarat', 'gj'],
  'rajasthan': ['rajasthan', 'rj'],
  'delhi': ['delhi', 'dl', 'new delhi'],
  'greater london': ['greater london', 'london'],
};

const INDUSTRY_SEARCH_TERMS: Record<string, string[]> = {
  hospital: ['hospital', 'clinic', 'medical centre', 'nursing home', 'super speciality hospital'],
  school: ['school', 'college', 'university'],
  restaurant: ['restaurant', 'cafe', 'food'],
};

function buildTextQuery(
  searchTerm: string,
  city: string | undefined,
  state: string | undefined,
  country: string,
  extra?: string
): string {
  const location = [city, state, country].filter(Boolean).join(', ');
  const base = extra?.trim() || searchTerm;
  return `${base} in ${location}`;
}

interface GooglePlace {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  rating?: number;
  userRatingCount?: number;
  addressComponents?: { longText?: string; shortText?: string; types?: string[] }[];
}

interface GoogleSearchResponse {
  places?: GooglePlace[];
  nextPageToken?: string;
}

function getAddressComponent(
  components: GooglePlace['addressComponents'],
  type: string
): { long?: string; short?: string } | null {
  const hit = components?.find((c) => c.types?.includes(type));
  if (!hit) return null;
  return { long: hit.longText, short: hit.shortText };
}

function placeMatchesCountry(
  place: GooglePlace,
  countryCode: string,
  countryLabel: string
): boolean {
  const countryComp = getAddressComponent(place.addressComponents, 'country');
  if (countryComp?.short?.toUpperCase() === countryCode.toUpperCase()) return true;

  const address = (place.formattedAddress ?? '').toLowerCase();
  const label = countryLabel.toLowerCase();
  if (address.includes(label)) return true;

  const aliases: Record<string, string[]> = {
    IN: ['india'],
    GB: ['united kingdom', 'uk', 'england', 'scotland', 'wales'],
    US: ['united states', 'usa'],
  };
  return (aliases[countryCode] ?? []).some((a) => address.includes(a));
}

function stateTokens(state: string): string[] {
  const lower = state.toLowerCase().trim();
  const aliases = STATE_ALIASES[lower] ?? [lower];
  return [...new Set(aliases)];
}

function placeMatchesState(place: GooglePlace, state: string, city?: string): boolean {
  if (!state.trim()) return true;
  // When a specific city is selected, country match is enough — addresses often omit the state.
  if (city?.trim()) return true;

  const tokens = stateTokens(state);
  const admin1 = getAddressComponent(place.addressComponents, 'administrative_area_level_1');
  const adminLong = admin1?.long?.toLowerCase() ?? '';
  const adminShort = admin1?.short?.toLowerCase() ?? '';
  const address = (place.formattedAddress ?? '').toLowerCase();

  return tokens.some(
    (token) =>
      adminLong.includes(token) ||
      adminShort === token ||
      address.includes(token)
  );
}

function placeToLead(
  place: GooglePlace,
  industry: IndustryOption,
  countryCode: string,
  state: string | undefined,
  city: string | undefined
): MapsLeadResult | null {
  const name = place.displayName?.text;
  if (!name) return null;

  const postcode =
    place.addressComponents?.find((c) => c.types?.includes('postal_code'))?.longText ?? '';

  const resultCity =
    getAddressComponent(place.addressComponents, 'locality')?.long ??
    getAddressComponent(place.addressComponents, 'administrative_area_level_2')?.long ??
    city ??
    '';

  const resultState =
    getAddressComponent(place.addressComponents, 'administrative_area_level_1')?.long ?? state ?? '';

  return {
    id: `gplaces-${place.id ?? name}`,
    name,
    industry: industry.label,
    industryId: industry.id,
    country: countryCode,
    state: resultState,
    city: resultCity,
    address: place.formattedAddress ?? '',
    postcode,
    phone: place.nationalPhoneNumber ?? place.internationalPhoneNumber,
    website: place.websiteUri,
    googleMapsUrl: place.googleMapsUri,
    rating: place.rating,
    reviewCount: place.userRatingCount,
    needsWebsite: false,
    needsSocial: false,
    outreachPriority: 'none',
    outreachReason: '',
    enriched: false,
    source: 'google_places',
  };
}

function buildRequestBody(
  textQuery: string,
  countryCode: string,
  bounds: GeoBounds | null,
  pageToken?: string
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    textQuery,
    regionCode: countryCode,
    pageSize: 20,
  };

  if (pageToken) body.pageToken = pageToken;

  if (bounds) {
    body.locationBias = {
      circle: {
        center: { latitude: bounds.centerLat, longitude: bounds.centerLng },
        radius: Math.max(
          8000,
          Math.min(
            50000,
            Math.max(
              Math.abs(bounds.north - bounds.south) * 111000 * 0.6,
              Math.abs(bounds.east - bounds.west) * 111000 * 0.6
            )
          )
        ),
      },
    };
  }

  return body;
}

let lastGoogleApiError: string | null = null;

export function getLastGooglePlacesError(): string | null {
  return lastGoogleApiError;
}

async function fetchPlacesPage(
  apiKey: string,
  body: Record<string, unknown>
): Promise<GoogleSearchResponse> {
  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask':
        'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.googleMapsUri,places.rating,places.userRatingCount,places.addressComponents,nextPageToken',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(25000),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.warn('[MapsLeads] Google Places error:', errText);
    try {
      const errJson = JSON.parse(errText) as { error?: { message?: string } };
      const msg = errJson.error?.message ?? '';
      if (msg.includes('SERVICE_DISABLED') || msg.includes('has not been used')) {
        lastGoogleApiError =
          'Google Places API (New) is not enabled on your API key. Enable "Places API (New)" in Google Cloud Console.';
      } else {
        lastGoogleApiError = msg || `Google Places error (${response.status})`;
      }
    } catch {
      lastGoogleApiError = `Google Places error (${response.status})`;
    }
    return {};
  }

  lastGoogleApiError = null;
  return (await response.json()) as GoogleSearchResponse;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function searchGooglePlacesQuery(
  apiKey: string,
  textQuery: string,
  industry: IndustryOption,
  city: string | undefined,
  state: string | undefined,
  countryCode: string,
  countryLabel: string,
  bounds: GeoBounds | null,
  maxPages = 3
): Promise<MapsLeadResult[]> {
  const leads: MapsLeadResult[] = [];
  const seenIds = new Set<string>();
  let pageToken: string | undefined;

  for (let page = 0; page < maxPages; page++) {
    const body = buildRequestBody(textQuery, countryCode, bounds, pageToken);
    const data = await fetchPlacesPage(apiKey, body);

    for (const place of data.places ?? []) {
      if (!placeMatchesCountry(place, countryCode, countryLabel)) continue;
      if (!placeMatchesState(place, state ?? '', city)) continue;

      const lead = placeToLead(place, industry, countryCode, state, city);
      if (!lead || seenIds.has(lead.id)) continue;
      seenIds.add(lead.id);
      leads.push(lead);
    }

    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
    await sleep(300);
  }

  return leads;
}

function getSearchTerms(industry: IndustryOption, extraQuery?: string): string[] {
  if (extraQuery?.trim()) return [extraQuery.trim()];
  const terms = INDUSTRY_SEARCH_TERMS[industry.id];
  if (terms) return terms;
  return industry.placesQuery.split(/\s+/).filter(Boolean);
}

export async function searchGooglePlaces(
  industry: IndustryOption,
  city: string | undefined,
  state: string | undefined,
  countryCode: string,
  countryLabel: string,
  bounds: GeoBounds | null,
  query?: string,
  maxResults = 60
): Promise<MapsLeadResult[]> {
  const apiKey = getGooglePlacesApiKey();
  if (!apiKey) return [];
  lastGoogleApiError = null;

  const searchTerms = getSearchTerms(industry, query);
  const allLeads: MapsLeadResult[] = [];
  const seenIds = new Set<string>();

  try {
    for (const term of searchTerms) {
      if (allLeads.length >= maxResults) break;

      const textQuery = buildTextQuery(term, city, state, countryLabel);
      const pagesNeeded = Math.ceil((maxResults - allLeads.length) / 20);
      const batch = await searchGooglePlacesQuery(
        apiKey,
        textQuery,
        industry,
        city,
        state,
        countryCode,
        countryLabel,
        bounds,
        Math.min(3, pagesNeeded)
      );

      for (const lead of batch) {
        if (seenIds.has(lead.id)) continue;
        seenIds.add(lead.id);
        allLeads.push(lead);
        if (allLeads.length >= maxResults) break;
      }
    }

    return applyOutreachScores(allLeads);
  } catch (error) {
    console.warn('[MapsLeads] Google Places fetch failed:', error);
    return [];
  }
}