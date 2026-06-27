import { MongoClient, ServerApiVersion, type Collection, type Db } from 'mongodb';
import type { TeamUser } from '../teamTypes.js';

const COLLECTION = 'team_users';

let client: MongoClient | null = null;
let db: Db | null = null;
let collection: Collection<TeamUser> | null = null;
let lastMongoError: string | null = null;

function cleanEnvValue(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().replace(/^['"]|['"]$/g, '');
  return trimmed || null;
}

export function normalizeMongoUri(raw: string): string {
  const trimmed = raw.trim().replace(/^['"]|['"]$/g, '');
  if (!trimmed) return trimmed;

  const protoMatch = trimmed.match(/^(mongodb(?:\+srv)?:\/\/)(.+)$/i);
  if (!protoMatch) return trimmed;

  const [, proto, remainder] = protoMatch;
  const atCount = (remainder.match(/@/g) || []).length;
  if (atCount <= 1) return trimmed;

  // Multiple @ means the password still contains a raw @ (e.g. Viki@3198)
  const lastAt = remainder.lastIndexOf('@');
  if (lastAt <= 0) return trimmed;

  const creds = remainder.slice(0, lastAt);
  const hostPart = remainder.slice(lastAt + 1);
  const colonIdx = creds.indexOf(':');
  if (colonIdx <= 0) return trimmed;

  const user = creds.slice(0, colonIdx);
  const password = creds.slice(colonIdx + 1);
  return `${proto}${user}:${encodeURIComponent(password)}@${hostPart}`;
}

export function getMongoUri(): string | null {
  const raw =
    cleanEnvValue(process.env.MONGODB_URI) ||
    cleanEnvValue(process.env.MONGO_URI) ||
    cleanEnvValue(process.env.DATABASE_URL);
  if (!raw) return null;
  return normalizeMongoUri(raw);
}

export function isMongoConfigured(): boolean {
  return Boolean(getMongoUri());
}

export function getLastMongoError(): string | null {
  return lastMongoError;
}

export function friendlyMongoError(message: string | null): string | null {
  if (!message) return null;
  if (message.includes('SSL') || message.includes('tlsv1 alert internal error')) {
    return 'MongoDB SSL blocked — in Atlas go to Network Access and allow 0.0.0.0/0 (Access from anywhere), then redeploy.';
  }
  if (message.includes('bad auth') || message.includes('Authentication failed')) {
    return 'MongoDB login failed — check username/password in lagnaa.env (use %40 instead of @ in password).';
  }
  return message;
}

function mongoClientOptions() {
  return {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
    family: 4 as const,
  };
}

export function clearMongoError(): void {
  lastMongoError = null;
}

export async function connectMongoTeam(): Promise<Collection<TeamUser> | null> {
  const uri = getMongoUri();
  if (!uri) return null;
  if (collection) return collection;

  try {
    client = new MongoClient(uri, mongoClientOptions());
    await client.connect();
    db = client.db();
    collection = db.collection<TeamUser>(COLLECTION);
    await collection.createIndex({ email: 1 }, { unique: true });
    lastMongoError = null;
    return collection;
  } catch (error) {
    lastMongoError = error instanceof Error ? error.message : 'MongoDB connection failed';
    await closeMongoTeam();
    throw error;
  }
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