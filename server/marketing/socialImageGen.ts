import fs from 'fs';
import path from 'path';
import { analyzeTopicForImage } from './socialImageContentAi.js';
import { buildImageHtml } from './socialImageTemplates.js';
import {
  PLATFORM_IMAGE_SIZES,
  STORY_SIZE,
  type ClientBrandingInput,
  type SocialImageFormat,
  type SocialImageStyle,
  IMAGE_STYLE_OPTIONS,
} from './socialImageTypes.js';
import type { SocialPlatform } from './socialStudioTypes.js';
import { renderHtmlToPng } from '../utils/renderImage.js';

export type { SocialImageStyle, SocialImageFormat, ClientBrandingInput };
export { PLATFORM_IMAGE_SIZES, STORY_SIZE, IMAGE_STYLE_OPTIONS };

const OUTPUT_DIR = path.join(process.cwd(), 'public', 'social-generated');
const LOGO_DIR = path.join(OUTPUT_DIR, 'logos');

export interface CarouselImageItem {
  imageUrl: string;
  filename: string;
  slideIndex: number;
  slideTitle: string;
}

export interface GenerateSocialImageInput {
  topic: string;
  platform: SocialPlatform;
  style: SocialImageStyle;
  format?: SocialImageFormat;
  client?: ClientBrandingInput;
}

export interface GenerateSocialImageResult {
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

function resolveSize(platform: SocialPlatform, format?: SocialImageFormat) {
  if (platform === 'instagram' && format === 'story') return STORY_SIZE;
  return PLATFORM_IMAGE_SIZES[platform];
}

function brandingInput(client?: ClientBrandingInput): ClientBrandingInput {
  return {
    clientName: client?.clientName?.trim(),
    clientLogoUrl: client?.clientLogoUrl?.trim(),
    includeBranding: client?.includeBranding !== false && !!client?.clientName?.trim(),
  };
}

async function savePng(png: Buffer, platform: SocialPlatform, style: SocialImageStyle, suffix = ''): Promise<{ filename: string; imageUrl: string }> {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const filename = `topic-${platform}-${style}${suffix}-${Date.now()}.png`;
  fs.writeFileSync(path.join(OUTPUT_DIR, filename), png);
  return { filename, imageUrl: `/social-generated/${filename}` };
}

export async function generateSocialImage(input: GenerateSocialImageInput): Promise<GenerateSocialImageResult> {
  const size = resolveSize(input.platform, input.format);
  const branding = brandingInput(input.client);
  const { content, usedGroq, analysis } = await analyzeTopicForImage(input.topic.trim(), input.style);

  const carouselImages: CarouselImageItem[] = [];

  if (input.style === 'carousel' && content.slides?.length) {
    const slides = content.slides.slice(0, 5);
    let primary = { filename: '', imageUrl: '' };

    for (let i = 0; i < slides.length; i++) {
      const html = buildImageHtml(content, branding, size.width, size.height, {
        slide: slides[i],
        index: i,
        total: slides.length,
      });
      const png = await renderHtmlToPng(html, size.width, size.height);
      const saved = await savePng(png, input.platform, input.style, `-s${i + 1}`);
      carouselImages.push({
        imageUrl: saved.imageUrl,
        filename: saved.filename,
        slideIndex: i,
        slideTitle: slides[i].title,
      });
      if (i === 0) primary = saved;
    }

    return {
      imageUrl: primary.imageUrl,
      filename: primary.filename,
      width: size.width,
      height: size.height,
      platform: input.platform,
      format: size.format,
      style: input.style,
      topic: input.topic,
      analysis,
      usedGroq,
      carouselImages,
    };
  }

  const html = buildImageHtml(content, branding, size.width, size.height);
  const png = await renderHtmlToPng(html, size.width, size.height);
  const saved = await savePng(png, input.platform, input.style);

  return {
    imageUrl: saved.imageUrl,
    filename: saved.filename,
    width: size.width,
    height: size.height,
    platform: input.platform,
    format: size.format,
    style: input.style,
    topic: input.topic,
    analysis,
    usedGroq,
  };
}

export async function generateSocialImagesForPlatforms(
  topic: string,
  platforms: SocialPlatform[],
  opts: {
    style: SocialImageStyle;
    client?: ClientBrandingInput;
    instagramFormat?: SocialImageFormat;
  }
): Promise<Record<SocialPlatform, GenerateSocialImageResult>> {
  const results = {} as Record<SocialPlatform, GenerateSocialImageResult>;
  for (const platform of platforms) {
    results[platform] = await generateSocialImage({
      topic,
      platform,
      style: opts.style,
      format: platform === 'instagram' ? opts.instagramFormat ?? 'feed' : undefined,
      client: opts.client,
    });
  }
  return results;
}

export function saveClientLogo(buffer: Buffer, originalName: string): string {
  fs.mkdirSync(LOGO_DIR, { recursive: true });
  const ext = path.extname(originalName).toLowerCase() || '.png';
  const safeExt = ['.png', '.jpg', '.jpeg', '.webp', '.svg'].includes(ext) ? ext : '.png';
  const filename = `client-logo-${Date.now()}${safeExt}`;
  fs.writeFileSync(path.join(LOGO_DIR, filename), buffer);
  return `/social-generated/logos/${filename}`;
}