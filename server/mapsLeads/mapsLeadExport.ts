import type { MapsLeadResult } from './mapsLeadTypes.js';

function csvEscape(value: string | number | undefined): string {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function leadsToCsv(leads: MapsLeadResult[]): string {
  const headers = [
    'Business Name',
    'Industry',
    'Country',
    'State',
    'City',
    'Address',
    'Postcode',
    'Phone',
    'Email',
    'Website',
    'Google Maps',
    'Facebook',
    'Instagram',
    'LinkedIn',
    'Twitter',
    'TikTok',
    'Needs Website',
    'Needs Social',
    'Outreach Priority',
    'Outreach Reason',
    'Rating',
    'Reviews',
    'Data Source',
  ];

  const rows = leads.map((l) =>
    [
      l.name,
      l.industry,
      l.country,
      l.state,
      l.city,
      l.address,
      l.postcode,
      l.phone,
      l.email,
      l.website,
      l.googleMapsUrl,
      l.facebook,
      l.instagram,
      l.linkedin,
      l.twitter,
      l.tiktok,
      l.needsWebsite ? 'Yes' : 'No',
      l.needsSocial ? 'Yes' : 'No',
      l.outreachPriority,
      l.outreachReason,
      l.rating,
      l.reviewCount,
      l.source,
    ]
      .map(csvEscape)
      .join(',')
  );

  return `\uFEFF${headers.join(',')}\n${rows.join('\n')}`;
}