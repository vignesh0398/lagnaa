import { getGhlConfig } from './ghlStore.js';
import { readContactField, readContactName, type GhlContact } from './ghlClient.js';

export interface GhlCallContactData {
  contactId: string;
  clientName: string;
  phone: string;
  clientDob?: string;
  clientPostcode?: string;
  missing: string[];
}

export function extractGhlContactForCall(contact: GhlContact): GhlCallContactData {
  const config = getGhlConfig();
  const mapping = config.fieldMapping;

  const clientName = readContactName(contact, mapping.nameField);
  const phone = contact.phone?.trim() ?? '';
  const clientDob = readContactField(contact, mapping.dobField);
  const clientPostcode = readContactField(contact, mapping.postcodeField);

  const missing: string[] = [];
  if (!phone) missing.push('phone');
  if (!clientName || clientName === 'the client') missing.push('name');
  if (!clientDob) missing.push('date of birth');
  if (!clientPostcode) missing.push('postcode');

  return {
    contactId: contact.id,
    clientName,
    phone,
    clientDob,
    clientPostcode,
    missing,
  };
}