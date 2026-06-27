import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

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
}

const TEAM_PATH = path.join(process.cwd(), 'server', 'data', 'team.json');

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
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
  return loadAll().map(({ passwordHash: _, ...user }) => user);
}

export function authenticate(email: string, password: string): Omit<TeamUser, 'passwordHash'> | null {
  const users = loadAll();
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.active);
  if (!user || user.passwordHash !== hashPassword(password)) return null;

  user.lastLogin = new Date().toISOString();
  saveAll(users);

  const { passwordHash: _, ...safe } = user;
  return safe;
}

export function createMember(input: {
  name: string;
  email: string;
  password: string;
  role?: TeamRole;
}): Omit<TeamUser, 'passwordHash'> {
  const users = loadAll();
  if (users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
    throw new Error('Email already exists.');
  }

  const user: TeamUser = {
    id: `user-${Date.now()}`,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    passwordHash: hashPassword(input.password),
    role: input.role ?? 'member',
    active: true,
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  saveAll(users);

  const { passwordHash: _, ...safe } = user;
  return safe;
}

export function getMemberById(id: string): Omit<TeamUser, 'passwordHash'> | null {
  const user = loadAll().find((u) => u.id === id);
  if (!user) return null;
  const { passwordHash: _, ...safe } = user;
  return safe;
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
  const { passwordHash: _, ...safe } = user;
  return safe;
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
  updates: Partial<Pick<TeamUser, 'name' | 'email' | 'role' | 'active'>> & { password?: string }
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
  if (updates.password) user.passwordHash = hashPassword(updates.password);

  saveAll(users);
  const { passwordHash: _, ...safe } = user;
  return safe;
}

export function deleteMember(id: string): void {
  const users = loadAll();
  const user = users.find((u) => u.id === id);
  if (!user) throw new Error('User not found');
  if (user.role === 'admin') throw new Error('Cannot delete admin account. Demote or deactivate instead.');

  saveAll(users.filter((u) => u.id !== id));
}