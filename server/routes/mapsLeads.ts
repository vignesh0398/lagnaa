import { Router } from 'express';
import { bulkImportProspects } from '../contacts/contactsStore.js';
import { prepareContactInput } from '../contacts/contactHelpers.js';
import { MAP_COUNTRIES, MAP_INDUSTRIES } from '../mapsLeads/industries.js';
import { MAP_LOCATIONS } from '../mapsLeads/locations.js';
import { enrichMapsLeads, searchMapsLeads } from '../mapsLeads/mapsLeadSearch.js';
import { leadsToCsv } from '../mapsLeads/mapsLeadExport.js';
import { getGooglePlacesApiKey } from '../mapsLeads/googlePlacesProvider.js';
import type { MapsLeadResult, MapsLeadSearchFilters } from '../mapsLeads/mapsLeadTypes.js';

const router = Router();

router.get('/meta', (_req, res) => {
  res.json({
    countries: MAP_COUNTRIES,
    locations: MAP_LOCATIONS,
    industries: MAP_INDUSTRIES.map((i) => ({ id: i.id, label: i.label })),
    googleApiConfigured: !!getGooglePlacesApiKey(),
    disclaimer:
      'Finds local businesses like Google Maps using Google Places API (optional key) or free OpenStreetMap. Scans websites for email and social links. Flags businesses that need a website or social media — ideal for your web & marketing outreach.',
    signupUrl: 'https://console.cloud.google.com/google/maps-apis/credentials',
    envKey: 'GOOGLE_PLACES_API_KEY',
    envKeyLabel: 'Google Places API key (optional — enables full Maps search)',
  });
});

router.post('/search', async (req, res) => {
  const body = req.body as MapsLeadSearchFilters;
  const result = await searchMapsLeads({
    country: body.country ?? 'GB',
    state: body.state,
    city: body.city,
    industry: body.industry ?? 'restaurant',
    query: body.query,
    hasPhone: Boolean(body.hasPhone),
    hasEmail: Boolean(body.hasEmail),
    hasWebsite: Boolean(body.hasWebsite),
    needsWebsite: Boolean(body.needsWebsite),
    needsSocial: Boolean(body.needsSocial),
    outreachOnly: Boolean(body.outreachOnly),
    enrichWebsites: Boolean(body.enrichWebsites),
    page: body.page ?? 1,
    pageSize: body.pageSize ?? 20,
  });
  res.json(result);
});

router.post('/enrich', async (req, res) => {
  const { ids, leads } = req.body as { ids?: string[]; leads?: MapsLeadResult[] };
  if (!ids?.length || !leads?.length) {
    return res.status(400).json({ error: 'Select leads to enrich.' });
  }
  const enriched = await enrichMapsLeads(ids, leads);
  const byId = new Map(enriched.map((l) => [l.id, l]));
  res.json({
    success: true,
    leads: ids.map((id) => byId.get(id)).filter(Boolean),
  });
});

router.post('/export', (req, res) => {
  const { leads } = req.body as { leads?: MapsLeadResult[] };
  if (!leads?.length) {
    return res.status(400).json({ error: 'No leads to export.' });
  }
  const csv = leadsToCsv(leads);
  res.json({ success: true, csv, filename: `maps-leads-${new Date().toISOString().slice(0, 10)}.csv` });
});

router.post('/import', (req, res) => {
  const { leads, tag } = req.body as { leads?: MapsLeadResult[]; tag?: string };
  if (!leads?.length) {
    return res.status(400).json({ error: 'No leads selected for import.' });
  }

  const importTag = tag?.trim() || 'maps-lead';
  const rows = leads.map((l) => {
    const tags = [
      importTag,
      'maps-lead',
      l.outreachPriority === 'high' ? 'outreach-high' : null,
      l.needsWebsite ? 'needs-website' : null,
      l.needsSocial ? 'needs-social' : null,
      l.industryId,
    ].filter(Boolean) as string[];

    const notes = [
      `Industry: ${l.industry}`,
      `Location: ${[l.city, l.state, l.country].filter(Boolean).join(', ')}`,
      l.website ? `Website: ${l.website}` : 'Website: none / weak',
      l.googleMapsUrl ? `Maps: ${l.googleMapsUrl}` : null,
      l.facebook ? `Facebook: ${l.facebook}` : null,
      l.instagram ? `Instagram: ${l.instagram}` : null,
      `Outreach: ${l.outreachPriority} — ${l.outreachReason}`,
      `Source: Maps Lead Finder (${l.source})`,
    ]
      .filter(Boolean)
      .join('\n');

    return prepareContactInput({
      name: l.name,
      phone: l.phone ?? '',
      email: l.email,
      company: l.name,
      address: l.address,
      postcode: l.postcode,
      notes,
      tags: [...new Set(tags)],
      source: 'maps-lead',
    });
  });

  const result = bulkImportProspects(rows);
  res.json({
    success: true,
    ...result,
    message: `Imported ${result.imported} lead(s) to Contacts. ${result.skipped} skipped.`,
  });
});

export default router;