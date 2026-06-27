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

export const PLATFORM_META: Record<
  SocialPlatform,
  { label: string; color: string; maxChars: number; maxHashtags: number; hint: string }
> = {
  instagram: {
    label: 'Instagram',
    color: 'from-pink-500 to-purple-600',
    maxChars: 2200,
    maxHashtags: 30,
    hint: 'Visual-first. Strong hook in the first line.',
  },
  facebook: {
    label: 'Facebook',
    color: 'from-blue-600 to-blue-500',
    maxChars: 5000,
    maxHashtags: 10,
    hint: 'Conversational tone with clear CTA.',
  },
  linkedin: {
    label: 'LinkedIn',
    color: 'from-blue-700 to-cyan-600',
    maxChars: 3000,
    maxHashtags: 5,
    hint: 'Professional insight-led copy.',
  },
  x: {
    label: 'X',
    color: 'from-slate-700 to-slate-900',
    maxChars: 280,
    maxHashtags: 3,
    hint: 'Short, punchy, one clear idea.',
  },
};

export const ALL_PLATFORMS: SocialPlatform[] = ['instagram', 'facebook', 'linkedin', 'x'];

async function parseError(res: Response): Promise<string> {
  const data = await res.json().catch(() => ({}));
  return (data as { error?: string }).error || 'Request failed';
}

export async function getSocialConnections(): Promise<SocialConnection[]> {
  const res = await fetch('/api/social/connections');
  if (!res.ok) throw new Error(await parseError(res));
  const data = await res.json();
  return data.connections;
}

export async function updateSocialConnection(
  platform: SocialPlatform,
  patch: { connected: boolean; accountName?: string }
): Promise<SocialConnection> {
  const res = await fetch(`/api/social/connections/${platform}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = await res.json();
  return data.connection;
}

export async function getSocialPosts(opts?: {
  platform?: SocialPlatform;
  status?: SocialPostStatus;
}): Promise<SocialPost[]> {
  const params = new URLSearchParams();
  if (opts?.platform) params.set('platform', opts.platform);
  if (opts?.status) params.set('status', opts.status);
  const q = params.toString() ? `?${params}` : '';
  const res = await fetch(`/api/social/posts${q}`);
  if (!res.ok) throw new Error(await parseError(res));
  const data = await res.json();
  return data.posts;
}

export async function createSocialPost(input: {
  platforms: SocialPlatform[];
  caption: string;
  hashtags: string[];
  linkUrl?: string;
  imageUrl?: string;
  scheduledAt?: string;
  variants?: Partial<Record<SocialPlatform, SocialPostVariant>>;
  aiTopic?: string;
  notes?: string;
}): Promise<SocialPost> {
  const res = await fetch('/api/social/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = await res.json();
  return data.post;
}

export async function updateSocialPost(id: string, patch: Partial<SocialPost>): Promise<SocialPost> {
  const res = await fetch(`/api/social/posts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = await res.json();
  return data.post;
}

export async function deleteSocialPost(id: string): Promise<void> {
  const res = await fetch(`/api/social/posts/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function publishSocialPost(id: string): Promise<{ post: SocialPost; note?: string }> {
  const res = await fetch(`/api/social/posts/${id}/publish`, { method: 'POST' });
  if (!res.ok) throw new Error(await parseError(res));
  const data = await res.json();
  return { post: data.post, note: data.note };
}

export type SocialImageFormat = 'feed' | 'story' | 'landscape';

export type SocialImageStyle =
  | 'graphic'
  | 'infographic'
  | 'checklist'
  | 'brand_graphics'
  | 'before_after'
  | 'typographic_quote'
  | 'text_graphics'
  | 'carousel';

export interface ImageStyleOption {
  id: SocialImageStyle;
  label: string;
  description: string;
}

export interface ClientBrandingInput {
  clientName?: string;
  clientLogoUrl?: string;
  includeBranding?: boolean;
}

export interface CarouselImageItem {
  imageUrl: string;
  filename: string;
  slideIndex: number;
  slideTitle: string;
}

export interface GeneratedSocialImage {
  imageUrl: string;
  filename: string;
  width: number;
  height: number;
  platform: SocialPlatform;
  format: SocialImageFormat;
  style: SocialImageStyle;
  topic: string;
  analysis: string;
  usedGroq: boolean;
  carouselImages?: CarouselImageItem[];
}

export const IMAGE_STYLE_OPTIONS: ImageStyleOption[] = [
  { id: 'graphic', label: 'Graphic Image', description: 'Bold topic visual with icons and key message' },
  { id: 'infographic', label: 'Infographic', description: 'Stats, sections, and data-style layout' },
  { id: 'checklist', label: 'Checklist & Cheat Sheet', description: 'Actionable steps from your topic' },
  { id: 'brand_graphics', label: 'Brand Graphics', description: 'Client-branded promo with topic headline' },
  { id: 'before_after', label: 'Before & After', description: 'Side-by-side transformation' },
  { id: 'typographic_quote', label: 'Typographic Quote', description: 'Large quote on styled background' },
  { id: 'text_graphics', label: 'Text Graphics', description: 'Typography-led message graphic' },
  { id: 'carousel', label: 'Educational Carousel', description: 'Multi-slide educational series' },
];

export async function getImageStyles(): Promise<ImageStyleOption[]> {
  const res = await fetch('/api/social/image-styles');
  if (!res.ok) throw new Error(await parseError(res));
  const data = await res.json();
  return data.styles;
}

export async function uploadClientLogo(file: File): Promise<string> {
  const form = new FormData();
  form.append('logo', file);
  const res = await fetch('/api/social/upload-logo', { method: 'POST', body: form });
  if (!res.ok) throw new Error(await parseError(res));
  const data = await res.json();
  return data.logoUrl as string;
}

export async function generateSocialImage(input: {
  topic: string;
  platform: SocialPlatform;
  style: SocialImageStyle;
  format?: 'feed' | 'story';
  clientName?: string;
  clientLogoUrl?: string;
  includeBranding?: boolean;
}): Promise<GeneratedSocialImage> {
  const res = await fetch('/api/social/generate-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = await res.json();
  return data as GeneratedSocialImage;
}

export async function generateSocialImages(input: {
  topic: string;
  platforms: SocialPlatform[];
  style: SocialImageStyle;
  clientName?: string;
  clientLogoUrl?: string;
  includeBranding?: boolean;
  instagramFormat?: 'feed' | 'story';
}): Promise<Record<SocialPlatform, GeneratedSocialImage>> {
  const res = await fetch('/api/social/generate-images', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = await res.json();
  return data.images;
}

export async function generateSocialPosts(input: {
  topic: string;
  platforms: SocialPlatform[];
  tone?: string;
  linkUrl?: string;
  brandName?: string;
}): Promise<{
  variants: Partial<Record<SocialPlatform, SocialPostVariant>>;
  usedGroq: boolean;
  summary: string;
}> {
  const res = await fetch('/api/social/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = await res.json();
  return {
    variants: data.variants,
    usedGroq: data.usedGroq,
    summary: data.summary,
  };
}