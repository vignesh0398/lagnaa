import { fetchJson } from './fetchJson';
import type { Contact } from './contacts';

export type GdprLegalBasis =
  | 'consent'
  | 'contract'
  | 'legitimate_interest'
  | 'legal_obligation'
  | 'vital_interest'
  | 'public_task'
  | 'not_recorded';

export interface GdprSettings {
  retentionMonths: number;
  companyName: string;
  dpoEmail: string;
}

export const GDPR_LEGAL_BASES: { id: GdprLegalBasis; label: string }[] = [
  { id: 'consent', label: 'Consent' },
  { id: 'contract', label: 'Contract' },
  { id: 'legitimate_interest', label: 'Legitimate interest' },
  { id: 'legal_obligation', label: 'Legal obligation' },
  { id: 'vital_interest', label: 'Vital interest' },
  { id: 'public_task', label: 'Public task' },
  { id: 'not_recorded', label: 'Not recorded yet' },
];

export async function getGdprSettings(): Promise<GdprSettings> {
  const data = await fetchJson<{ settings: GdprSettings }>('/api/gdpr/settings');
  return data.settings;
}

export async function saveGdprSettings(payload: Partial<GdprSettings>): Promise<GdprSettings> {
  const data = await fetchJson<{ settings: GdprSettings }>('/api/gdpr/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return data.settings;
}

export async function updateContactGdpr(
  contactId: string,
  payload: {
    gdprLegalBasis?: GdprLegalBasis;
    gdprConsentAt?: string;
    gdprConsentSource?: string;
  }
): Promise<Contact> {
  const data = await fetchJson<{ contact: Contact }>(`/api/gdpr/contacts/${contactId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return data.contact;
}

export async function exportContactGdprData(contactId: string): Promise<Record<string, unknown>> {
  return fetchJson<Record<string, unknown>>(`/api/gdpr/export/${contactId}`);
}

export async function eraseContactGdprData(contactId: string): Promise<{
  message: string;
  contact: Contact;
}> {
  const data = await fetchJson<{ message: string; contact: Contact }>(`/api/gdpr/erase/${contactId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirm: true }),
  });
  return data;
}

export async function runGdprRetention(): Promise<{
  message: string;
  erased: number;
  skippedActive: number;
  skippedRecent: number;
}> {
  return fetchJson('/api/gdpr/retention/run', { method: 'POST' });
}