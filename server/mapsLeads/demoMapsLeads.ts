import type { MapsLeadResult } from './mapsLeadTypes.js';
import { applyOutreachScores } from './outreachScore.js';

const DEMO: Omit<MapsLeadResult, 'needsWebsite' | 'needsSocial' | 'outreachPriority' | 'outreachReason'>[] = [
  {
    id: 'demo-1',
    name: 'Bella Roma Trattoria',
    industry: 'Restaurants & Food',
    industryId: 'restaurant',
    country: 'GB',
    state: 'Greater London',
    city: 'London',
    address: '12 Camden High Street',
    postcode: 'NW1 0JH',
    phone: '+44 20 7123 4567',
    website: 'https://facebook.com/bellaromatrattoria',
    googleMapsUrl: 'https://maps.google.com/?q=Bella+Roma+London',
    enriched: false,
    source: 'demo',
  },
  {
    id: 'demo-2',
    name: 'Greenfield Primary School',
    industry: 'Schools & Education',
    industryId: 'school',
    country: 'GB',
    state: 'West Midlands',
    city: 'Birmingham',
    address: '45 Greenfield Road',
    postcode: 'B15 2TT',
    phone: '+44 121 555 0198',
    email: 'office@greenfield-primary-demo.sch.uk',
    website: 'https://greenfield-primary-demo.sch.uk',
    googleMapsUrl: 'https://maps.google.com/?q=Greenfield+Primary+Birmingham',
    enriched: false,
    source: 'demo',
  },
  {
    id: 'demo-3',
    name: 'Oakwood Community Clinic',
    industry: 'Hospitals & Clinics',
    industryId: 'hospital',
    country: 'GB',
    state: 'Greater Manchester',
    city: 'Manchester',
    address: '88 Oxford Road',
    postcode: 'M1 5NH',
    phone: '+44 161 555 4422',
    enriched: false,
    source: 'demo',
  },
  {
    id: 'demo-4',
    name: 'The Corner Café',
    industry: 'Restaurants & Food',
    industryId: 'restaurant',
    country: 'GB',
    state: 'West Yorkshire',
    city: 'Leeds',
    address: '3 Briggate',
    postcode: 'LS1 6ER',
    phone: '+44 113 555 7788',
    website: 'https://cornercafe-leeds.wixsite.com/menu',
    instagram: 'https://instagram.com/cornercafeleeds',
    enriched: false,
    source: 'demo',
  },
  {
    id: 'demo-5',
    name: 'Premier Auto Repairs',
    industry: 'Garages & Automotive',
    industryId: 'automotive',
    country: 'US',
    state: 'Texas',
    city: 'Austin',
    address: '2200 South Lamar Blvd',
    postcode: '78704',
    phone: '+1 512 555 3300',
    website: 'https://premierautorepairs-austin.com',
    facebook: 'https://facebook.com/premierautorepairs',
    enriched: false,
    source: 'demo',
  },
  {
    id: 'demo-6',
    name: 'Sunrise Yoga Studio',
    industry: 'Gyms & Fitness',
    industryId: 'fitness',
    country: 'US',
    state: 'California',
    city: 'San Diego',
    address: '101 Harbor Drive',
    postcode: '92101',
    phone: '+1 619 555 2211',
    enriched: false,
    source: 'demo',
  },
  {
    id: 'demo-in-1',
    name: 'Apollo Hospitals Chennai',
    industry: 'Hospitals & Clinics',
    industryId: 'hospital',
    country: 'IN',
    state: 'Tamil Nadu',
    city: 'Chennai',
    address: '21 Greams Lane, Off Greams Road',
    postcode: '600006',
    phone: '+91 44 2829 3333',
    website: 'https://www.apollohospitals.com',
    googleMapsUrl: 'https://maps.google.com/?q=Apollo+Hospitals+Chennai',
    enriched: false,
    source: 'demo',
  },
  {
    id: 'demo-in-2',
    name: 'MIOT International Hospital',
    industry: 'Hospitals & Clinics',
    industryId: 'hospital',
    country: 'IN',
    state: 'Tamil Nadu',
    city: 'Chennai',
    address: '4/112, Mount Poonamallee Road, Manapakkam',
    postcode: '600089',
    phone: '+91 44 4200 2288',
    website: 'https://www.miotinternational.com',
    enriched: false,
    source: 'demo',
  },
  {
    id: 'demo-in-3',
    name: 'PSG Hospitals',
    industry: 'Hospitals & Clinics',
    industryId: 'hospital',
    country: 'IN',
    state: 'Tamil Nadu',
    city: 'Coimbatore',
    address: 'Peelamedu, Avinashi Road',
    postcode: '641004',
    phone: '+91 422 257 0170',
    website: 'https://www.psghospitals.com',
    enriched: false,
    source: 'demo',
  },
];

export function getDemoMapsLeads(filters: {
  country?: string;
  state?: string;
  city?: string;
  industryId?: string;
}): MapsLeadResult[] {
  let rows = DEMO.map((d) => ({ ...d, needsWebsite: false, needsSocial: false, outreachPriority: 'none' as const, outreachReason: '' }));

  if (filters.country) {
    rows = rows.filter((r) => r.country === filters.country);
  }
  if (filters.state?.trim()) {
    const s = filters.state.toLowerCase();
    rows = rows.filter((r) => r.state.toLowerCase().includes(s));
  }
  if (filters.city?.trim()) {
    const c = filters.city.toLowerCase();
    rows = rows.filter((r) => r.city.toLowerCase().includes(c));
  }
  if (filters.industryId && filters.industryId !== 'all') {
    rows = rows.filter((r) => r.industryId === filters.industryId);
  }

  return applyOutreachScores(rows);
}