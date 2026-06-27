import { MongoClient, type Collection, type Db } from 'mongodb';
import type { TeamUser } from '../teamTypes.js';

const COLLECTION = 'team_users';

let client: MongoClient | null = null;
let db: Db | null = null;
let collection: Collection<TeamUser> | null = null;

export function getMongoUri(): string | null {
  const uri =
    process.env.MONGODB_URI?.trim() ||
    process.env.MONGO_URI?.trim() ||
    process.env.DATABASE_URL?.trim();
  return uri || null;
}

export function isMongoConfigured(): boolean {
  return Boolean(getMongoUri());
}

export async function connectMongoTeam(): Promise<Collection<TeamUser> | null> {
  const uri = getMongoUri();
  if (!uri) return null;
  if (collection) return collection;

  client = new MongoClient(uri);
  await client.connect();
  db = client.db();
  collection = db.collection<TeamUser>(COLLECTION);
  await collection.createIndex({ email: 1 }, { unique: true });
  return collection;
}

export async function loadTeamFromMongo(): Promise<TeamUser[]> {
  const col = await connectMongoTeam();
  if (!col) return [];
  return col.find({}).sort({ createdAt: 1 }).toArray();
}

export async function saveTeamToMongo(users: TeamUser[]): Promise<void> {
  const col = await connectMongoTeam();
  if (!col) return;
  await col.deleteMany({});
  if (users.length) {
    await col.insertMany(users);
  }
}

export async function closeMongoTeam(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    collection = null;
  }
}