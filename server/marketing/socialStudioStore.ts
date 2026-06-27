import fs from 'fs';
import path from 'path';
import {
  DEFAULT_CONNECTIONS,
  type SocialConnection,
  type SocialPlatform,
  type SocialPost,
  type SocialPostStatus,
} from './socialStudioTypes.js';

const POSTS_PATH = path.join(process.cwd(), 'server', 'data', 'social-posts.json');
const CONNECTIONS_PATH = path.join(process.cwd(), 'server', 'data', 'social-connections.json');

function loadPosts(): SocialPost[] {
  if (!fs.existsSync(POSTS_PATH)) return [];
  return JSON.parse(fs.readFileSync(POSTS_PATH, 'utf-8')) as SocialPost[];
}

function savePosts(posts: SocialPost[]): void {
  fs.mkdirSync(path.dirname(POSTS_PATH), { recursive: true });
  fs.writeFileSync(POSTS_PATH, JSON.stringify(posts, null, 2));
}

function loadConnections(): SocialConnection[] {
  if (!fs.existsSync(CONNECTIONS_PATH)) return DEFAULT_CONNECTIONS;
  const stored = JSON.parse(fs.readFileSync(CONNECTIONS_PATH, 'utf-8')) as SocialConnection[];
  return DEFAULT_CONNECTIONS.map((def) => stored.find((s) => s.platform === def.platform) ?? def);
}

function saveConnections(connections: SocialConnection[]): void {
  fs.mkdirSync(path.dirname(CONNECTIONS_PATH), { recursive: true });
  fs.writeFileSync(CONNECTIONS_PATH, JSON.stringify(connections, null, 2));
}

export function listSocialPosts(opts?: {
  platform?: SocialPlatform;
  status?: SocialPostStatus;
  from?: string;
  to?: string;
}): SocialPost[] {
  let posts = loadPosts();
  if (opts?.platform) {
    posts = posts.filter((p) => p.platforms.includes(opts.platform!));
  }
  if (opts?.status) {
    posts = posts.filter((p) => p.status === opts.status);
  }
  if (opts?.from) {
    posts = posts.filter((p) => !p.scheduledAt || p.scheduledAt >= opts.from!);
  }
  if (opts?.to) {
    posts = posts.filter((p) => !p.scheduledAt || p.scheduledAt <= opts.to!);
  }
  return posts.sort((a, b) => {
    const aDate = a.scheduledAt ?? a.createdAt;
    const bDate = b.scheduledAt ?? b.createdAt;
    return bDate.localeCompare(aDate);
  });
}

export function getSocialPost(id: string): SocialPost | undefined {
  return loadPosts().find((p) => p.id === id);
}

export function createSocialPost(
  input: Omit<SocialPost, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { status?: SocialPostStatus }
): SocialPost {
  const now = new Date().toISOString();
  const post: SocialPost = {
    id: `soc-${Date.now()}`,
    status: input.status ?? (input.scheduledAt ? 'scheduled' : 'draft'),
    createdAt: now,
    updatedAt: now,
    platforms: input.platforms,
    caption: input.caption,
    hashtags: input.hashtags,
    linkUrl: input.linkUrl,
    imageUrl: input.imageUrl,
    scheduledAt: input.scheduledAt,
    publishedAt: input.publishedAt,
    variants: input.variants,
    aiTopic: input.aiTopic,
    notes: input.notes,
  };
  const posts = loadPosts();
  posts.unshift(post);
  savePosts(posts);
  return post;
}

export function updateSocialPost(id: string, patch: Partial<SocialPost>): SocialPost | undefined {
  const posts = loadPosts();
  const idx = posts.findIndex((p) => p.id === id);
  if (idx < 0) return undefined;
  const next: SocialPost = {
    ...posts[idx],
    ...patch,
    id: posts[idx].id,
    createdAt: posts[idx].createdAt,
    updatedAt: new Date().toISOString(),
  };
  if (patch.scheduledAt && next.status === 'draft') next.status = 'scheduled';
  posts[idx] = next;
  savePosts(posts);
  return next;
}

export function deleteSocialPost(id: string): boolean {
  const posts = loadPosts();
  const next = posts.filter((p) => p.id !== id);
  if (next.length === posts.length) return false;
  savePosts(next);
  return true;
}

export function markPostPublished(id: string): SocialPost | undefined {
  return updateSocialPost(id, {
    status: 'published',
    publishedAt: new Date().toISOString(),
  });
}

export function getSocialConnections(): SocialConnection[] {
  return loadConnections();
}

export function updateSocialConnection(
  platform: SocialPlatform,
  patch: Partial<Pick<SocialConnection, 'connected' | 'accountName'>>
): SocialConnection {
  const connections = loadConnections();
  const idx = connections.findIndex((c) => c.platform === platform);
  const current = connections[idx] ?? DEFAULT_CONNECTIONS.find((c) => c.platform === platform)!;
  const next: SocialConnection = {
    ...current,
    ...patch,
    connectedAt: patch.connected ? new Date().toISOString() : current.connectedAt,
  };
  connections[idx] = next;
  saveConnections(connections);
  return next;
}