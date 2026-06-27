import type { CountryCode, RegionOption, SicOption } from './prospectTypes.js';
import { SIC_OPTIONS } from './sicCodes.js';
import { UK_REGIONS } from './ukRegions.js';

export type { CountryCode };

export type CountryDataMode = 'live_officers' | 'live_companies' | 'demo';

export interface CountryDefinition {
  code: CountryCode;
  label: string;
  flag: string;
  mode: CountryDataMode;
  liveSource: string;
  signupUrl?: string;
  envKey?: string;
  envKeyLabel?: string;
  regions: RegionOption[];
  industries: SicOption[];
}

const US_REGIONS: RegionOption[] = [
  { value: 'CA', label: 'California' },
  { value: 'NY', label: 'New York' },
  { value: 'TX', label: 'Texas' },
  { value: 'FL', label: 'Florida' },
  { value: 'IL', label: 'Illinois' },
  { value: 'WA', label: 'Washington' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'CO', label: 'Colorado' },
  { value: 'GA', label: 'Georgia' },
  { value: 'NJ', label: 'New Jersey' },
];

const US_INDUSTRIES: SicOption[] = [
  { code: '737', label: 'Software & IT services' },
  { code: '602', label: 'Banking & finance' },
  { code: '283', label: 'Pharmaceuticals' },
  { code: '367', label: 'Electronics' },
  { code: '481', label: 'Telecommunications' },
  { code: '531', label: 'Retail' },
  { code: '679', label: 'Real estate' },
  { code: '874', label: 'Management consulting' },
  { code: '809', label: 'Healthcare services' },
  { code: '371', label: 'Automotive' },
];

const AU_REGIONS: RegionOption[] = [
  { value: 'NSW', label: 'New South Wales' },
  { value: 'VIC', label: 'Victoria' },
  { value: 'QLD', label: 'Queensland' },
  { value: 'WA', label: 'Western Australia' },
  { value: 'SA', label: 'South Australia' },
  { value: 'TAS', label: 'Tasmania' },
  { value: 'ACT', label: 'Australian Capital Territory' },
  { value: 'NT', label: 'Northern Territory' },
];

const CA_REGIONS: RegionOption[] = [
  { value: 'ON', label: 'Ontario' },
  { value: 'BC', label: 'British Columbia' },
  { value: 'AB', label: 'Alberta' },
  { value: 'QC', label: 'Quebec' },
  { value: 'MB', label: 'Manitoba' },
  { value: 'SK', label: 'Saskatchewan' },
];

const DE_REGIONS: RegionOption[] = [
  { value: 'Bayern', label: 'Bavaria' },
  { value: 'Berlin', label: 'Berlin' },
  { value: 'Hamburg', label: 'Hamburg' },
  { value: 'Hessen', label: 'Hesse' },
  { value: 'NRW', label: 'North Rhine-Westphalia' },
  { value: 'Baden-Württemberg', label: 'Baden-Württemberg' },
];

const FR_REGIONS: RegionOption[] = [
  { value: 'Île-de-France', label: 'Île-de-France' },
  { value: 'Auvergne-Rhône-Alpes', label: 'Auvergne-Rhône-Alpes' },
  { value: 'Provence-Alpes-Côte d\'Azur', label: "Provence-Alpes-Côte d'Azur" },
  { value: 'Occitanie', label: 'Occitanie' },
  { value: 'Nouvelle-Aquitaine', label: 'Nouvelle-Aquitaine' },
];

const IN_REGIONS: RegionOption[] = [
  { value: 'Maharashtra', label: 'Maharashtra' },
  { value: 'Karnataka', label: 'Karnataka' },
  { value: 'Delhi', label: 'Delhi NCR' },
  { value: 'Tamil Nadu', label: 'Tamil Nadu' },
  { value: 'Gujarat', label: 'Gujarat' },
  { value: 'Telangana', label: 'Telangana' },
];

const AE_REGIONS: RegionOption[] = [
  { value: 'Dubai', label: 'Dubai' },
  { value: 'Abu Dhabi', label: 'Abu Dhabi' },
  { value: 'Sharjah', label: 'Sharjah' },
];

const SG_REGIONS: RegionOption[] = [{ value: 'Singapore', label: 'Singapore' }];
const IE_REGIONS: RegionOption[] = [
  { value: 'Dublin', label: 'Dublin' },
  { value: 'Cork', label: 'Cork' },
  { value: 'Galway', label: 'Galway' },
];
const NL_REGIONS: RegionOption[] = [
  { value: 'North Holland', label: 'North Holland' },
  { value: 'South Holland', label: 'South Holland' },
  { value: 'Utrecht', label: 'Utrecht' },
];
const ZA_REGIONS: RegionOption[] = [
  { value: 'Gauteng', label: 'Gauteng' },
  { value: 'Western Cape', label: 'Western Cape' },
  { value: 'KwaZulu-Natal', label: 'KwaZulu-Natal' },
];

