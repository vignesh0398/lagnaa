import { fetchJson } from './fetchJson';
import type { MemberFeature } from '../utils/memberFeatures';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
  active: boolean;
  createdAt: string;
  lastLogin?: string;
  features?: MemberFeature[];
}

export async function loginTeam(email: string, password: string): Promise<TeamMember> {
  const data = await fetchJson<{ user: TeamMember }>('/api/team/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return data.user;
}

export interface TeamPersistenceInfo {
  mode: 'mongo' | 'file';
  durable: boolean;
}

export async function getTeamMembers(): Promise<{
  members: TeamMember[];
  persistence: TeamPersistenceInfo;
}> {
  return fetchJson<{ members: TeamMember[]; persistence: TeamPersistenceInfo }>('/api/team');
}

export async function exportTeamBackup(): Promise<{ exportedAt: string; members: unknown[] }> {
  return fetchJson<{ exportedAt: string; members: unknown[] }>('/api/team/backup');
}

export async function restoreTeamBackup(members: unknown[]): Promise<{ members: TeamMember[]; message: string }> {
  const data = await fetchJson<{ members: TeamMember[]; message: string }>('/api/team/restore', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ members }),
  });
  return data;
}

export async function addTeamMember(payload: {
  name: string;
  email: string;
  password: string;
  role?: 'admin' | 'member';
  features?: MemberFeature[];
}): Promise<TeamMember> {
  const data = await fetchJson<{ member: TeamMember }>('/api/team', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return data.member;
}

export async function updateTeamMember(
  id: string,
  payload: Partial<{
    name: string;
    email: string;
    role: 'admin' | 'member';
    active: boolean;
    password: string;
    features: MemberFeature[];
  }>
): Promise<TeamMember> {
  const data = await fetchJson<{ member: TeamMember }>(`/api/team/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return data.member;
}

export async function removeTeamMember(id: string): Promise<void> {
  await fetchJson(`/api/team/${id}`, { method: 'DELETE' });
}

export async function getProfile(userId: string): Promise<TeamMember> {
  const data = await fetchJson<{ member: TeamMember }>(`/api/team/profile/${userId}`);
  return data.member;
}

export async function updateProfile(payload: {
  userId: string;
  name?: string;
  email?: string;
}): Promise<TeamMember> {
  const data = await fetchJson<{ member: TeamMember }>('/api/team/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return data.member;
}

export async function changePassword(payload: {
  userId: string;
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  await fetchJson('/api/team/profile/password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}