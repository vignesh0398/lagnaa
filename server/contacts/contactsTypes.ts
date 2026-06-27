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