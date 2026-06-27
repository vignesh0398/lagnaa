import type { TeamMember } from '../api/team';

/** Paths members can open (prefix match). Admins can access everything. */
export const MEMBER_PATH_PREFIXES = [
  '/home',
  '/dashboard',
  '/contacts',
  '/conversations',
  '/agents',
  '/calls',
  '/whatsapp',
  '/email',
  '/prospects',
  '/maps-leads',
  '/settings/appearance',
] as const;

export function isAdmin(user: Pick<TeamMember, 'role'> | null | undefined): boolean {
  return user?.role === 'admin';
}

export function canMemberAccessPath(pathname: string): boolean {
  return MEMBER_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function canAccessPath(
  user: Pick<TeamMember, 'role'> | null | undefined,
  pathname: string
): boolean {
  if (!user) return false;
  if (isAdmin(user)) return true;
  return canMemberAccessPath(pathname);
}

export const MEMBER_ACCESS_SUMMARY =
  'Members can use Dashboard, Contacts, Conversations, Voice (Agents & Call History), WhatsApp, Email, Prospect Finder, Maps Leads, and Appearance settings. Billing, prompts, connections, and marketing are admin-only.';