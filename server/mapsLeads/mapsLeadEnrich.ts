import { scrapeCompanyContacts } from '../prospects/websiteContactScraper.js';
import type { MapsLeadResult } from './mapsLeadTypes.js';
import { fetchSocialFromWebsite } from './socialScraper.js';
import { applyOutreachScores } from './outreachScore.js';

export async function enrichMapsLead(lead: MapsLeadResult): Promise<MapsLeadResult> {
  let updated = { ...lead };

  if (updated.website) {
    const social = await fetchSocialFromWebsite(updated.website);
    updated = { ...updated, ...social };
  } else {
    const scraped = await scrapeCompanyContacts(updated.name, undefined, updated.country);
    if (scraped.website) {
      updated.website = scraped.website;
      const social = await fetchSocialFromWebsite(scraped.website);
      updated = { ...updated, ...social };
    }
    if (!updated.email && scraped.email) updated.email = scraped.email;
    if (!updated.phone && scraped.phone) updated.phone = scraped.phone;
  }

  if (updated.website && (!updated.email || !updated.phone)) {
    const scraped = await scrapeCompanyContacts(updated.name, updated.website, updated.country);
    if (!updated.email && scraped.email) updated.email = scraped.email;
    if (!updated.phone && scraped.phone) updated.phone = scraped.phone;
  }

  updated.enriched = true;
  return applyOutreachScores([updated])[0];
}

export async function enrichMapsLeads(ids: string[], leads: MapsLeadResult[]): Promise<MapsLeadResult[]> {
  const idSet = new Set(ids);
  const targets = leads.filter((l) => idSet.has(l.id));
  const enriched = await Promise.all(targets.map((l) => enrichMapsLead(l)));
  const byId = new Map(enriched.map((l) => [l.id, l]));
  return leads.map((l) => byId.get(l.id) ?? l);
}