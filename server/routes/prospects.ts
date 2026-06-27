import { Router } from 'express';
import { bulkImportProspects } from '../contacts/contactsStore.js';
import { prepareContactInput } from '../contacts/contactHelpers.js';
import { getCountry } from '../prospects/countries.js';
import { enrichProspects, getProspectCountriesMeta, searchProspects } from '../prospects/prospectSearch.js';
import type { ProspectResult, ProspectSearchFilters, TitleLevel } from '../prospects/prospectTypes.js';

const router = Router();

const TITLE_LEVELS: { value: TitleLevel; label: string }[] = [
  { value: 'all', label: 'All decision-makers' },
  { value: 'ceo', label: 'CEO / Managing Director' },
  { value: 'cfo', label: 'CFO / Finance Director' },
  { value: 'director', label: 'Director & above' },
];

router.get('/meta', (req, res) => {
  const countryCode = (req.query.country as string) || 'GB';
  const country = getCountry(countryCode);

  res.json({
    countries: getProspectCountriesMeta(),
    country: country.code,
    industries: country.industries,
    regions: country.regions,
    titleLevels: TITLE_LEVELS,
    apiKeyConfigured: country.envKey ? Boolean(process.env[country.envKey]?.trim()) : true,
    dataSource: country.liveSource,
    dataMode: country.mode,
    disclaimer:
      'Free public data only — no paid APIs. Officer names are live for UK (Companies House). Other countries return company records from free registries (SEC, GLEIF, ABR) or sample data. Use website scan to find emails & phones.',
    signupUrl: country.signupUrl,
    envKey: country.envKey,
    envKeyLabel: country.envKeyLabel,
  });
});

router.post('/search', async (req, res) => {
  const body = req.body as ProspectSearchFilters;
  const result = await searchProspects({
    country: body.country ?? 'GB',
    query: body.query,
    sicCode: body.sicCode,
    region: body.region,
    titleLevel: body.titleLevel ?? 'all',
    hasEmail: Boolean(body.hasEmail),
    hasPhone: Boolean(body.hasPhone),
    enrichWebsites: Boolean(body.enrichWebsites),
    page: body.page ?? 1,
    pageSize: body.pageSize ?? 20,
  });
  res.json(result);
});

router.post('/enrich', async (req, res) => {
  const { ids, prospects } = req.body as { ids?: string[]; prospects?: ProspectResult[] };
  if (!ids?.length || !prospects?.length) {
    return res.status(400).json({ error: 'Select prospects to enrich.' });
  }
  const enriched = await enrichProspects(ids, prospects);
  const byId = new Map(enriched.map((p) => [p.id, p]));
  res.json({
    success: true,
    prospects: ids.map((id) => byId.get(id)).filter(Boolean),
  });
});

router.post('/import', (req, res) => {
  const { prospects, tag } = req.body as { prospects?: ProspectResult[]; tag?: string };
  if (!prospects?.length) {
    return res.status(400).json({ error: 'No prospects selected for import.' });
  }

  const importTag = tag?.trim() || 'prospect';
  const rows = prospects.map((p) => {
    const countrySlug = (p.country ?? 'xx').toString().toLowerCase();
    const tags = [importTag, `${countrySlug}-prospect`];
    if (p.industry) tags.push(p.industry.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40));
    const titleSlug = p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
    if (titleSlug) tags.push(titleSlug);

    const notes = [
      `Title: ${p.title}`,
      `Country: ${p.country}`,
      `Company #: ${p.companyNumber}`,
      p.website ? `Website: ${p.website}` : null,
      `Source: Prospect Finder (free data)`,
    ]
      .filter(Boolean)
      .join('\n');

    return prepareContactInput({
      firstName: p.firstName,
      lastName: p.lastName,
      name: p.fullName,
      phone: p.phone ?? '',
      email: p.email,
      company: p.company,
      address: p.address,
      postcode: p.postcode,
      notes,
      tags: [...new Set(tags)],
      source: 'prospect',
    });
  });

  const result = bulkImportProspects(rows);
  res.json({
    success: true,
    ...result,
    message: `Imported ${result.imported} prospect(s) to Contacts. ${result.skipped} skipped (duplicate or missing contact info).`,
  });
});

export default router;