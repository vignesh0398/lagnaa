import { loadGroqApiKey } from '../ai/groq.js';
import { getLlmModel } from '../ai/agentSettings.js';
import { PLATFORM_LIMITS, type SocialPlatform, type SocialPostVariant } from './socialStudioTypes.js';

export interface GenerateSocialPostsInput {
  topic: string;
  platforms: SocialPlatform[];
  tone?: string;
  linkUrl?: string;
  brandName?: string;
}

export interface GenerateSocialPostsResult {
  variants: Partial<Record<SocialPlatform, SocialPostVariant>>;
  usedGroq: boolean;
  summary: string;
}

function fallbackVariant(platform: SocialPlatform, topic: string, brandName: string): SocialPostVariant {
  const limits = PLATFORM_LIMITS[platform];
  const base = `${brandName}: ${topic}`;
  const hashtags =
    platform === 'linkedin'
      ? ['#BusinessGrowth', '#Marketing']
      : platform === 'x'
        ? ['#Growth']
        : ['#Marketing', '#Business', '#Growth'];

  let caption = base;
  if (platform === 'linkedin') {
    caption = `${topic}\n\nAt ${brandName}, we help businesses grow across voice, WhatsApp, email, and social.\n\nLearn more — link in comments.`;
  } else if (platform === 'instagram') {
    caption = `✨ ${topic}\n\nTap the link in bio to get started with ${brandName}.`;
  } else if (platform === 'facebook') {
    caption = `${topic} — see how ${brandName} unifies your customer channels in one platform. Comment below or visit our site!`;
  } else {
    caption = `${topic.slice(0, 200)} — ${brandName}`;
  }

  if (caption.length > limits.maxChars) {
    caption = caption.slice(0, limits.maxChars - 3) + '...';
  }

  return { caption, hashtags: hashtags.slice(0, limits.maxHashtags) };
}

function parseAiJson(text: string): Record<string, { caption?: string; hashtags?: string[] }> | null {
  const trimmed = text.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, { caption?: string; hashtags?: string[] }>;
  } catch {
    return null;
  }
}

function clampVariant(platform: SocialPlatform, raw: SocialPostVariant): SocialPostVariant {
  const limits = PLATFORM_LIMITS[platform];
  let caption = raw.caption.trim();
  if (caption.length > limits.maxChars) {
    caption = caption.slice(0, limits.maxChars - 1) + '…';
  }
  const hashtags = raw.hashtags
    .map((h) => (h.startsWith('#') ? h : `#${h}`))
    .slice(0, limits.maxHashtags);
  return { caption, hashtags };
}

export async function generateSocialPosts(input: GenerateSocialPostsInput): Promise<GenerateSocialPostsResult> {
  const brandName = input.brandName?.trim() || 'Lagnaa One';
  const tone = input.tone?.trim() || 'professional, modern, confident';
  const platforms = input.platforms.length ? input.platforms : (['instagram', 'facebook', 'linkedin', 'x'] as SocialPlatform[]);

  const apiKey = loadGroqApiKey();
  const model = getLlmModel();

  if (!apiKey || model === 'builtin-rules') {
    const variants: Partial<Record<SocialPlatform, SocialPostVariant>> = {};
    for (const p of platforms) {
      variants[p] = fallbackVariant(p, input.topic, brandName);
    }
    return {
      variants,
      usedGroq: false,
      summary: 'Generated template posts (connect Groq in Connections for AI-written copy).',
    };
  }

  const platformSpec = platforms
    .map((p) => {
      const l = PLATFORM_LIMITS[p];
      return `${p}: max ${l.maxChars} chars, max ${l.maxHashtags} hashtags — ${l.hint}`;
    })
    .join('\n');

  const systemPrompt = `You are a social media copywriter for ${brandName} ("One hive, infinite growth").
Write platform-native posts. Tone: ${tone}.
Return JSON only:
{
  "summary": "one sentence overview",
  "variants": {
    "instagram": { "caption": "...", "hashtags": ["#tag"] },
    "facebook": { "caption": "...", "hashtags": ["#tag"] },
    "linkedin": { "caption": "...", "hashtags": ["#tag"] },
    "x": { "caption": "...", "hashtags": ["#tag"] }
  }
}
Only include keys for requested platforms.`;

  const userPrompt = [
    `Topic: ${input.topic}`,
    input.linkUrl ? `Link to include: ${input.linkUrl}` : '',
    `Platforms:\n${platformSpec}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 1200,
        temperature: 0.75,
      }),
    });

    if (!response.ok) throw new Error('Groq request failed');
    const data = (await response.json()) as { choices: { message: { content: string } }[] };
    const content = data.choices[0]?.message?.content ?? '';
    const parsed = parseAiJson(content) as {
      summary?: string;
      variants?: Record<string, SocialPostVariant>;
    } | null;

    const variants: Partial<Record<SocialPlatform, SocialPostVariant>> = {};
    for (const p of platforms) {
      const raw = parsed?.variants?.[p];
      variants[p] = clampVariant(
        p,
        raw?.caption
          ? { caption: raw.caption, hashtags: raw.hashtags ?? [] }
          : fallbackVariant(p, input.topic, brandName)
      );
    }

    return {
      variants,
      usedGroq: true,
      summary: parsed?.summary ?? 'AI posts generated for selected platforms.',
    };
  } catch {
    const variants: Partial<Record<SocialPlatform, SocialPostVariant>> = {};
    for (const p of platforms) {
      variants[p] = fallbackVariant(p, input.topic, brandName);
    }
    return {
      variants,
      usedGroq: false,
      summary: 'Used fallback templates (AI request failed).',
    };
  }
}