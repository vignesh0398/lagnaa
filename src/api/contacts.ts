import type { ContactFilterField, PageSizeOption } from '../utils/contactDisplay';

export interface Contact {
  id: string;
  name: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  phone: string;
  phoneAlt?: string;
  email?: string;
  dob?: string;
  address?: string;
  postcode?: string;
  company?: string;
  notes?: string;
  tags: string[];
  dnd?: boolean;
  ghlContactId?: string;
  source: 'manual' | 'csv' | 'ghl' | 'prospect';
  createdAt: string;
  updatedAt: string;
  lastCalledAt?: string;
  lastCallSid?: string;
  callCount: number;
}

export interface ContactsConfig {
  autoCallOnTag: boolean;
  callTriggerTag: string;
}

export interface ContactsStats {
  total: number;
  withTags: number;
  called: number;
  triggerTag: string;
  autoCallOnTag: boolean;
}

export interface ContactsListParams {
  search?: string;
  tag?: string;
  filterField?: ContactFilterField;
  filterValue?: string;
  page?: number;
  pageSize?: PageSizeOption;
  all?: boolean;
}

export interface ContactsListResult {
  contacts: Contact[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data as T;
}

function buildContactsQuery(params?: ContactsListParams): string {
  const q = new URLSearchParams();
  if (params?.search) q.set('search', params.search);
  if (params?.tag) q.set('tag', params.tag);
  if (params?.filterField) q.set('filterField', params.filterField);
  if (params?.filterValue) q.set('filterValue', params.filterValue);
  if (params?.page) q.set('page', String(params.page));
  if (params?.pageSize) q.set('pageSize', String(params.pageSize));
  if (params?.all) q.set('all', 'true');
  const s = q.toString();
  return s ? `?${s}` : '';
}

export function getContacts(params?: ContactsListParams): Promise<ContactsListResult> {
  return api<ContactsListResult>(`/api/contacts${buildContactsQuery(params)}`);
}

export function getContactTags(): Promise<{ tags: string[] }> {
  return api<{ tags: string[] }>('/api/contacts/tags');
}

export function getContactsStats() {
  return api<ContactsStats>('/api/contacts/stats');
}

export function getContactsConfig() {
  return api<ContactsConfig>('/api/contacts/config');
}

export function saveContactsConfig(config: Partial<ContactsConfig>) {
  return api<{ success: boolean; config: ContactsConfig }>('/api/contacts/config', {
    method: 'PUT',
    body: JSON.stringify(config),
  });
}

export function createContact(contact: Partial<Contact>) {
  return api<{ success: boolean; contact: Contact }>('/api/contacts', {
    method: 'POST',
    body: JSON.stringify(contact),
  });
}

export function updateContact(id: string, patch: Partial<Contact>) {
  return api<{ success: boolean; contact: Contact }>(`/api/contacts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
}

export function deleteContact(id: string) {
  return api<{ success: boolean }>(`/api/contacts/${id}`, { method: 'DELETE' });
}

export function callContact(id: string) {
  return api<{ success: boolean; message: string; callSid?: string; queued?: boolean }>(
    `/api/contacts/${id}/call`,
    { method: 'POST' }
  );
}

export function addContactTags(id: string, tags: string[]) {
  return api<{ success: boolean; contact: Contact; triggerMessage?: string }>(`/api/contacts/${id}/tags`, {
    method: 'POST',
    body: JSON.stringify({ tags }),
  });
}

export function bulkAddTagsToContacts(contactIds: string[], tags: string[]) {
  return api<{ success: boolean; updated: number; triggersFired: number; message: string }>(
    '/api/contacts/bulk/tags',
    { method: 'POST', body: JSON.stringify({ contactIds, tags }) }
  );
}

export function callSelectedContacts(contactIds: string[]) {
  return api<{
    success: boolean;
    total: number;
    placed: number;
    queued: number;
    skipped: number;
    errors: string[];
  }>('/api/contacts/bulk/call', { method: 'POST', body: JSON.stringify({ contactIds }) });
}

export function callContactsByTags(tags: string[]) {
  return api<{
    success: boolean;
    total: number;
    placed: number;
    queued: number;
    skipped: number;
    errors: string[];
  }>('/api/contacts/call-by-tags', { method: 'POST', body: JSON.stringify({ tags }) });
}

export interface ContactConversation {
  id: string;
  channel: 'Voice' | 'WhatsApp' | 'Email';
  time: string;
  summary: string;
  outcome: string;
  status: string;
  duration: string;
  campaignName?: string;
  messageCount: number;
  messages: { role: 'user' | 'assistant' | 'system'; content: string; timestamp: string }[];
}

export function getContactConversations(contactId: string) {
  return api<{ contact: Contact; conversations: ContactConversation[] }>(
    `/api/contacts/${contactId}/conversations`
  );
}

export function setContactDnd(contactId: string, dnd: boolean) {
  return api<{ success: boolean; contact: Contact }>(`/api/contacts/${contactId}/dnd`, {
    method: 'PUT',
    body: JSON.stringify({ dnd }),
  });
}

export function importContacts(contacts: Partial<Contact>[]) {
  return api<{ success: boolean; imported: number; skipped: number }>('/api/contacts/import', {
    method: 'POST',
    body: JSON.stringify({ contacts }),
  });
}