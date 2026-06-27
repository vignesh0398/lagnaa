import type { Contact } from '../api/contacts';

export type ContactFilterField =
  | 'firstName'
  | 'middleName'
  | 'lastName'
  | 'id'
  | 'createdAt'
  | 'dob'
  | 'email'
  | 'phone'
  | 'phoneAlt'
  | 'address'
  | 'postcode';

export const CONTACT_FILTER_FIELDS: { id: ContactFilterField; label: string }[] = [
  { id: 'firstName', label: 'First name' },
  { id: 'middleName', label: 'Middle name' },
  { id: 'lastName', label: 'Last name' },
  { id: 'id', label: 'Contact Id' },
  { id: 'createdAt', label: 'Created at' },
  { id: 'dob', label: 'Date of birth' },
  { id: 'email', label: 'Email' },
  { id: 'phone', label: 'Phone number' },
  { id: 'phoneAlt', label: 'Phone (alternative)' },
  { id: 'address', label: 'Address' },
  { id: 'postcode', label: 'Postcode' },
];

export const PAGE_SIZE_OPTIONS = [20, 50, 75, 100] as const;
export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];

export function buildContactNameFromParts(input: {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  name?: string;
}): string {
  const parts = [input.firstName, input.middleName, input.lastName]
    .map((s) => s?.trim())
    .filter(Boolean);
  if (parts.length) return parts.join(' ');
  return input.name?.trim() || 'Unknown';
}

export function displayName(contact: Contact): string {
  const name = buildContactNameFromParts(contact);
  return name === 'Unknown' ? '—' : name;
}

export function formatDobDDMMYYYY(value?: string): string {
  if (!value?.trim()) return '—';
  const raw = value.trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw;

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;

  const dmy = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (dmy) {
    const dd = dmy[1].padStart(2, '0');
    const mm = dmy[2].padStart(2, '0');
    return `${dd}/${mm}/${dmy[3]}`;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    const dd = String(parsed.getDate()).padStart(2, '0');
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const yyyy = parsed.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  return raw;
}

export function formatCreatedAt(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

export function normalizeDobInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return formatDobDDMMYYYY(trimmed) === '—' ? trimmed : formatDobDDMMYYYY(trimmed);
}