export type SocialPlatform = 'instagram' | 'facebook' | 'linkedin' | 'x';

export type SocialPostStatus = 'draft' | 'scheduled' | 'published' | 'failed';

export interface SocialPostVariant {
  caption: string;
  hashtags: string[];
}

export interface SocialPost {
  id: string;
  platforms: SocialPlatform[];
  caption: string;
  hashtags: string[];
  linkUrl?: string;
  imageUrl?: string;
  status: SocialPostStatus;
  scheduledAt?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  variants?: Partial<Record<SocialPlatform, SocialPostVariant>>;
  aiTopic?: string;
  notes?: string;
}

export interface SocialConnection {
  platform: SocialPlatform;
  connected: boolean;
  accountName?: string;
  connectedAt?: string;
  setupHint: string;
}

export const PLATFORM_LIMITS: Record<
  SocialPlatform,
  { label: string; maxChars: number; maxHashtags: number; hint: string }
> = {
  instagram: {
    label: 'Instagram',
    maxChars: 2200,
    maxHashtags: 30,
    hint: 'Visual-first. Strong hook in the first line. 5–15 hashtags.',
  },
  facebook: {
    label: 'Facebook',
    maxChars: 5000,
    maxHashtags: 10,
    hint: 'Conversational tone. Questions and CTAs work well.',
  },
  linkedin: {
    label: 'LinkedIn',
    maxChars: 3000,
    maxHashtags: 5,
    hint: 'Professional. Lead with insight, end with a clear CTA.',
  },
  x: {
    label: 'X (Twitter)',
    maxChars: 280,
    maxHashtags: 3,
    hint: 'Punchy and concise. One idea per post.',
  },
};

export const DEFAULT_CONNECTIONS: SocialConnection[] = [
  {
    platform: 'instagram',
    connected: false,
    setupHint: 'Connect via Meta Business Suite (Instagram Graph API).',
  },
  {
    platform: 'facebook',
    connected: false,
    setupHint: 'Connect via Meta Business Suite (Pages API).',
  },
  {
    platform: 'linkedin',
    connected: false,
    setupHint: 'Connect via LinkedIn Marketing Developer Platform.',
  },
  {
    platform: 'x',
    connected: false,
    setupHint: 'Connect via X API v2 (OAuth 2.0).',
  },
];