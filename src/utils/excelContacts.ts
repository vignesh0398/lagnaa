import * as XLSX from 'xlsx';
import type { Contact } from '../api/contacts';
import { buildContactNameFromParts } from './contactDisplay';

export type ContactImportField =
  | 'skip'
  | 'phone'
  | 'phoneAlt'
  | 'firstName'
  | 'middleName'
  | 'lastName'
  | 'name'
  | 'email'
  | 'dob'
  | 'address'
  | 'postcode'
  | 'company'
  | 'tags'
  | 'notes';

export const IMPORT_FIELDS: { id: ContactImportField; label: string; required?: boolean }[] = [
  { id: 'skip', label: '— Skip column —' },
  { id: 'phone', label: 'Phone number', required: true },
  { id: 'phoneAlt', label: 'Phone (alternative)' },
  { id: 'firstName', label: 'First name' },
  { id: 'middleName', label: 'Middle name' },
  { id: 'lastName', label: 'Last name' },
  { id: 'name', label: 'Full name' },
  { id: 'email', label: 'Email' },
  { id: 'dob', label: 'Date of birth' },
  { id: 'address', label: 'Address' },
  { id: 'postcode', label: 'Postcode' },
  { id: 'company', label: 'Company' },
  { id: 'tags', label: 'Tags' },
  { id: 'notes', label: 'Notes' },
];

const ALIASES: Record<Exclude<ContactImportField, 'skip'>, string[]> = {
  phone: ['phone', 'mobile', 'tel', 'telephone', 'cell', 'number', 'phone number', 'contact number'],
  phoneAlt: ['alt phone', 'alternative phone', 'phone alt', 'phone 2', 'secondary phone', 'other phone'],
  firstName: ['first name', 'firstname', 'given name', 'forename'],
  middleName: ['middle name', 'middlename', 'middle'],
  lastName: ['last name', 'lastname', 'surname', 'family name'],
  name: ['name', 'full name', 'contact', 'client', 'customer', 'contact name'],
  email: ['email', 'e-mail', 'mail'],
  dob: ['dob', 'date of birth', 'birthday', 'birth date'],
  address: ['address', 'street', 'addr', 'line 1', 'address line'],
  postcode: ['postcode', 'postal', 'zip', 'zip code', 'post code'],
  company: ['company', 'organization', 'organisation', 'business'],
  tags: ['tags', 'tag', 'labels', 'segment'],
  notes: ['notes', 'note', 'comments', 'comment'],
};

export interface ParsedExcelSheet {
  headers: string[];
  rows: string[][];
  fileName: string;
}

export function parseExcelFile(file: File): Promise<ParsedExcelSheet> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          reject(new Error('Excel file has no sheets'));
          return;
        }
        const sheet = workbook.Sheets[sheetName];
        const raw = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
          header: 1,
          defval: '',
          raw: false,
        }) as (string | number | null)[][];

        const cleaned = raw
          .map((row) => row.map((cell) => String(cell ?? '').trim()))
          .filter((row) => row.some((cell) => cell.length > 0));

        if (cleaned.length < 2) {
          reject(new Error('Sheet needs a header row and at least one data row'));
          return;
        }

        const headers = cleaned[0];
        const rows = cleaned.slice(1);
        resolve({ headers, rows, fileName: file.name });
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Failed to parse Excel file'));
      }
    };
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsArrayBuffer(file);
  });
}

export function guessColumnMapping(headers: string[]): Record<number, ContactImportField> {
  const mapping: Record<number, ContactImportField> = {};
  const used = new Set<ContactImportField>();

  headers.forEach((header, index) => {
    const h = header.toLowerCase().trim();
    if (!h) {
      mapping[index] = 'skip';
      return;
    }
    for (const [field, aliases] of Object.entries(ALIASES) as [Exclude<ContactImportField, 'skip'>, string[]][]) {
      if (used.has(field)) continue;
      if (aliases.some((a) => h === a || h.includes(a))) {
        mapping[index] = field;
        used.add(field);
        return;
      }
    }
    mapping[index] = 'skip';
  });

  if (!used.has('phone')) {
    const phoneIdx = headers.findIndex((h) => /\d{7,}/.test(h) || h.toLowerCase().includes('phone'));
    if (phoneIdx >= 0) mapping[phoneIdx] = 'phone';
    else if (headers.length) mapping[0] = 'phone';
  }

  return mapping;
}

function parseTagsCell(value: string): string[] {
  if (!value.trim()) return [];
  return value
    .split(/[|,;]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export function mapRowsToContacts(
  rows: string[][],
  columnMapping: Record<number, ContactImportField>
): Partial<Contact>[] {
  return rows
    .map((row) => {
      const contact: Partial<Contact> = { tags: [], source: 'csv' };
      for (const [colStr, field] of Object.entries(columnMapping)) {
        const col = Number(colStr);
        const value = row[col]?.trim() ?? '';
        if (!value || field === 'skip') continue;
        if (field === 'tags') {
          contact.tags = parseTagsCell(value);
        } else {
          (contact as Record<string, string>)[field] = value;
        }
      }
      contact.name = buildContactNameFromParts(contact);
      if (!contact.firstName && !contact.lastName && contact.name === 'Unknown') {
        contact.name = 'Unknown';
      }
      return contact;
    })
    .filter((c) => c.phone?.trim());
}