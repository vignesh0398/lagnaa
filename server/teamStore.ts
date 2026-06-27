import fs from 'fs';
import crypto from 'crypto';
import {
  normalizeMemberFeatures,
  validateFeatureList,
  type MemberFeature,
} from './memberFeatures.js';
import {
  clearMongoError,
  closeMongoTeam,
  getLastMongoError,
  isMongoConfigured,
  loadTeamFromMongo,
  saveTeamToMongo,
} from './db/mongoTeam.js';
import { getTeamFilePath } from './utils/dataPath.js';
import type { PublicTeamUser, TeamRole, TeamUser } from './teamTypes.js';

export type { TeamRole, TeamUser, PublicTeamUser };

export type TeamPersistenceMode = 'mongo' | 'file';

let usersCache: TeamUser[] | null = null;
let persistenceMode: TeamPersistenceMode = 'file';
let mongoInitError: string | null = null;

function toPublicUser(user: TeamUser): PublicTeamUser {
  const { passwordHash: _, ...safe } = user;
  if (safe.role === 'member') {
    safe.features = normalizeMemberFeatures(safe.features);
  } else {
    delete safe.features;
  }
  return safe;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizePassword(password: string): string {
  return password.trim();
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(normalizePassword(password)).digest('hex');
}

function defaultAdmin(): TeamUser {
  return {
    id: 'admin-1',
    name: 'Admin',
    email: 'admin@datacrew.ai',
    passwordHash: hashPassword('admin123'),
    role: 'admin',
    active: true,
    createdAt: new Date().toISOString(),
  };
}

function readTeamFile(): TeamUser[] | null {
  const filePath = getTeamFilePath();
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as TeamUser[];
  } catch {
    return null;
  }
}

function writeTeamFile(users: TeamUser[]): void {
  const filePath = getTeamFilePath();
  fs.writeFileSync(filePath, JSON.stringify(users, null, 2));
}

function parseBackupUsers(raw: unknown): TeamUser[] {
  if (!Array.isArray(raw)) throw new Error('Backup must be a JSON array of team members.');
  return raw.map((entry) => {
    if (!entry || typeof entry !== 'object') {
      throw new Error('Invalid team member entry in backup.');
    }
    const user = entry as Partial<TeamUser>;
    if (!user.id || !user.name || !user.email || !user.passwordHash || !user.role) {
      throw new Error('Backup is missing required team member fields.');
    }
    return {
      id: String(user.id),
      name: String(user.name).trim(),
      email: normalizeEmail(String(user.email)),
      passwordHash: String(user.passwordHash),
      role: user.role === 'admin' ? 'admin' : 'member',
      active: user.active !== false,
      createdAt: user.createdAt ?? new Date().toISOString(),
      lastLogin: user.lastLogin,
      features: user.role === 'member' ? normalizeMemberFeatures(user.features) : undefined,
    };
  });
}

function restoreFromEnvBackup(): TeamUser[] | null {
  const raw = process.env.TEAM_BACKUP_JSON?.trim();
  if (!raw) return null;
  try {
    return parseBackupUsers(JSON.parse(raw));
  } catch (error) {
    console.warn('[Team] TEAM_BACKUP_JSON is invalid:', error instanceof Error ? error.message : error);
    return null;
  }
}

function loadAll(): TeamUser[] {
  if (!usersCache) {
    throw new Error('Team store not initialized. Call initTeamStore() on server startup.');
  }
  return usersCache;
}

function saveAll(users: TeamUser[]): void {
  usersCache = users;
  if (persistenceMode === 'mongo') {
    void saveTeamToMongo(users).catch((error) => {
      console.error('[Team] Mongo save failed:', error);
    });
    return;
  }
  writeTeamFile(users);
}

export function getTeamPersistenceMode(): TeamPersistenceMode {
  return persistenceMode;
}

export function isTeamPersistenceDurable(): boolean {
  return persistenceMode === 'mongo' || Boolean(process.env.DATA_DIR?.trim());
}

export function getMongoInitError(): string | null {
  return mongoInitError || getLastMongoError();
}

async function initMongoStore(): Promise<boolean> {
  clearMongoError();
  mongoInitError = null;
  persistenceMode = 'mongo';

  const fromMongo = await loadTeamFromMongo();
  if (fromMongo.length) {
    usersCache = fromMongo;
    console.log(`[Team] Loaded ${fromMongo.length} member(s) from MongoDB`);
    return true;
  }

  const fromFile = readTeamFile();
  if (fromFile?.length) {
    usersCache = fromFile;
    await saveTeamToMongo(fromFile);
    console.log(`[Team] Migrated ${fromFile.length} member(s) from file to MongoDB`);
    return true;
  }

  const fromEnv = restoreFromEnvBackup();
  if (fromEnv?.length) {
    usersCache = fromEnv;
    await saveTeamToMongo(fromEnv);
    console.log(`[Team] Restored ${fromEnv.length} member(s) from TEAM_BACKUP_JSON into MongoDB`);
    return true;
  }

  usersCache = [defaultAdmin()];
  await saveTeamToMongo(usersCache);
  console.log('[Team] Created default admin in MongoDB');
  return true;
}

