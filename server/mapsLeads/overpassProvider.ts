import type { GeoBounds } from './geocode.js';
import type { IndustryOption } from './mapsLeadTypes.js';
import type { MapsLeadResult } from './mapsLeadTypes.js';
import { applyOutreachScores } from './outreachScore.js';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

interface OsmElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function buildQuery(bounds: GeoBounds, industry: IndustryOption, limit: number): string {
  const { south, west, north, east } = bounds;
  const box = `${south},${west},${north},${east}`;
  const selectors = industry.osmTags
    .map(
      (t) => `
    node["${t.key}"="${t.value}"](${box});
    way["${t.key}"="${t.value}"](${box});
  `
    )
    .join('');

  return `[out:json][timeout:45];(${selectors});out center ${limit};`;
}

function parseElement(
  el: OsmElement,
  ctx: { city: string; state: string; country: string; industry: IndustryOption }
): MapsLeadResult | null {
  const tags = el.tags ?? {};
  const name = tags.name ?? tags['name:en'] ?? tags.brand;
  if (!name) return null;

  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  const mapsUrl =
    lat != null && lon != null
      ? `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`
      : undefined;

  const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
  const address = street || tags['addr:full'] || '';

  const lead: MapsLeadResult = {
    id: `osm-${el.type}-${el.id}`,
    name,
    industry: ctx.industry.label,
    industryId: ctx.industry.id,
    country: ctx.country,
    state: ctx.state,
    city: ctx.city,
    address,
    postcode: tags['addr:postcode'] ?? '',
    phone: tags.phone ?? tags['contact:phone'],
    email: tags.email ?? tags['contact:email'],
    website: tags.website ?? tags['contact:website'],
    googleMapsUrl: mapsUrl,
    needsWebsite: false,
    needsSocial: false,
    outreachPriority: 'none',
    outreachReason: '',
    enriched: false,
    source: 'openstreetmap',
  };

  return applyOutreachScores([lead])[0];
}

export async function searchOverpass(
  bounds: GeoBounds,
  industry: IndustryOption,
  city: string,
  state: string,
  country: string,
  limit = 40
): Promise<MapsLeadResult[]> {
  const query = buildQuery(bounds, industry, limit);

  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Lagnaa-MapsLeadFinder/1.0 (contact@datacrew.ai)',
      Accept: 'application/json',
    },
    body: `data=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) return [];

  const data = (await response.json()) as { elements?: OsmElement[] };
  const seen = new Set<string>();
  const leads: MapsLeadResult[] = [];

  for (const el of data.elements ?? []) {
    const lead = parseElement(el, { city, state, country, industry });
    if (!lead || seen.has(lead.name.toLowerCase())) continue;
    seen.add(lead.name.toLowerCase());
    leads.push(lead);
  }

  return leads;
}