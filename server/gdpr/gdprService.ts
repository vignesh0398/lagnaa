import { hasActiveCallForContact } from '../ai/conversation.js';
import { anonymizeCallHistoryForPhones } from '../ai/callHistoryStore.js';
import { anonymizeEmailHistoryForAddress } from '../ai/emailChatHistoryStore.js';
import { anonymizeChatHistoryForPhones } from '../ai/whatsappChatHistoryStore.js';
import { getContactConversations } from '../contacts/contactConversations.js';
import { phonesMatch } from '../contacts/contactHelpers.js';
import type { GdprLegalBasis } from '../contacts/gdprContact.js';
import {
  getContactById,
  getContactsConfig,
  listContacts,
  saveContactsConfig,
  updateContact,
} from '../contacts/contactsStore.js';
import type { Contact, ContactsConfig } from '../contacts/contactsTypes.js';

export interface GdprSettings {
  retentionMonths: number;
  companyName: string;
  dpoEmail: string;
}

export function getGdprSettings(): GdprSettings {
  const config = getContactsConfig();
  return {
    retentionMonths: config.gdprRetentionMonths ?? 0,
    companyName: config.gdprCompanyName ?? 'DataCrew',
    dpoEmail: config.gdprDpoEmail ?? '',
  };
}

export function saveGdprSettings(input: Partial<GdprSettings>): GdprSettings {
  const patch: Partial<ContactsConfig> = {};
  if (input.retentionMonths !== undefined) {
    patch.gdprRetentionMonths = Math.max(0, Math.min(120, Math.round(input.retentionMonths)));
  }
  if (input.companyName !== undefined) patch.gdprCompanyName = input.companyName.trim() || 'DataCrew';
  if (input.dpoEmail !== undefined) patch.gdprDpoEmail = input.dpoEmail.trim();
  saveContactsConfig(patch);
  return getGdprSettings();
}

export function updateContactGdprFields(
  contactId: string,
  fields: {
    gdprLegalBasis?: GdprLegalBasis;
    gdprConsentAt?: string;
    gdprConsentSource?: string;
  }
): Contact {
  const existing = getContactById(contactId);
  if (!existing) throw new Error('Contact not found');
  if (existing.gdprErasedAt) throw new Error('Contact was GDPR-erased and cannot be updated.');

  const updated = updateContact(contactId, {
    gdprLegalBasis: fields.gdprLegalBasis,
    gdprConsentAt: fields.gdprConsentAt,
    gdprConsentSource: fields.gdprConsentSource?.trim(),
  });
  if (!updated) throw new Error('Contact update failed');
  return updated;
}

export function exportContactGdprData(contactId: string): Record<string, unknown> {
  const contact = getContactById(contactId);
  if (!contact) throw new Error('Contact not found');

  return {
    exportedAt: new Date().toISOString(),
    purpose: 'GDPR Subject Access Request',
    contact,
    conversations: getContactConversations(contactId),
    settings: getGdprSettings(),
  };
}

function phoneMatcher(contact: Contact): (phone: string) => boolean {
  return (phone: string) =>
    phonesMatch(phone, contact.phone) || (contact.phoneAlt ? phonesMatch(phone, contact.phoneAlt) : false);
}

function emailMatcher(contact: Contact): (email: string) => boolean {
  const norm = contact.email?.trim().toLowerCase();
  return (email: string) => Boolean(norm && email.trim().toLowerCase() === norm);
}

export function eraseContactGdprData(contactId: string): {
  contact: Contact;
  callsAnonymized: number;
  whatsappAnonymized: number;
  emailAnonymized: number;
} {
  const contact = getContactById(contactId);
  if (!contact) throw new Error('Contact not found');
  if (contact.gdprErasedAt) throw new Error('Contact already GDPR-erased.');
  if (hasActiveCallForContact(contactId)) {
    throw new Error('Contact has an active AI call — wait until it ends, then erase again. Ongoing calls are not interrupted.');
  }

  const matchPhone = phoneMatcher(contact);
  const matchEmail = emailMatcher(contact);
  const erasedAt = new Date().toISOString();

  const callsAnonymized = anonymizeCallHistoryForPhones(matchPhone);
  const whatsappAnonymized = anonymizeChatHistoryForPhones(matchPhone);
  const emailAnonymized = contact.email ? anonymizeEmailHistoryForAddress(matchEmail) : 0;

  const tags = [...new Set([...contact.tags.filter((t) => t !== 'gdpr-erased'), 'gdpr-erased'])];
  const updated = updateContact(contactId, {
    name: 'GDPR Erased',
    firstName: 'GDPR',
    middleName: '',
    lastName: 'Erased',
    phone: `erased-${contact.id}`,
    phoneAlt: '',
    email: '',
    dob: '',
    address: '',
    postcode: '',
    company: '',
    notes: '',
    tags,
    dnd: true,
    ghlContactId: undefined,
    gdprErasedAt: erasedAt,
  });
  if (!updated) throw new Error('Failed to erase contact');

  return { contact: updated, callsAnonymized, whatsappAnonymized, emailAnonymized };
}

export function runGdprRetention(): { erased: number; skippedActive: number; skippedRecent: number } {
  const { retentionMonths } = getGdprSettings();
  if (!retentionMonths || retentionMonths < 1) {
    throw new Error('Set retention months (1+) in GDPR settings before running.');
  }

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - retentionMonths);

  let erased = 0;
  let skippedActive = 0;
  let skippedRecent = 0;

  for (const contact of listContacts({ all: true })) {
    if (contact.gdprErasedAt) continue;
    if (new Date(contact.updatedAt) > cutoff) {
      skippedRecent += 1;
      continue;
    }
    if (hasActiveCallForContact(contact.id)) {
      skippedActive += 1;
      continue;
    }
    eraseContactGdprData(contact.id);
    erased += 1;
  }

  return { erased, skippedActive, skippedRecent };
}