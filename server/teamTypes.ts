import type { MemberFeature } from './memberFeatures.js';

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

export type PublicTeamUser = Omit<TeamUser, 'passwordHash'>;