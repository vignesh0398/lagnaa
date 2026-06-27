import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  normalizeMemberFeatures,
  validateFeatureList,
  type MemberFeature,
} from './memberFeatures.js';

export type TeamRole = 'admin' | 'member';

export interface TeamUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: TeamRole;
  active: boolean;
  createdAt: string;
  lastLogin?: string;
  features?: MemberFeature[];
}

function toPublicUser(user: TeamUser): Omit<TeamUser, 'passwordHash'> {
  const { passwordHash: _, ...safe } = user;
  if (safe.role === 'member') {
    safe.features = normalizeMemberFeatures(safe.features);
  } else {
    delete safe.features;
  }
  return safe;
}

const TEAM_PATH = path.join(process.cwd(), 'server', 'data', 'team.json');

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

function loadAll(): TeamUser[] {
  if (!fs.existsSync(TEAM_PATH)) {
    const initial = [defaultAdmin()];
    saveAll(initial);
    return initial;
  }
  return JSON.parse(fs.readFileSync(TEAM_PATH, 'utf-8')) as TeamUser[];
}

function saveAll(users: TeamUser[]): void {
  fs.mkdirSync(path.dirname(TEAM_PATH), { recursive: true });
  fs.writeFileSync(TEAM_PATH, JSON.stringify(users, null, 2));
}

export function listTeam(): Omit<TeamUser, 'passwordHash'>[] {
  return loadAll().map((user) => toPublicUser(user));
}

export function authenticate(email: string, password: string): Omit<TeamUser, 'passwordHash'> | null {
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
}): Omit<TeamUser, 'passwordHash'> {
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

export function getMemberById(id: string): Omit<TeamUser, 'passwordHash'> | null {
  const user = loadAll().find((u) => u.id === id);
  if (!user) return null;
  return toPublicUser(user);
}

export function updateProfile(
  id: string,
  updates: { name?: string; email?: string }
): Omit<TeamUser, 'passwordHash'> {
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
): Omit<TeamUser, 'passwordHash'> {
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