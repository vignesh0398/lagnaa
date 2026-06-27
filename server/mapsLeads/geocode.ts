export interface GeoBounds {
  south: number;
  west: number;
  north: number;
  east: number;
  centerLat: number;
  centerLng: number;
  displayName: string;
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

export async function geocodeLocation(
  city: string | undefined,
  state: string | undefined,
  countryLabel: string
): Promise<GeoBounds | null> {
  const parts = [city?.trim(), state?.trim(), countryLabel.trim()].filter(Boolean);
  const q = parts.join(', ');

  try {
    const params = new URLSearchParams({
      q,
      format: 'json',
      limit: '1',
      addressdetails: '1',
    });

    const response = await fetch(`${NOMINATIM_URL}?${params}`, {
      headers: {
        'User-Agent': 'Lagnaa-MapsLeadFinder/1.0 (contact@datacrew.ai)',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!response.ok) return null;
    const results = (await response.json()) as { boundingbox?: string[]; display_name?: string }[];
    const hit = results[0];
    if (!hit?.boundingbox || hit.boundingbox.length < 4) return null;

    const [south, north, west, east] = hit.boundingbox.map(Number);
    return {
      south,
      west,
      north,
      east,
      centerLat: (south + north) / 2,
      centerLng: (west + east) / 2,
      displayName: hit.display_name ?? q,
    };
  } catch {
    return null;
  }
}