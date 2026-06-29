import type { Collection } from 'mongodb';
import type { Contact, ContactsConfig } from '../contacts/contactsTypes.js';
import { getMongoDatabase } from './mongoTeam.js';

const COLLECTION = 'contacts_store';
const DOC_ID = 'default';

export interface ContactsStoreDoc {
  _id: string;
  config: ContactsConfig;
  contacts: Contact[];
  updatedAt: string;
}

async function getCollection(): Promise<Collection<ContactsStoreDoc> | null> {
  const database = await getMongoDatabase();
  if (!database) return null;
  return database.collection<ContactsStoreDoc>(COLLECTION);
}

export async function loadContactsFromMongo(): Promise<ContactsStoreDoc | null> {
  const col = await getCollection();
  if (!col) return null;
  return col.findOne({ _id: DOC_ID });
}

export async function saveContactsToMongo(config: ContactsConfig, contacts: Contact[]): Promise<void> {
  const col = await getCollection();
  if (!col) return;
  await col.updateOne(
    { _id: DOC_ID },
    {
      $set: {
        config,
        contacts,
        updatedAt: new Date().toISOString(),
      },
    },
    { upsert: true }
  );
}