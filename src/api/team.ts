import { fetchJson } from './fetchJson';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
  active: boolean;
  createdAt: string;
  lastLogin?: string;
}

export async function loginTeam(email: string, password: string): Promise<TeamMember> {
  const data = await fetchJson<{ user: TeamMember }>('/api/team/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return data.user;
}

export async function getTeamMembers(): Promise<TeamMember[]> {
  const data = await fetchJson<{ members: TeamMember[] }>('/api/team');
  return data.members;
}

export async function addTeamMember(payload: {
  name: string;
  email: string;
  password: string;
  role?: 'admin' | 'member';
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
  payload: Partial<{ name: string; email: string; role: 'admin' | 'member'; active: boolean; password: string }>
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