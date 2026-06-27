import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  getContactFieldValue,
  normalizeContact,
  normalizePhoneDigits,
  phonesMatch,
  prepareContactInput,
  type ContactFilterField,
} from './contactHelpers.js';
import type { Contact, ContactsConfig } from './contactsTypes.js';

const STORE_PATH = path.join(process.cwd(), 'server', 'data', 'contacts.json');
const MAX_CONTACTS = 5000;

const DEFAULT_CONFIG: ContactsConfig = {
  autoCallOnTag: false,
  callTriggerTag: 'call-now',
};

interface ContactsStore {
  config: ContactsConfig;
  contacts: Contact[];
}

function loadStore(): ContactsStore {
  if (!fs.existsSync(STORE_PATH)) {
    const initial: ContactsStore = { config: { ...DEFAULT_CONFIG }, contacts: [] };
    saveStore(initial);
    return initial;
  }
  const raw = JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8')) as ContactsStore;
  return {
    config: { ...DEFAULT_CONFIG, ...raw.config },
    contacts: raw.contacts ?? [],
  };
}

function saveStore(store: ContactsStore): void {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

export function getContactsConfig(): ContactsConfig {
  return loadStore().config;
}

export function saveContactsConfig(config: Partial<ContactsConfig>): ContactsConfig {
  const store = loadStore();
  store.config = { ...store.config, ...config };
  saveStore(store);
  return store.config;
}

export interface ListContactsOpts {
  search?: string;
  tag?: string;
  tags?: string[];
  filterField?: ContactFilterField;
  filterValue?: string;
  page?: number;
  pageSize?: number;
  all?: boolean;
}

export interface ListContactsResult {
  contacts: Contact[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function filterContacts(opts?: ListContactsOpts): Contact[] {
  let contacts = loadStore().contacts.map(normalizeContact);
  const q = opts?.search?.trim().toLowerCase();
  if (q) {
    contacts = contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.firstName?.toLowerCase().includes(q) ?? false) ||
        (c.lastName?.toLowerCase().includes(q) ?? false) ||
        c.phone.includes(q) ||
        (c.phoneAlt?.includes(q) ?? false) ||
        (c.email?.toLowerCase().includes(q) ?? false) ||
        (c.address?.toLowerCase().includes(q) ?? false) ||
        (c.postcode?.toLowerCase().includes(q) ?? false) ||
        (c.company?.toLowerCase().includes(q) ?? false) ||
        c.id.toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q))
    );
  }
  if (opts?.tag?.trim()) {
    const t = opts.tag.trim().toLowerCase();
    contacts = contacts.filter((c) => c.tags.some((x) => x.toLowerCase() === t));
  }
  if (opts?.tags?.length) {
    const wanted = opts.tags.map((t) => t.trim().toLowerCase()).filter(Boolean);
    contacts = contacts.filter((c) =>
      wanted.some((t) => c.tags.some((x) => x.toLowerCase() === t))
    );
  }
  if (opts?.filterField && opts.filterValue?.trim()) {
    const field = opts.filterField;
    const value = opts.filterValue.trim().toLowerCase();
    contacts = contacts.filter((c) =>
      getContactFieldValue(c, field).toLowerCase().includes(value)
    );
  }
  return contacts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function listContacts(opts?: ListContactsOpts): Contact[] {
  return filterContacts(opts);
}

export function listContactsPaginated(opts?: ListContactsOpts): ListContactsResult {
  const filtered = filterContacts(opts);
  const total = filtered.length;
  if (opts?.all) {
    return {
      contacts: filtered,
      total,
      page: 1,
      pageSize: total,
      totalPages: 1,
    };
  }
  const pageSize = [20, 50, 75, 100].includes(opts?.pageSize ?? 0) ? (opts!.pageSize as number) : 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, opts?.page ?? 1), totalPages);
  const start = (page - 1) * pageSize;
  return {
    contacts: filtered.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    totalPages,
  };
}

export function listAllContactTags(): string[] {
  const set = new Set<string>();
  loadStore().contacts.forEach((c) => c.tags.forEach((t) => set.add(t)));
  return [...set].sort();
}

export function getContactsByIds(ids: string[]): Contact[] {
  const set = new Set(ids);
  return loadStore().contacts.filter((c) => set.has(c.id));
}

export function bulkAddTags(contactIds: string[], tags: string[]): { updated: number; contacts: Contact[] } {
  const store = loadStore();
  const normTags = tags.map((t) => t.trim()).filter(Boolean);
  const updatedContacts: Contact[] = [];

  for (const id of contactIds) {
    const idx = store.contacts.findIndex((c) => c.id === id);
    if (idx < 0) continue;
    const existing = store.contacts[idx];
    const merged = [...new Set([...existing.tags, ...normTags])];
    store.contacts[idx] = {
      ...existing,
      tags: merged,
      updatedAt: new Date().toISOString(),
    };
    updatedContacts.push(store.contacts[idx]);
  }

  saveStore(store);
  return { updated: updatedContacts.length, contacts: updatedContacts };
}

export function getContactById(id: string): Contact | undefined {
  const contact = loadStore().contacts.find((c) => c.id === id);
  return contact ? normalizeContact(contact) : undefined;
}

export function findContactByPhoneOrEmail(phone?: string, email?: string): Contact | undefined {
  const phoneDigits = phone ? normalizePhoneDigits(phone) : '';
  const emailNorm = email?.trim().toLowerCase() ?? '';
  if (!phoneDigits && !emailNorm) return undefined;

  return loadStore()
    .contacts.map(normalizeContact)
    .find((c) => {
      if (phoneDigits) {
        if (phonesMatch(c.phone, phone)) return true;
        if (c.phoneAlt && phonesMatch(c.phoneAlt, phone)) return true;
      }
      if (emailNorm && c.email?.trim().toLowerCase() === emailNorm) return true;
      return false;
    });
}

