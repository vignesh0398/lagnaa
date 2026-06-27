import type { Contact } from './contactsTypes.js';

export type GdprLegalBasis =
  | 'consent'
  | 'contract'
  | 'legitimate_interest'
  | 'legal_obligation'
  | 'vital_interest'
  | 'public_task'
  | 'not_recorded';

export const GDPR_LEGAL_BASES: { id: GdprLegalBasis; label: string }[] = [
  { id: 'consent', label: 'Consent' },
  { id: 'contract', label: 'Contract' },
  { id: 'legitimate_interest', label: 'Legitimate interest' },
  { id: 'legal_obligation', label: 'Legal obligation' },
  { id: 'vital_interest', label: 'Vital interest' },
  { id: 'public_task', label: 'Public task' },
  { id: 'not_recorded', label: 'Not recorded yet' },
];

export function isContactGdprErased(contact: Pick<Contact, 'gdprErasedAt'> | null | undefined): boolean {
  return Boolean(contact?.gdprErasedAt);
}

export function canStartNewOutreach(contact: Contact): boolean {
  if (contact.dnd) return false;
  if (isContactGdprErased(contact)) return false;
  return true;
}