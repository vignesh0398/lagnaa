import { loadGroqApiKey } from '../ai/groq.js';
import { getLlmModel } from '../ai/agentSettings.js';
import type { SocialImageStyle, TopicImageContent, ImagePalette } from './socialImageTypes.js';

const DEFAULT_PALETTE: ImagePalette = {
  primary: '#0f172a',
  secondary: '#1e293b',
  accent: '#3b82f6',
  background: '#0b1220',
};

function parseJson(text: string): Record<string, unknown> | null {
  const t = text.trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(t.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function paletteFromTopic(topic: string): ImagePalette {
  const hash = topic.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const hues = [
    { accent: '#3b82f6', secondary: '#1d4ed8' },
    { accent: '#8b5cf6', secondary: '#6d28d9' },
    { accent: '#06b6d4', secondary: '#0891b2' },
    { accent: '#10b981', secondary: '#059669' },
    { accent: '#f59e0b', secondary: '#d97706' },
    { accent: '#ec4899', secondary: '#db2777' },
  ];
  const pick = hues[hash % hues.length];
  return {
    primary: '#0f172a',
    secondary: pick.secondary,
    accent: pick.accent,
    background: '#080d18',
  };
}

function fallbackContent(topic: string, style: SocialImageStyle): TopicImageContent {
  const palette = paletteFromTopic(topic);
  const title = topic.length > 60 ? topic.slice(0, 57) + '…' : topic;

  const base: TopicImageContent = {
    style,
    topic,
    title,
    subtitle: 'Key insights on this topic',
    palette,
    keywords: topic.split(/\s+/).slice(0, 6),
  };

  switch (style) {
    case 'infographic':
      return {
        ...base,
        stats: [
          { label: 'Impact', value: 'High' },
          { label: 'Priority', value: 'Now' },
          { label: 'ROI', value: '3×' },
        ],
        bullets: [
          `Understand the core of: ${topic}`,
          'Identify quick wins for your audience',
          'Measure results and iterate weekly',
        ],
      };
    case 'checklist':
      return {
        ...base,
        checklistItems: [
          `Research: ${topic}`,
          'Define your target audience',
          'Create a clear action plan',
          'Execute and track metrics',
          'Optimize based on feedback',
        ],
      };
    case 'brand_graphics':
      return {
        ...base,
        highlightText: topic,
        bodyText: 'Everything you need to know — simplified.',
      };
    case 'before_after':
      return {
        ...base,
        beforeTitle: 'Before',
        beforeItems: ['Manual processes', 'Scattered tools', 'Slow results', 'Low visibility'],
        afterTitle: 'After',
        afterItems: [
          `Streamlined approach to ${topic.split(' ').slice(0, 3).join(' ')}`,
          'Unified workflow',
          'Faster outcomes',
          'Clear analytics',
        ],
      };
    case 'typographic_quote':
      return {
        ...base,
        quote: `Success with ${topic.split(' ').slice(0, 5).join(' ')} starts with one clear decision.`,
        quoteAuthor: 'Industry insight',
      };
    case 'text_graphics':
      return {
        ...base,
        highlightText: topic.split(' ').slice(0, 4).join(' ').toUpperCase(),
        bodyText: topic,
      };
    case 'carousel':
      return {
        ...base,
        slides: [
          { title: 'The Problem', body: `Many struggle with ${topic}. Here's why it matters.` },
          { title: 'The Insight', body: 'Understanding the root cause changes everything.', bullets: ['Spot patterns early', 'Focus on outcomes'] },
          { title: 'The Solution', body: `A proven approach to ${topic.split(' ').slice(0, 4).join(' ')}.` },
          { title: 'Action Steps', body: 'Start implementing today:', bullets: ['Audit current state', 'Pick one improvement', 'Measure in 7 days'] },
          { title: 'Takeaway', body: `Master ${topic.split(' ').slice(0, 3).join(' ')} with consistent effort.` },
        ],
      };
    default:
      return {
        ...base,
        bodyText: `Everything you need to know about ${topic}`,
        bullets: ['Clear strategy', 'Practical steps', 'Real results'],
        visualMood: 'modern professional',
      };
  }
}

const STYLE_SCHEMAS: Record<SocialImageStyle, string> = {
  graphic: `{
    "title": "main headline about the topic",
    "subtitle": "supporting line",
    "bodyText": "1-2 sentences about the topic",
    "bullets": ["point 1", "point 2", "point 3"],
    "keywords": ["word1", "word2", "word3"],
    "visualMood": "e.g. tech, wellness, finance",
    "palette": { "accent": "#hex", "secondary": "#hex" }
  }`,
  infographic: `{
    "title": "infographic title",
    "subtitle": "subtitle",
    "stats": [{ "label": "stat name", "value": "number or %" }],
    "bullets": ["insight 1", "insight 2", "insight 3", "insight 4"],
    "palette": { "accent": "#hex", "secondary": "#hex" }
  }`,
  checklist: `{
    "title": "checklist title about topic",
    "subtitle": "optional subtitle",
    "checklistItems": ["actionable step 1", "step 2", "step 3", "step 4", "step 5", "step 6"],
    "palette": { "accent": "#hex", "secondary": "#hex" }
  }`,
  brand_graphics: `{
    "title": "short promo headline",
    "highlightText": "bold highlight phrase from topic",
    "bodyText": "one sentence value prop about the topic",
    "palette": { "accent": "#hex", "secondary": "#hex" }
  }`,
  before_after: `{
    "title": "transformation headline",
    "beforeTitle": "Before",
    "beforeItems": ["pain 1", "pain 2", "pain 3", "pain 4"],
    "afterTitle": "After",
    "afterItems": ["gain 1", "gain 2", "gain 3", "gain 4"],
    "palette": { "accent": "#hex", "secondary": "#hex" }
  }`,
  typographic_quote: `{
    "quote": "powerful quote directly about the topic (max 25 words)",
    "quoteAuthor": "attribution or context",
    "palette": { "accent": "#hex", "secondary": "#hex" }
  }`,
  text_graphics: `{
    "highlightText": "SHORT BOLD PHRASE",
    "bodyText": "supporting message about topic",
    "title": "optional small label",
    "palette": { "accent": "#hex", "secondary": "#hex" }
  }`,
  carousel: `{
    "title": "carousel series title",
    "slides": [
      { "title": "slide title", "body": "2 sentences", "bullets": ["optional"] }
    ],
    "palette": { "accent": "#hex", "secondary": "#hex" }
  }`,
};

function mergeContent(topic: string, style: SocialImageStyle, raw: Record<string, unknown>): TopicImageContent {
  const fallback = fallbackContent(topic, style);
  const pal = (raw.palette as Partial<ImagePalette>) ?? {};
  return {
    ...fallback,
    title: String(raw.title ?? fallback.title),
    subtitle: raw.subtitle ? String(raw.subtitle) : fallback.subtitle,
    stats: (raw.stats as TopicImageContent['stats']) ?? fallback.stats,
    bullets: (raw.bullets as string[]) ?? fallback.bullets,
    checklistItems: (raw.checklistItems as string[]) ?? fallback.checklistItems,
    quote: raw.quote ? String(raw.quote) : fallback.quote,
    quoteAuthor: raw.quoteAuthor ? String(raw.quoteAuthor) : fallback.quoteAuthor,
    beforeTitle: raw.beforeTitle ? String(raw.beforeTitle) : fallback.beforeTitle,
    beforeItems: (raw.beforeItems as string[]) ?? fallback.beforeItems,
    afterTitle: raw.afterTitle ? String(raw.afterTitle) : fallback.afterTitle,
    afterItems: (raw.afterItems as string[]) ?? fallback.afterItems,
    highlightText: raw.highlightText ? String(raw.highlightText) : fallback.highlightText,
    bodyText: raw.bodyText ? String(raw.bodyText) : fallback.bodyText,
    keywords: (raw.keywords as string[]) ?? fallback.keywords,
    slides: (raw.slides as TopicImageContent['slides']) ?? fallback.slides,
    visualMood: raw.visualMood ? String(raw.visualMood) : fallback.visualMood,
    palette: {
      ...fallback.palette,
      accent: pal.accent ?? fallback.palette.accent,
      secondary: pal.secondary ?? fallback.palette.secondary,
    },
  };
}

export async function analyzeTopicForImage(topic: string, style: SocialImageStyle): Promise<{
  content: TopicImageContent;
  usedGroq: boolean;
  analysis: string;
}> {
  const apiKey = loadGroqApiKey();
  const model = getLlmModel();

  if (!apiKey || model === 'builtin-rules') {
    const content = fallbackContent(topic, style);
    return {
      content,
      usedGroq: false,
      analysis: 'Template content generated from topic (connect Groq for deeper analysis).',
    };
  }

  const systemPrompt = `You are a social media visual content strategist. Analyze the user's topic and create image content for style "${style}".
The image must be 100% about the topic — no generic agency names, no "Lagnaa", no unrelated branding.
Return JSON only matching this schema:
${STYLE_SCHEMAS[style]}
Include 4-5 slides for carousel style. All text must directly relate to the topic.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Topic/prompt: ${topic}` },
        ],
        max_tokens: 1400,
        temperature: 0.75,
      }),
    });

    if (!response.ok) throw new Error('Groq failed');
    const data = (await response.json()) as { choices: { message: { content: string } }[] };
    const parsed = parseJson(data.choices[0]?.message?.content ?? '');
    if (!parsed) throw new Error('Invalid JSON');

    const content = mergeContent(topic, style, parsed);
    content.style = style;
    content.topic = topic;

    return {
      content,
      usedGroq: true,
      analysis: `AI analyzed "${topic}" and built ${style} content.`,
    };
  } catch {
    const content = fallbackContent(topic, style);
    return {
      content,
      usedGroq: false,
      analysis: 'Used topic-based template (AI analysis unavailable).',
    };
  }
}