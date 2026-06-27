import type { SicOption } from './prospectTypes.js';

/** Common UK SIC sections used for industry filtering (Companies House advanced search). */
export const SIC_OPTIONS: SicOption[] = [
  { code: '41', label: 'Construction of buildings' },
  { code: '42', label: 'Civil engineering' },
  { code: '43', label: 'Specialised construction' },
  { code: '45', label: 'Motor trades' },
  { code: '46', label: 'Wholesale trade' },
  { code: '47', label: 'Retail trade' },
  { code: '49', label: 'Land transport' },
  { code: '55', label: 'Accommodation' },
  { code: '56', label: 'Food & beverage services' },
  { code: '58', label: 'Publishing' },
  { code: '61', label: 'Telecommunications' },
  { code: '62', label: 'Computer programming & IT' },
  { code: '63', label: 'Information services' },
  { code: '64', label: 'Financial services' },
  { code: '65', label: 'Insurance' },
  { code: '66', label: 'Financial auxiliaries' },
  { code: '68', label: 'Real estate' },
  { code: '69', label: 'Legal & accounting' },
  { code: '70', label: 'Head offices & consultancy' },
  { code: '71', label: 'Architecture & engineering' },
  { code: '72', label: 'Scientific R&D' },
  { code: '73', label: 'Advertising & market research' },
  { code: '74', label: 'Design & photography' },
  { code: '75', label: 'Veterinary' },
  { code: '77', label: 'Rental & leasing' },
  { code: '78', label: 'Employment agencies' },
  { code: '79', label: 'Travel agencies' },
  { code: '80', label: 'Security & investigation' },
  { code: '81', label: 'Facilities & landscaping' },
  { code: '82', label: 'Office admin & support' },
  { code: '85', label: 'Education' },
  { code: '86', label: 'Healthcare' },
  { code: '87', label: 'Residential care' },
  { code: '88', label: 'Social work' },
  { code: '90', label: 'Creative arts' },
  { code: '93', label: 'Sports & recreation' },
  { code: '96', label: 'Personal services' },
];

export function sicLabel(code: string): string {
  const prefix = code.replace(/\D/g, '').slice(0, 2);
  const match = SIC_OPTIONS.find((s) => s.code === prefix);
  return match?.label ?? `SIC ${code}`;
}