export function isOnDnd(phone?: string, email?: string): boolean {
  return findContactByPhoneOrEmail(phone, email)?.dnd === true;
}

export function setContactDnd(id: string, dnd: boolean): Contact | undefined {
  return updateContact(id, { dnd });
}

export function createContact(input: Omit<Contact, 'id' | 'createdAt' | 'updatedAt' | 'callCount'>): Contact {
  const store = loadStore();
  const now = new Date().toISOString();
  const prepared = prepareContactInput(input);
  const contact: Contact = {
    ...prepared,
    id: `ct-${crypto.randomUUID()}`,
    callCount: 0,
    createdAt: now,
    updatedAt: now,
    tags: prepared.tags ?? [],
    source: prepared.source ?? 'manual',
  };
  store.contacts.unshift(contact);
  store.contacts = store.contacts.slice(0, MAX_CONTACTS);
  saveStore(store);
  return contact;
}

export function updateContact(id: string, patch: Partial<Contact>): Contact | undefined {
  const store = loadStore();
  const idx = store.contacts.findIndex((c) => c.id === id);
  if (idx < 0) return undefined;
  store.contacts[idx] = {
    ...store.contacts[idx],
    ...patch,
    id: store.contacts[idx].id,
    updatedAt: new Date().toISOString(),
  };
  saveStore(store);
  return store.contacts[idx];
}

export function deleteContact(id: string): boolean {
  const store = loadStore();
  const next = store.contacts.filter((c) => c.id !== id);
  if (next.length === store.contacts.length) return false;
  store.contacts = next;
  saveStore(store);
  return true;
}

function prospectPlaceholderPhone(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 1_000_000;
  }
  const suffix = String(hash).padStart(6, '0');
  return `+440000${suffix}`;
}

export function bulkImportProspects(
  rows: Omit<Contact, 'id' | 'createdAt' | 'updatedAt' | 'callCount'>[]
): { imported: number; skipped: number; emailOnly: number } {
  const store = loadStore();
  let imported = 0;
  let skipped = 0;
  let emailOnly = 0;
  const now = new Date().toISOString();

  for (const row of rows) {
    const email = row.email?.trim().toLowerCase() ?? '';
    let phone = row.phone?.trim() ?? '';
    const name = row.name?.trim() || row.firstName?.trim() || row.lastName?.trim();

    if (!name) {
      skipped += 1;
      continue;
    }
    if (!phone && !email) {
      skipped += 1;
      continue;
    }

    if (!phone) {
      phone = prospectPlaceholderPhone(email || name);
      emailOnly += 1;
    }

    const phoneDup = store.contacts.some((c) => c.phone.replace(/\D/g, '') === phone.replace(/\D/g, ''));
    const emailDup = email
      ? store.contacts.some((c) => c.email?.trim().toLowerCase() === email)
      : false;
    if (phoneDup || emailDup) {
      skipped += 1;
      continue;
    }

    const prepared = prepareContactInput({ ...row, phone, email: email || row.email });
    store.contacts.unshift({
      id: `ct-${crypto.randomUUID()}`,
      ...prepared,
      phone,
      email: email || prepared.email,
      tags: prepared.tags ?? [],
      source: 'prospect',
      callCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    imported += 1;
  }

  store.contacts = store.contacts.slice(0, MAX_CONTACTS);
  saveStore(store);
  return { imported, skipped, emailOnly };
}

export function bulkImportContacts(
  rows: Omit<Contact, 'id' | 'createdAt' | 'updatedAt' | 'callCount'>[]
): { imported: number; skipped: number } {
  const store = loadStore();
  let imported = 0;
  let skipped = 0;
  const now = new Date().toISOString();

  for (const row of rows) {
    if (!row.phone?.trim()) {
      skipped += 1;
      continue;
    }
    const phone = row.phone.trim();
    const duplicate = store.contacts.some((c) => c.phone.replace(/\D/g, '') === phone.replace(/\D/g, ''));
    if (duplicate) {
      skipped += 1;
      continue;
    }
    const prepared = prepareContactInput({ ...row, phone });
    store.contacts.unshift({
      id: `ct-${crypto.randomUUID()}`,
      ...prepared,
      phone,
      tags: prepared.tags ?? [],
      ghlContactId: row.ghlContactId,
      source: row.source ?? 'csv',
      callCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    imported += 1;
  }

  store.contacts = store.contacts.slice(0, MAX_CONTACTS);
  saveStore(store);
  return { imported, skipped };
}

export function markContactCalled(id: string, callSid: string): void {
  const store = loadStore();
  const idx = store.contacts.findIndex((c) => c.id === id);
  if (idx < 0) return;
  store.contacts[idx].lastCalledAt = new Date().toISOString();
  store.contacts[idx].lastCallSid = callSid;
  store.contacts[idx].callCount = (store.contacts[idx].callCount ?? 0) + 1;
  store.contacts[idx].updatedAt = new Date().toISOString();
  saveStore(store);
}

export function getContactsStats(): {
  total: number;
  withTags: number;
  called: number;
  triggerTag: string;
  autoCallOnTag: boolean;
} {
  const store = loadStore();
  const contacts = store.contacts;
  return {
    total: contacts.length,
    withTags: contacts.filter((c) => c.tags.length > 0).length,
    called: contacts.filter((c) => c.callCount > 0).length,
    triggerTag: store.config.callTriggerTag,
    autoCallOnTag: store.config.autoCallOnTag,
  };
}