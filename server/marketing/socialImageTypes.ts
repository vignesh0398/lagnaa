import type { SocialPlatform } from './socialStudioTypes.js';

export type SocialImageStyle =
  | 'graphic'
  | 'infographic'
  | 'checklist'
  | 'brand_graphics'
  | 'before_after'
  | 'typographic_quote'
  | 'text_graphics'
  | 'carousel';

export type SocialImageFormat = 'feed' | 'story' | 'landscape';

export interface ClientBrandingInput {
  clientName?: string;
  clientLogoUrl?: string;
  includeBranding?: boolean;
}

export interface ImagePalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
}

export interface CarouselSlide {
  title: string;
  body: string;
  bullets?: string[];
}

export interface TopicImageContent {
  style: SocialImageStyle;
  topic: string;
  title: string;
  subtitle?: string;
  palette: ImagePalette;
  stats?: { label: string; value: string }[];
  bullets?: string[];
  checklistItems?: string[];
  quote?: string;
  quoteAuthor?: string;
  beforeTitle?: string;
  beforeItems?: string[];
  afterTitle?: string;
  afterItems?: string[];
  highlightText?: string;
  bodyText?: string;
  keywords?: string[];
  slides?: CarouselSlide[];
  visualMood?: string;
}

export interface SocialImageSize {
  width: number;
  height: number;
  format: SocialImageFormat;
  label: string;
}

export const PLATFORM_IMAGE_SIZES: Record<SocialPlatform, SocialImageSize> = {
  instagram: { width: 1080, height: 1080, format: 'feed', label: 'Instagram Feed 1:1' },
  facebook: { width: 1200, height: 630, format: 'landscape', label: 'Facebook 1.91:1' },
  linkedin: { width: 1200, height: 627, format: 'landscape', label: 'LinkedIn 1.91:1' },
  x: { width: 1200, height: 675, format: 'landscape', label: 'X 16:9' },
};

export const STORY_SIZE: SocialImageSize = {
  width: 1080,
  height: 1920,
  format: 'story',
  label: 'Instagram Story 9:16',
};

export const IMAGE_STYLE_OPTIONS: {
  id: SocialImageStyle;
  label: string;
  description: string;
}[] = [
  { id: 'graphic', label: 'Graphic Image', description: 'Bold topic visual with icons and key message' },
  { id: 'infographic', label: 'Infographic', description: 'Stats, sections, and data-style layout' },
  { id: 'checklist', label: 'Checklist & Cheat Sheet', description: 'Actionable steps pulled from your topic' },
  { id: 'brand_graphics', label: 'Brand Graphics', description: 'Client-branded promo with topic headline' },
  { id: 'before_after', label: 'Before & After', description: 'Transformation comparison related to topic' },
  { id: 'typographic_quote', label: 'Typographic Quote', description: 'Large quote typography on styled background' },
  { id: 'text_graphics', label: 'Text Graphics', description: 'Typography-led message graphic' },
  { id: 'carousel', label: 'Educational Carousel', description: 'Multi-slide educational series (4–5 slides)' },
];