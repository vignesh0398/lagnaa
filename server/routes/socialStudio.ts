import { Router } from 'express';
import multer from 'multer';
import { generateSocialPosts } from '../marketing/socialPostAi.js';
import { generateSocialImage, generateSocialImagesForPlatforms, saveClientLogo } from '../marketing/socialImageGen.js';
import { IMAGE_STYLE_OPTIONS } from '../marketing/socialImageTypes.js';
import type { SocialImageFormat, SocialImageStyle } from '../marketing/socialImageTypes.js';
import {
  createSocialPost,
  deleteSocialPost,
  getSocialConnections,
  getSocialPost,
  listSocialPosts,
  markPostPublished,
  updateSocialConnection,
  updateSocialPost,
} from '../marketing/socialStudioStore.js';
import type { SocialPlatform, SocialPostStatus } from '../marketing/socialStudioTypes.js';

const router = Router();
const logoUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 3 * 1024 * 1024 } });

const PLATFORMS: SocialPlatform[] = ['instagram', 'facebook', 'linkedin', 'x'];
const STYLES: SocialImageStyle[] = IMAGE_STYLE_OPTIONS.map((s) => s.id);

router.get('/image-styles', (_req, res) => {
  res.json({ styles: IMAGE_STYLE_OPTIONS });
});

router.post('/upload-logo', logoUpload.single('logo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Logo file is required.' });
  try {
    const url = saveClientLogo(req.file.buffer, req.file.originalname);
    res.json({ success: true, logoUrl: url });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Upload failed' });
  }
});

router.get('/connections', (_req, res) => {
  res.json({ connections: getSocialConnections() });
});

router.put('/connections/:platform', (req, res) => {
  const platform = req.params.platform as SocialPlatform;
  if (!PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: 'Invalid platform' });
  }
  const { connected, accountName } = req.body as { connected?: boolean; accountName?: string };
  const connection = updateSocialConnection(platform, { connected: !!connected, accountName });
  res.json({ success: true, connection });
});

router.get('/posts', (req, res) => {
  const platform = req.query.platform as SocialPlatform | undefined;
  const status = req.query.status as SocialPostStatus | undefined;
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;
  const posts = listSocialPosts({ platform, status, from, to });
  res.json({ posts, total: posts.length });
});

router.get('/posts/:id', (req, res) => {
  const post = getSocialPost(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  res.json(post);
});

router.post('/posts', (req, res) => {
  const body = req.body as {
    platforms?: SocialPlatform[];
    caption?: string;
    hashtags?: string[];
    linkUrl?: string;
    imageUrl?: string;
    scheduledAt?: string;
    variants?: Record<string, { caption: string; hashtags: string[] }>;
    aiTopic?: string;
    notes?: string;
  };

  if (!body.platforms?.length) {
    return res.status(400).json({ error: 'Select at least one platform.' });
  }
  if (!body.caption?.trim()) {
    return res.status(400).json({ error: 'Caption is required.' });
  }

  const post = createSocialPost({
    platforms: body.platforms,
    caption: body.caption.trim(),
    hashtags: body.hashtags ?? [],
    linkUrl: body.linkUrl,
    imageUrl: body.imageUrl,
    scheduledAt: body.scheduledAt,
    variants: body.variants,
    aiTopic: body.aiTopic,
    notes: body.notes,
  });
  res.json({ success: true, post });
});

router.put('/posts/:id', (req, res) => {
  const post = updateSocialPost(req.params.id, req.body);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  res.json({ success: true, post });
});

router.delete('/posts/:id', (req, res) => {
  if (!deleteSocialPost(req.params.id)) {
    return res.status(404).json({ error: 'Post not found' });
  }
  res.json({ success: true });
});

router.post('/posts/:id/publish', (req, res) => {
  const existing = getSocialPost(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Post not found' });

  const connections = getSocialConnections();
  const disconnected = existing.platforms.filter(
    (p) => !connections.find((c) => c.platform === p)?.connected
  );

  if (disconnected.length === existing.platforms.length) {
    return res.status(400).json({
      error: 'No social accounts connected. Connect Instagram, Facebook, LinkedIn, or X in Social Studio first.',
      disconnected,
    });
  }

  const post = markPostPublished(req.params.id);
  res.json({
    success: true,
    post,
    note:
      disconnected.length > 0
        ? `Published to connected platforms. Not sent to: ${disconnected.join(', ')} (not connected).`
        : 'Marked as published. Live API publishing will activate once platform OAuth is configured.',
  });
});

router.post('/generate-image', async (req, res) => {
  const { topic, platform, format, style, clientName, clientLogoUrl, includeBranding } = req.body as {
    topic?: string;
    platform?: SocialPlatform;
    format?: SocialImageFormat;
    style?: SocialImageStyle;
    clientName?: string;
    clientLogoUrl?: string;
    includeBranding?: boolean;
  };

  if (!topic?.trim()) return res.status(400).json({ error: 'Topic/prompt is required.' });
  if (!platform || !PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: 'Valid platform is required.' });
  }
  const imageStyle = style && STYLES.includes(style) ? style : 'graphic';

  try {
    const result = await generateSocialImage({
      topic: topic.trim(),
      platform,
      format,
      style: imageStyle,
      client: { clientName, clientLogoUrl, includeBranding },
    });
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Image generation failed' });
  }
});

router.post('/generate-images', async (req, res) => {
  const { topic, platforms, style, clientName, clientLogoUrl, includeBranding, instagramFormat } = req.body as {
    topic?: string;
    platforms?: SocialPlatform[];
    style?: SocialImageStyle;
    clientName?: string;
    clientLogoUrl?: string;
    includeBranding?: boolean;
    instagramFormat?: SocialImageFormat;
  };

  if (!topic?.trim()) return res.status(400).json({ error: 'Topic/prompt is required.' });
  const selected = platforms?.filter((p) => PLATFORMS.includes(p)) ?? PLATFORMS;
  const imageStyle = style && STYLES.includes(style) ? style : 'graphic';

  try {
    const images = await generateSocialImagesForPlatforms(topic.trim(), selected, {
      style: imageStyle,
      client: { clientName, clientLogoUrl, includeBranding },
      instagramFormat,
    });
    res.json({ success: true, images });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Image generation failed' });
  }
});

router.post('/generate', async (req, res) => {
  const { topic, platforms, tone, linkUrl, brandName } = req.body as {
    topic?: string;
    platforms?: SocialPlatform[];
    tone?: string;
    linkUrl?: string;
    brandName?: string;
  };

  if (!topic?.trim()) {
    return res.status(400).json({ error: 'Topic is required.' });
  }

  const selected = platforms?.filter((p) => PLATFORMS.includes(p)) ?? PLATFORMS;
  try {
    const result = await generateSocialPosts({
      topic: topic.trim(),
      platforms: selected,
      tone,
      linkUrl,
      brandName,
    });
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Generation failed' });
  }
});

export default router;