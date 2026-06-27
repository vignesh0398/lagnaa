import type { Contact } from './contactsTypes.js';

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

export function normalizePhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function phonesMatch(a?: string, b?: string): boolean {
  if (!a?.trim() || !b?.trim()) return false;
  const da = normalizePhoneDigits(a);
  const db = normalizePhoneDigits(b);
  if (!da || !db) return false;
  if (da === db) return true;
  if (da.length >= 10 && db.length >= 10 && da.slice(-10) === db.slice(-10)) return true;
  return da.endsWith(db) || db.endsWith(da);
}

export function buildContactName(input: {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  name?: string;
}): string {
  const parts = [input.firstName, input.middleName, input.lastName]
    .map((s) => s?.trim())
    .filter(Boolean) as string[];
  if (parts.length) return parts.join(' ');
  return input.name?.trim() || 'Unknown';
}

export function normalizeContact(contact: Contact): Contact {
  const firstName = contact.firstName?.trim();
  const middleName = contact.middleName?.trim();
  const lastName = contact.lastName?.trim();
  if (firstName || middleName || lastName) {
    return {
      ...contact,
      firstName: firstName ?? '',
      middleName: middleName ?? '',
      lastName: lastName ?? '',
      name: buildContactName(contact),
    };
  }
  const legacy = contact.name?.trim() || '';
  if (!legacy) {
    return { ...contact, firstName: '', middleName: '', lastName: '' };
  }
  const bits = legacy.split(/\s+/);
  return {
    ...contact,
    firstName: bits[0] ?? '',
    middleName: bits.length > 2 ? bits.slice(1, -1).join(' ') : '',
    lastName: bits.length > 1 ? bits[bits.length - 1] : '',
  };
}

export function getContactFieldValue(contact: Contact, field: ContactFilterField): string {
  const c = normalizeContact(contact);
  switch (field) {
    case 'firstName':
      return c.firstName ?? '';
    case 'middleName':
      return c.middleName ?? '';
    case 'lastName':
      return c.lastName ?? '';
    case 'id':
      return c.id;
    case 'createdAt':
      return c.createdAt;
    case 'dob':
      return c.dob ?? '';
    case 'email':
      return c.email ?? '';
    case 'phone':
      return c.phone;
    case 'phoneAlt':
      return c.phoneAlt ?? '';
    case 'address':
      return c.address ?? '';
    case 'postcode':
      return c.postcode ?? '';
    default:
      return '';
  }
}

export function prepareContactInput(
  input: Partial<Contact>
): Omit<Contact, 'id' | 'createdAt' | 'updatedAt' | 'callCount'> {
  const firstName = input.firstName?.trim() ?? '';
  const middleName = input.middleName?.trim() ?? '';
  const lastName = input.lastName?.trim() ?? '';
  const name = buildContactName({
    firstName,
    middleName,
    lastName,
    name: input.name,
  });

  return {
    name,
    firstName,
    middleName,
    lastName,
    phone: input.phone?.trim() ?? '',
    phoneAlt: input.phoneAlt?.trim(),
    email: input.email?.trim(),
    dob: input.dob?.trim(),
    address: input.address?.trim(),
    postcode: input.postcode?.trim(),
    company: input.company?.trim(),
    notes: input.notes?.trim(),
    tags: input.tags ?? [],
    dnd: input.dnd ?? false,
    ghlContactId: input.ghlContactId,
    source: input.source ?? 'manual',
  };
}