const GLOBAL_INDUSTRIES: SicOption[] = [
  { code: 'tech', label: 'Technology & software' },
  { code: 'finance', label: 'Financial services' },
  { code: 'construction', label: 'Construction & engineering' },
  { code: 'retail', label: 'Retail & e-commerce' },
  { code: 'health', label: 'Healthcare' },
  { code: 'consulting', label: 'Consulting & professional services' },
  { code: 'manufacturing', label: 'Manufacturing' },
  { code: 'logistics', label: 'Logistics & transport' },
  { code: 'hospitality', label: 'Hospitality & food' },
  { code: 'media', label: 'Media & marketing' },
];

export const COUNTRY_REGISTRY: CountryDefinition[] = [
  {
    code: 'GB',
    label: 'United Kingdom',
    flag: '🇬🇧',
    mode: 'live_officers',
    liveSource: 'Companies House (free API)',
    signupUrl: 'https://developer.company-information.service.gov.uk/',
    envKey: 'COMPANIES_HOUSE_API_KEY',
    envKeyLabel: 'Companies House API key',
    regions: UK_REGIONS,
    industries: SIC_OPTIONS,
  },
  {
    code: 'US',
    label: 'United States',
    flag: '🇺🇸',
    mode: 'live_companies',
    liveSource: 'SEC EDGAR (free, no key)',
    regions: US_REGIONS,
    industries: US_INDUSTRIES,
  },
  {
    code: 'AU',
    label: 'Australia',
    flag: '🇦🇺',
    mode: 'live_companies',
    liveSource: 'ABR Business Register (free GUID)',
    signupUrl: 'https://abr.business.gov.au/Tools/WebServices',
    envKey: 'ABR_GUID',
    envKeyLabel: 'ABR Web Services GUID',
    regions: AU_REGIONS,
    industries: GLOBAL_INDUSTRIES,
  },
  {
    code: 'CA',
    label: 'Canada',
    flag: '🇨🇦',
    mode: 'live_companies',
    liveSource: 'GLEIF legal entities (free)',
    regions: CA_REGIONS,
    industries: GLOBAL_INDUSTRIES,
  },
  {
    code: 'DE',
    label: 'Germany',
    flag: '🇩🇪',
    mode: 'live_companies',
    liveSource: 'GLEIF legal entities (free)',
    regions: DE_REGIONS,
    industries: GLOBAL_INDUSTRIES,
  },
  {
    code: 'FR',
    label: 'France',
    flag: '🇫🇷',
    mode: 'live_companies',
    liveSource: 'GLEIF legal entities (free)',
    regions: FR_REGIONS,
    industries: GLOBAL_INDUSTRIES,
  },
  {
    code: 'IN',
    label: 'India',
    flag: '🇮🇳',
    mode: 'demo',
    liveSource: 'Sample data (registry API pending)',
    regions: IN_REGIONS,
    industries: GLOBAL_INDUSTRIES,
  },
  {
    code: 'AE',
    label: 'United Arab Emirates',
    flag: '🇦🇪',
    mode: 'demo',
    liveSource: 'Sample data (registry API pending)',
    regions: AE_REGIONS,
    industries: GLOBAL_INDUSTRIES,
  },
  {
    code: 'SG',
    label: 'Singapore',
    flag: '🇸🇬',
    mode: 'live_companies',
    liveSource: 'GLEIF legal entities (free)',
    regions: SG_REGIONS,
    industries: GLOBAL_INDUSTRIES,
  },
  {
    code: 'IE',
    label: 'Ireland',
    flag: '🇮🇪',
    mode: 'live_companies',
    liveSource: 'GLEIF legal entities (free)',
    regions: IE_REGIONS,
    industries: GLOBAL_INDUSTRIES,
  },
  {
    code: 'NL',
    label: 'Netherlands',
    flag: '🇳🇱',
    mode: 'live_companies',
    liveSource: 'GLEIF legal entities (free)',
    regions: NL_REGIONS,
    industries: GLOBAL_INDUSTRIES,
  },
  {
    code: 'ZA',
    label: 'South Africa',
    flag: '🇿🇦',
    mode: 'demo',
    liveSource: 'Sample data (registry API pending)',
    regions: ZA_REGIONS,
    industries: GLOBAL_INDUSTRIES,
  },
];

export function getCountry(code?: string): CountryDefinition {
  const found = COUNTRY_REGISTRY.find((c) => c.code === code?.toUpperCase());
  return found ?? COUNTRY_REGISTRY[0];
}

export function isCountryEnvConfigured(country: CountryDefinition): boolean {
  if (!country.envKey) return true;
  return Boolean(process.env[country.envKey]?.trim());
}