export async function initTeamStore(): Promise<void> {
  if (isMongoConfigured()) {
    try {
      const ok = await initMongoStore();
      if (ok) return;
    } catch (error) {
      mongoInitError = error instanceof Error ? error.message : 'MongoDB init failed';
      console.error('[Team] MongoDB init failed, using temporary file storage:', mongoInitError);
      persistenceMode = 'file';
      await closeMongoTeam();
    }
  }

  persistenceMode = 'file';
  const fromFile = readTeamFile();
  if (fromFile?.length) {
    usersCache = fromFile;
    console.log(`[Team] Loaded ${fromFile.length} member(s) from file`);
    return;
  }

  const fromEnv = restoreFromEnvBackup();
  if (fromEnv?.length) {
    usersCache = fromEnv;
    writeTeamFile(fromEnv);
    console.log(`[Team] Restored ${fromEnv.length} member(s) from TEAM_BACKUP_JSON`);
    return;
  }

  usersCache = [defaultAdmin()];
  writeTeamFile(usersCache);
  console.log('[Team] Created default admin file store');
}

export function exportTeamBackup(): TeamUser[] {
  return loadAll().map((user) => ({ ...user }));
}

export function restoreTeamBackup(raw: unknown): PublicTeamUser[] {
  const users = parseBackupUsers(raw);
  if (!users.some((u) => u.role === 'admin' && u.active)) {
    throw new Error('Backup must include at least one active admin account.');
  }
  saveAll(users);
  return users.map((user) => toPublicUser(user));
}

export function listTeam(): PublicTeamUser[] {
  return loadAll().map((user) => toPublicUser(user));
}

export function authenticate(email: string, password: string): PublicTeamUser | null {
  const users = loadAll();
  const normalizedEmail = normalizeEmail(email);
  const normalizedPassword = normalizePassword(password);
  if (!normalizedEmail || !normalizedPassword) return null;

  const user = users.find((u) => u.email === normalizedEmail && u.active);
  if (!user || user.passwordHash !== hashPassword(normalizedPassword)) return null;

  user.lastLogin = new Date().toISOString();
  saveAll(users);

  return toPublicUser(user);
}

export function createMember(input: {
  name: string;
  email: string;
  password: string;
  role?: TeamRole;
  features?: MemberFeature[];
}): PublicTeamUser {
  const users = loadAll();
  const email = normalizeEmail(input.email);
  const password = normalizePassword(input.password);
  if (!email) throw new Error('Email is required.');
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }
  if (users.some((u) => u.email === email)) {
    throw new Error('Email already exists.');
  }

  const role = input.role ?? 'member';
  const user: TeamUser = {
    id: `user-${Date.now()}`,
    name: input.name.trim(),
    email,
    passwordHash: hashPassword(password),
    role,
    active: true,
    createdAt: new Date().toISOString(),
    features: role === 'member' ? validateFeatureList(input.features) : undefined,
  };

  users.push(user);
  saveAll(users);

  return toPublicUser(user);
}

export function getMemberById(id: string): PublicTeamUser | null {
  const user = loadAll().find((u) => u.id === id);
  if (!user) return null;
  return toPublicUser(user);
}

export function updateProfile(
  id: string,
  updates: { name?: string; email?: string }
): PublicTeamUser {
  const users = loadAll();
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) throw new Error('User not found');

  const user = users[index];
  if (updates.email?.trim()) {
    const email = updates.email.trim().toLowerCase();
    if (users.some((u) => u.id !== id && u.email === email)) {
      throw new Error('Email already in use.');
    }
    user.email = email;
  }
  if (updates.name?.trim()) user.name = updates.name.trim();

  saveAll(users);
  return toPublicUser(user);
}

export function changePassword(
  id: string,
  currentPassword: string,
  newPassword: string
): void {
  if (!newPassword || newPassword.length < 6) {
    throw new Error('New password must be at least 6 characters.');
  }

  const users = loadAll();
  const user = users.find((u) => u.id === id);
  if (!user) throw new Error('User not found');
  if (user.passwordHash !== hashPassword(currentPassword)) {
    throw new Error('Current password is incorrect.');
  }

  user.passwordHash = hashPassword(newPassword);
  saveAll(users);
}

export function updateMember(
  id: string,
  updates: Partial<Pick<TeamUser, 'name' | 'email' | 'role' | 'active' | 'features'>> & { password?: string }
): PublicTeamUser {
  const users = loadAll();
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) throw new Error('User not found');
  if (users[index].role === 'admin' && updates.role === 'member' && users.filter((u) => u.role === 'admin' && u.active).length <= 1) {
    throw new Error('Cannot demote the only admin.');
  }

  const user = users[index];
  if (updates.name) user.name = updates.name.trim();
  if (updates.email) user.email = updates.email.trim().toLowerCase();
  if (updates.role) user.role = updates.role;
  if (updates.active !== undefined) user.active = updates.active;
  if (updates.password) {
    const next = normalizePassword(updates.password);
    if (!next || next.length < 6) throw new Error('Password must be at least 6 characters.');
    user.passwordHash = hashPassword(next);
  }
  if (updates.features !== undefined) {
    if (user.role !== 'member') {
      throw new Error('Features can only be set for member accounts.');
    }
    user.features = validateFeatureList(updates.features);
  }
  if (updates.role === 'admin') {
    delete user.features;
  }
  if (updates.role === 'member' && !user.features?.length) {
    user.features = normalizeMemberFeatures(undefined);
  }

  saveAll(users);
  return toPublicUser(user);
}

export function deleteMember(id: string): void {
  const users = loadAll();
  const user = users.find((u) => u.id === id);
  if (!user) throw new Error('User not found');
  if (user.role === 'admin') throw new Error('Cannot delete admin account. Demote or deactivate instead.');

  saveAll(users.filter((u) => u.id !== id));
}