import type { MapsLeadResult, OutreachPriority } from './mapsLeadTypes.js';

const WEAK_WEBSITE_PATTERNS = [
  'facebook.com',
  'fb.com',
  'instagram.com',
  'sites.google.com',
  'wixsite.com',
  'wordpress.com',
  'weebly.com',
  'godaddysites.com',
  'square.site',
  'linktr.ee',
  'yelp.com',
  'tripadvisor.',
  'google.com/maps',
  'business.site',
];

export function isWeakOrMissingWebsite(url?: string): boolean {
  if (!url?.trim()) return true;
  const lower = url.toLowerCase();
  return WEAK_WEBSITE_PATTERNS.some((p) => lower.includes(p));
}

export function hasSocialPresence(lead: Pick<MapsLeadResult, 'facebook' | 'instagram' | 'linkedin' | 'twitter' | 'tiktok'>): boolean {
  return !!(lead.facebook || lead.instagram || lead.linkedin || lead.twitter || lead.tiktok);
}

export function scoreOutreach(lead: Pick<MapsLeadResult, 'website' | 'facebook' | 'instagram' | 'linkedin' | 'twitter' | 'tiktok'>): {
  needsWebsite: boolean;
  needsSocial: boolean;
  outreachPriority: OutreachPriority;
  outreachReason: string;
} {
  const needsWebsite = isWeakOrMissingWebsite(lead.website);
  const needsSocial = !hasSocialPresence(lead);

  let outreachPriority: OutreachPriority = 'none';
  let outreachReason = 'Has website and social presence — lower priority for web/marketing pitch.';

  if (needsWebsite && needsSocial) {
    outreachPriority = 'high';
    outreachReason = 'No proper website and no social media — ideal for website + marketing outreach.';
  } else if (needsWebsite) {
    outreachPriority = 'high';
    outreachReason = 'Missing or weak website — pitch website design and landing pages.';
  } else if (needsSocial) {
    outreachPriority = 'medium';
    outreachReason = 'Has a website but weak social presence — pitch social media management.';
  } else if (lead.website && isWeakOrMissingWebsite(lead.website) === false && needsSocial) {
    outreachPriority = 'medium';
    outreachReason = 'Could improve digital presence.';
  }

  return { needsWebsite, needsSocial, outreachPriority, outreachReason };
}

export function applyOutreachScores<T extends MapsLeadResult>(leads: T[]): T[] {
  return leads.map((lead) => {
    const scored = scoreOutreach(lead);
    return { ...lead, ...scored };
  });
}