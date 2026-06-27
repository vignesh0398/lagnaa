import { getGhlConfig } from './ghlStore.js';

const GHL_BASE = 'https://services.leadconnectorhq.com';
const API_VERSION = '2021-07-28';

export interface GhlContact {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  tags?: string[];
  dateAdded?: string;
  dateOfBirth?: string;
  postalCode?: string;
  city?: string;
  customFields?: { id?: string; key?: string; value?: string; field_value?: string }[];
}

export interface GhlCustomField {
  id: string;
  name: string;
  fieldKey: string;
  dataType: string;
}

function headers(apiKey: string, locationId?: string): Record<string, string> {
  const h: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    Version: API_VERSION,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (locationId) h['Location-Id'] = locationId;
  return h;
}

async function ghlFetch<T>(
  path: string,
  options: { method?: string; body?: unknown; apiKey?: string; locationId?: string } = {}
): Promise<T> {
  const config = getGhlConfig();
  const apiKey = options.apiKey ?? config.apiKey;
  const locationId = options.locationId ?? config.locationId;

  if (!apiKey) throw new Error('GoHighLevel API key not configured');

  const response = await fetch(`${GHL_BASE}${path}`, {
    method: options.method ?? 'GET',
    headers: headers(apiKey, locationId),
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  let data: unknown = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  if (!response.ok) {
    const msg =
      (data as { message?: string }).message ??
      (data as { error?: string }).error ??
      `GHL API error HTTP ${response.status}`;
    throw new Error(msg);
  }

  return data as T;
}

export async function testGhlConnection(apiKey: string, locationId: string): Promise<{ ok: boolean; locationName: string }> {
  const data = await ghlFetch<{ location?: { id: string; name: string; companyName?: string } }>(
    `/locations/${locationId}`,
    { apiKey, locationId }
  );
  const name = data.location?.name ?? data.location?.companyName ?? locationId;
  return { ok: true, locationName: name };
}

export async function searchContacts(options?: {
  query?: string;
  tag?: string;
  limit?: number;
}): Promise<GhlContact[]> {
  const config = getGhlConfig();
  if (!config.locationId) throw new Error('Location ID required');

  const body: Record<string, unknown> = {
    locationId: config.locationId,
    page: 1,
    pageLimit: options?.limit ?? 50,
  };
  if (options?.query) body.query = options.query;
  if (options?.tag) {
    body.filters = [{ field: 'tags', operator: 'contains', value: options.tag }];
  }

  const data = await ghlFetch<{ contacts?: GhlContact[] }>('/contacts/search', {
    method: 'POST',
    body,
  });

  return data.contacts ?? [];
}

export async function findContactByPhoneOrEmail(phone?: string, email?: string): Promise<GhlContact | null> {
  const config = getGhlConfig();
  if (!phone && !email) return null;

  const normalizePhone = (p: string) => p.replace(/\s/g, '');

  if (phone) {
    const contacts = await searchContacts({ query: normalizePhone(phone), limit: 10 });
    const match = contacts.find((c) => c.phone && normalizePhone(c.phone).includes(normalizePhone(phone).slice(-10)));
    if (match) return match;
  }

  if (email) {
    const contacts = await searchContacts({ query: email.toLowerCase(), limit: 10 });
    const match = contacts.find((c) => c.email?.toLowerCase() === email.toLowerCase());
    if (match) return match;
  }

  return null;
}

export async function updateContactFields(
  contactId: string,
  fields: { key: string; value: string }[],
  tags?: string[]
): Promise<void> {
  const customFields = fields
    .filter((f) => f.key && f.value)
    .map((f) => ({ key: f.key, field_value: f.value }));

  await ghlFetch(`/contacts/${contactId}`, {
    method: 'PUT',
    body: {
      customFields,
      ...(tags?.length ? { tags } : {}),
    },
  });
}

export async function addContactNote(contactId: string, body: string): Promise<void> {
  try {
    await ghlFetch(`/contacts/${contactId}/notes`, {
      method: 'POST',
      body: { body },
    });
  } catch {
    /* notes endpoint may not be enabled on all accounts */
  }
}

export async function getContact(contactId: string): Promise<GhlContact> {
  const data = await ghlFetch<{ contact?: GhlContact } & GhlContact>(`/contacts/${contactId}`);
  return data.contact ?? data;
}

export function readContactName(contact: GhlContact, nameFieldKey?: string): string {
  if (nameFieldKey?.trim()) {
    const custom = readContactField(contact, nameFieldKey);
    if (custom?.trim()) return custom.trim();
  }
  if (contact.name?.trim()) return contact.name.trim();
  const parts = [contact.firstName, contact.lastName].filter(Boolean);
  if (parts.length) return parts.join(' ');
  return 'the client';
}

function normalizeFieldKey(fieldKey: string): string {
  return fieldKey
    .toLowerCase()
    .replace(/\s/g, '_')
    .replace(/^contact\./, '');
}

function looksLikeDate(value: string): boolean {
  const v = value.trim();
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(v) ||
    /^\d{2}-\d{2}-\d{4}$/.test(v) ||
    /^\d{2}\/\d{2}\/\d{4}$/.test(v) ||
    /^\d{8}$/.test(v)
  );
}

function findDateLikeCustomFieldValue(contact: GhlContact): string | undefined {
  for (const cf of contact.customFields ?? []) {
    const value = (cf.value ?? cf.field_value ?? '').trim();
    if (value && looksLikeDate(value)) return value;
  }
  return undefined;
}

export function readContactField(contact: GhlContact, fieldKey: string): string | undefined {
  if (!fieldKey) return undefined;

  const norm = normalizeFieldKey(fieldKey);

  const standard: Record<string, string | undefined> = {
    date_of_birth: contact.dateOfBirth,
    dateofbirth: contact.dateOfBirth,
    dob: contact.dateOfBirth,
    customer_dob: contact.dateOfBirth,
    postcode: contact.postalCode,
    postal_code: contact.postalCode,
    postalcode: contact.postalCode,
    customer_postcode: contact.postalCode,
    customer_name: contact.name,
    first_name: contact.firstName,
    last_name: contact.lastName,
    phone: contact.phone,
    email: contact.email,
  };

  if (standard[norm]) return standard[norm];

  for (const cf of contact.customFields ?? []) {
    const rawKey = cf.key ?? '';
    const key = normalizeFieldKey(rawKey);
    const id = (cf.id ?? '').toLowerCase();

    if (key === norm || key.endsWith(`.${norm}`) || key.endsWith(`_${norm}`) || id === norm) {
      return cf.value ?? cf.field_value;
    }
  }

  if (norm.includes('dob') || norm.includes('birth')) {
    return findDateLikeCustomFieldValue(contact);
  }

  return undefined;
}

export async function listCustomFields(): Promise<GhlCustomField[]> {
  const config = getGhlConfig();
  const data = await ghlFetch<{ customFields?: GhlCustomField[] }>(
    `/locations/${config.locationId}/customFields`
  );
  return data.customFields ?? [];
}