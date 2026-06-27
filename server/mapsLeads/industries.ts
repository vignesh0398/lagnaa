import type { IndustryOption } from './mapsLeadTypes.js';

export const MAP_INDUSTRIES: IndustryOption[] = [
  {
    id: 'restaurant',
    label: 'Restaurants & Food',
    placesQuery: 'restaurant',
    osmTags: [
      { key: 'amenity', value: 'restaurant' },
      { key: 'amenity', value: 'fast_food' },
      { key: 'amenity', value: 'cafe' },
      { key: 'amenity', value: 'bar' },
    ],
  },
  {
    id: 'hospital',
    label: 'Hospitals & Clinics',
    placesQuery: 'hospital clinic',
    osmTags: [
      { key: 'amenity', value: 'hospital' },
      { key: 'amenity', value: 'clinic' },
      { key: 'amenity', value: 'doctors' },
      { key: 'amenity', value: 'dentist' },
    ],
  },
  {
    id: 'school',
    label: 'Schools & Education',
    placesQuery: 'school college',
    osmTags: [
      { key: 'amenity', value: 'school' },
      { key: 'amenity', value: 'college' },
      { key: 'amenity', value: 'kindergarten' },
      { key: 'amenity', value: 'university' },
    ],
  },
  {
    id: 'retail',
    label: 'Shops & Retail',
    placesQuery: 'shop store retail',
    osmTags: [
      { key: 'shop', value: 'clothes' },
      { key: 'shop', value: 'supermarket' },
      { key: 'shop', value: 'convenience' },
      { key: 'shop', value: 'hairdresser' },
    ],
  },
  {
    id: 'hotel',
    label: 'Hotels & Hospitality',
    placesQuery: 'hotel guest house',
    osmTags: [
      { key: 'tourism', value: 'hotel' },
      { key: 'tourism', value: 'guest_house' },
      { key: 'tourism', value: 'hostel' },
    ],
  },
  {
    id: 'fitness',
    label: 'Gyms & Fitness',
    placesQuery: 'gym fitness centre',
    osmTags: [{ key: 'leisure', value: 'fitness_centre' }, { key: 'leisure', value: 'sports_centre' }],
  },
  {
    id: 'automotive',
    label: 'Garages & Automotive',
    placesQuery: 'car repair garage',
    osmTags: [{ key: 'shop', value: 'car_repair' }, { key: 'amenity', value: 'car_wash' }],
  },
  {
    id: 'professional',
    label: 'Local Services (plumber, salon, etc.)',
    placesQuery: 'local business services',
    osmTags: [
      { key: 'craft', value: 'plumber' },
      { key: 'craft', value: 'electrician' },
      { key: 'shop', value: 'beauty' },
      { key: 'office', value: 'lawyer' },
      { key: 'office', value: 'accountant' },
    ],
  },
  {
    id: 'all',
    label: 'All local businesses',
    placesQuery: 'local business',
    osmTags: [
      { key: 'amenity', value: 'restaurant' },
      { key: 'shop', value: 'yes' },
      { key: 'office', value: 'yes' },
    ],
  },
];

export function getIndustry(id?: string): IndustryOption {
  return MAP_INDUSTRIES.find((i) => i.id === id) ?? MAP_INDUSTRIES[0];
}

export const MAP_COUNTRIES = [
  { code: 'GB', label: 'United Kingdom' },
  { code: 'US', label: 'United States' },
  { code: 'CA', label: 'Canada' },
  { code: 'AU', label: 'Australia' },
  { code: 'IN', label: 'India' },
  { code: 'AE', label: 'United Arab Emirates' },
  { code: 'DE', label: 'Germany' },
  { code: 'FR', label: 'France' },
  { code: 'IE', label: 'Ireland' },
  { code: 'SG', label: 'Singapore' },
  { code: 'ZA', label: 'South Africa' },
];