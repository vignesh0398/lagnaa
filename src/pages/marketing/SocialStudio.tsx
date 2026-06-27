import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AtSign,
  Briefcase,
  Calendar,
  Camera,
  CheckCircle2,
  Globe,
  Link2,
  Image,
  Loader2,
  Plug,
  Plus,
  Send,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { StatCard } from '../../components/ui/StatCard';
import { SocialPostPreview } from '../../components/marketing/SocialPostPreview';
import { SocialStyleQuiz } from '../../components/marketing/SocialStyleQuiz';
import {
  ALL_PLATFORMS,
  PLATFORM_META,
  createSocialPost,
  deleteSocialPost,
  generateSocialImage,
  generateSocialImages,
  generateSocialPosts,
  getSocialConnections,
  getSocialPosts,
  IMAGE_STYLE_OPTIONS,
  publishSocialPost,
  updateSocialConnection,
  uploadClientLogo,
  type CarouselImageItem,
  type SocialConnection,
  type SocialImageStyle,
  type SocialPlatform,
  type GeneratedSocialImage,
  type SocialPost,
  type SocialPostVariant,
} from '../../api/socialStudio';

const PLATFORM_ICONS: Record<SocialPlatform, typeof Camera> = {
  instagram: Camera,
  facebook: Globe,
  linkedin: Briefcase,
  x: AtSign,
};

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-500/15 text-slate-400',
  scheduled: 'bg-accent-violet/15 text-accent-violet',
  published: 'bg-accent-emerald/15 text-accent-emerald',
  failed: 'bg-red-500/15 text-red-400',
};

function formatSchedule(iso?: string) {
  if (!iso) return 'No date';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function SocialStudio() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [filterPlatform, setFilterPlatform] = useState<SocialPlatform | 'all'>('all');
  const [previewPlatform, setPreviewPlatform] = useState<SocialPlatform>('instagram');

  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('professional, modern, confident');
  const [linkUrl, setLinkUrl] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>([...ALL_PLATFORMS]);
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [instagramImageFormat, setInstagramImageFormat] = useState<'feed' | 'story'>('feed');
  const [platformImages, setPlatformImages] = useState<Partial<Record<SocialPlatform, GeneratedSocialImage>>>({});
  const [scheduledAt, setScheduledAt] = useState('');
  const [variants, setVariants] = useState<Partial<Record<SocialPlatform, SocialPostVariant>>>({});
  const [imageStyle, setImageStyle] = useState<SocialImageStyle>('graphic');
  const [clientName, setClientName] = useState('');
  const [clientLogoUrl, setClientLogoUrl] = useState('');
  const [includeClientBranding, setIncludeClientBranding] = useState(true);
  const [carouselSlides, setCarouselSlides] = useState<CarouselImageItem[]>([]);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [postData, connData] = await Promise.all([getSocialPosts(), getSocialConnections()]);
      setPosts(postData);
      setConnections(connData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredPosts = useMemo(() => {
    if (filterPlatform === 'all') return posts;
    return posts.filter((p) => p.platforms.includes(filterPlatform));
  }, [posts, filterPlatform]);

  const stats = useMemo(() => {
    const scheduled = posts.filter((p) => p.status === 'scheduled').length;
    const published = posts.filter((p) => p.status === 'published').length;
    const connected = connections.filter((c) => c.connected).length;
    return { total: posts.length, scheduled, published, connected };
  }, [posts, connections]);

  const previewCaption = variants[previewPlatform]?.caption ?? caption;
  const previewHashtags =
    variants[previewPlatform]?.hashtags ??
    hashtags
      .split(/[\s,]+/)
      .map((h) => h.trim())
      .filter(Boolean)
      .map((h) => (h.startsWith('#') ? h : `#${h}`));

  const limits = PLATFORM_META[previewPlatform];
  const charCount = previewCaption.length;

  const togglePlatform = (p: SocialPlatform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? (prev.length > 1 ? prev.filter((x) => x !== p) : prev) : [...prev, p]
    );
  };

  const applyVariantToComposer = (p: SocialPlatform) => {
    const v = variants[p];
    if (!v) return;
    setCaption(v.caption);
    setHashtags(v.hashtags.join(' '));
    setPreviewPlatform(p);
  };

  const clientBrand = () => ({
    clientName: clientName.trim() || undefined,
    clientLogoUrl: clientLogoUrl.trim() || undefined,
    includeBranding: includeClientBranding && !!clientName.trim(),
  });

  const captionBrandName = () => clientName.trim() || 'your brand';

  const applyPlatformImage = (p: SocialPlatform) => {
    const img = platformImages[p];
    if (!img) return;
    setImageUrl(img.imageUrl);
    setCarouselSlides(img.carouselImages ?? []);
  };

  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true);
    setError('');
    try {
      const url = await uploadClientLogo(file);
      setClientLogoUrl(url);
      setSuccess('Client logo uploaded.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Logo upload failed');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setGenerating(true);
    setError('');
    try {
      const result = await generateSocialPosts({
        topic: topic.trim(),
        platforms: selectedPlatforms,
        tone,
        linkUrl: linkUrl.trim() || undefined,
        brandName: captionBrandName(),
      });
      setVariants(result.variants);
      const first = selectedPlatforms[0];
      if (first && result.variants[first]) {
        setCaption(result.variants[first]!.caption);
        setHashtags(result.variants[first]!.hashtags.join(' '));
        setPreviewPlatform(first);
      }
      setSuccess(result.summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateImage = async () => {
    const subject = topic.trim() || caption.trim().slice(0, 120);
    if (!subject) {
      setError('Enter a topic or caption first.');
      return;
    }
    setGeneratingImage(true);
    setError('');
    try {
      const result = await generateSocialImage({
        topic: subject,
        platform: previewPlatform,
        style: imageStyle,
        format: previewPlatform === 'instagram' ? instagramImageFormat : undefined,
        ...clientBrand(),
      });
      setPlatformImages((prev) => ({ ...prev, [previewPlatform]: result }));
      setImageUrl(result.imageUrl);
      setCarouselSlides(result.carouselImages ?? []);
      setSuccess(result.analysis || `Topic image ready (${result.width}×${result.height}).`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Image generation failed');
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleGenerateAllImages = async () => {
    if (!topic.trim()) {
      setError('Enter a topic first.');
      return;
    }
    setGeneratingImage(true);
    setError('');
    try {
      const images = await generateSocialImages({
        topic: topic.trim(),
        platforms: selectedPlatforms,
        style: imageStyle,
        instagramFormat: instagramImageFormat,
        ...clientBrand(),
      });
      setPlatformImages((prev) => ({ ...prev, ...images }));
      const current = images[previewPlatform] ?? images[selectedPlatforms[0]];
      if (current) {
        setImageUrl(current.imageUrl);
        setCarouselSlides(current.carouselImages ?? []);
      }
      setSuccess(`Topic images created for ${selectedPlatforms.length} platform(s).`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Image generation failed');
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleGenerateFullPost = async () => {
    if (!topic.trim()) return;
    setGenerating(true);
    setGeneratingImage(true);
    setError('');
    try {
      const [textResult, images] = await Promise.all([
        generateSocialPosts({
          topic: topic.trim(),
          platforms: selectedPlatforms,
          tone,
          linkUrl: linkUrl.trim() || undefined,
          brandName: captionBrandName(),
        }),
        generateSocialImages({
          topic: topic.trim(),
          platforms: selectedPlatforms,
          style: imageStyle,
          instagramFormat: instagramImageFormat,
          ...clientBrand(),
        }),
      ]);
      setVariants(textResult.variants);
      setPlatformImages(images);
      const first = selectedPlatforms[0];
      if (first && textResult.variants[first]) {
        setCaption(textResult.variants[first]!.caption);
        setHashtags(textResult.variants[first]!.hashtags.join(' '));
      }
      const img = images[previewPlatform] ?? images[first];
      if (img) {
        setImageUrl(img.imageUrl);
        setCarouselSlides(img.carouselImages ?? []);
      }
      setSuccess('Full post ready — AI caption + topic image for all platforms.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Full post generation failed');
    } finally {
      setGenerating(false);
      setGeneratingImage(false);
    }
  };

  const handleSave = async (asScheduled: boolean) => {
    if (!caption.trim()) {
      setError('Write a caption or generate with AI first.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const tagList = hashtags
        .split(/[\s,]+/)
        .map((h) => h.trim())
        .filter(Boolean)
        .map((h) => (h.startsWith('#') ? h : `#${h}`));

      await createSocialPost({
        platforms: selectedPlatforms,
        caption: caption.trim(),
        hashtags: tagList,
        linkUrl: linkUrl.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        scheduledAt: asScheduled && scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        variants: Object.keys(variants).length ? variants : undefined,
        aiTopic: topic.trim() || undefined,
      });
      setCaption('');
      setHashtags('');
      setTopic('');
      setVariants({});
      setPlatformImages({});
      setCarouselSlides([]);
      setScheduledAt('');
      setSuccess(asScheduled ? 'Post scheduled.' : 'Draft saved.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (id: string) => {
    setSaving(true);
    setError('');
    try {
      const { note } = await publishSocialPost(id);
      setSuccess(note ?? 'Post published.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Publish failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this post?')) return;
    try {
      await deleteSocialPost(id);
      setSuccess('Post deleted.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const toggleConnection = async (conn: SocialConnection) => {
    const name = conn.connected ? undefined : `${PLATFORM_META[conn.platform].label} Account`;
    try {
      await updateSocialConnection(conn.platform, { connected: !conn.connected, accountName: name });
      await load();
      setSuccess(
        conn.connected
          ? `Disconnected ${PLATFORM_META[conn.platform].label}.`
          : `Connected ${PLATFORM_META[conn.platform].label} (demo — OAuth APIs coming next).`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connection update failed');
    }
  };

  return (
    <div>
      <Header title="Social Studio (beta)" subtitle="Marketing · Under development" />
      <div className="space-y-6 p-8">
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-accent-violet/5 px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-amber-400/40 bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
              Beta
            </span>
            <span className="text-sm font-semibold text-white">Under active development</span>
          </div>
          <p className="mt-2 text-sm text-slate-300">
            Social Studio is in <strong className="text-white">beta</strong> — captions, topic images, and scheduling work today.
            Live publishing to Instagram, Facebook, LinkedIn, and X is coming next. Expect layout and AI improvements weekly.
          </p>
        </div>

        <div className="rounded-2xl border border-accent-cyan/20 bg-gradient-to-r from-accent-cyan/10 to-accent-violet/5 px-5 py-4 text-sm text-slate-300">
          Create posts for <strong className="text-white">Instagram</strong>, <strong className="text-white">Facebook</strong>,{' '}
          <strong className="text-white">LinkedIn</strong>, and <strong className="text-white">X</strong>. AI builds topic-related images — use your{' '}
          <strong className="text-white">client logo & name</strong>, not ours.
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total posts" value={stats.total} icon={Calendar} accent="cyan" />
          <StatCard label="Scheduled" value={stats.scheduled} icon={Send} accent="violet" />
          <StatCard label="Published" value={stats.published} icon={CheckCircle2} accent="emerald" />
          <StatCard label="Connected" value={`${stats.connected}/4`} icon={Plug} accent="pink" />
        </div>

        {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">{error}</p>}
        {success && (
          <p className="rounded-xl border border-accent-emerald/30 bg-accent-emerald/10 px-4 py-2 text-sm text-accent-emerald">
            {success}
          </p>
        )}

        <div className="grid gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <div className="glass-card space-y-4 p-5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent-violet" />
                <h2 className="font-semibold text-white">AI Post Generator</h2>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Topic / image prompt</label>
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  rows={3}
                  placeholder="Describe what the post image should be about — AI will analyze and create content 100% related to this topic"
                  className="input-field resize-y"
                />
              </div>
              <SocialStyleQuiz onSelectStyle={setImageStyle} />

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate-500">Image style</label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {IMAGE_STYLE_OPTIONS.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setImageStyle(s.id)}
                      className={`rounded-xl border p-3 text-left transition-all ${
                        imageStyle === s.id
                          ? 'border-accent-cyan/50 bg-accent-cyan/10'
                          : 'border-white/10 bg-white/5 hover:border-white/20'
                      }`}
                    >
                      <p className="text-xs font-semibold text-white">{s.label}</p>
                      <p className="mt-0.5 text-[10px] text-slate-500">{s.description}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-surface-900/40 p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Client branding (optional)</p>
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Client / business name"
                    className="input-field"
                  />
                  <input
                    value={clientLogoUrl}
                    onChange={(e) => setClientLogoUrl(e.target.value)}
                    placeholder="Logo URL or upload below"
                    className="input-field"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-xs text-slate-400">
                    <input
                      type="checkbox"
                      checked={includeClientBranding}
                      onChange={(e) => setIncludeClientBranding(e.target.checked)}
                      className="rounded border-white/20"
                    />
                    Show client logo & name on image
                  </label>
                  <label className="btn-secondary cursor-pointer text-xs">
                    {uploadingLogo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Image className="h-3.5 w-3.5" />}
                    Upload logo
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleLogoUpload(f);
                      }}
                    />
                  </label>
                  {clientLogoUrl && (
                    <img src={clientLogoUrl} alt="Client logo" className="h-8 w-8 rounded-lg object-contain bg-white/10" />
                  )}
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Tone</label>
                  <input value={tone} onChange={(e) => setTone(e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Link (optional)</label>
                  <div className="relative">
                    <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="https://yoursite.com"
                      className="input-field pl-10"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate-500">Platforms</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_PLATFORMS.map((p) => {
                    const Icon = PLATFORM_ICONS[p];
                    const on = selectedPlatforms.includes(p);
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => togglePlatform(p)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                          on
                            ? 'bg-gradient-to-r ' + PLATFORM_META[p].color + ' text-white shadow-glow'
                            : 'border border-white/10 bg-white/5 text-slate-400 hover:border-white/20'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {PLATFORM_META[p].label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={handleGenerate} disabled={generating || generatingImage || !topic.trim()} className="btn-secondary">
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Caption only
                </button>
                <button onClick={handleGenerateFullPost} disabled={generating || generatingImage || !topic.trim()} className="btn-primary">
                  {generating || generatingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Image className="h-4 w-4" />}
                  Full post (caption + image)
                </button>
              </div>
              {Object.keys(variants).length > 0 && (
                <div className="flex flex-wrap gap-2 border-t border-white/5 pt-3">
                  {ALL_PLATFORMS.filter((p) => variants[p]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => applyVariantToComposer(p)}
                      className="rounded-lg border border-white/10 px-2 py-1 text-[10px] text-slate-300 hover:border-accent-cyan/40"
                    >
                      Use {PLATFORM_META[p].label} copy
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="glass-card space-y-4 p-5">
              <h2 className="font-semibold text-white">Compose & schedule</h2>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xs font-medium uppercase tracking-wider text-slate-500">Caption</label>
                  <span className={`text-[10px] ${charCount > limits.maxChars ? 'text-red-400' : 'text-slate-500'}`}>
                    {charCount}/{limits.maxChars} ({PLATFORM_META[previewPlatform].label})
                  </span>
                </div>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={5}
                  className="input-field resize-y"
                  placeholder="Your post caption…"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Hashtags</label>
                <input
                  value={hashtags}
                  onChange={(e) => setHashtags(e.target.value)}
                  placeholder="#CRM #AI #Growth"
                  className="input-field"
                />
              </div>
              <div className="rounded-xl border border-accent-pink/20 bg-accent-pink/5 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-medium uppercase tracking-wider text-slate-500">Post image</label>
                  {platformImages[previewPlatform] && (
                    <span className="text-[10px] text-slate-500">
                      {platformImages[previewPlatform]!.width}×{platformImages[previewPlatform]!.height}
                    </span>
                  )}
                </div>
                {previewPlatform === 'instagram' && (
                  <div className="flex gap-2">
                    {(['feed', 'story'] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setInstagramImageFormat(f)}
                        className={`rounded-lg px-3 py-1 text-[10px] font-medium ${
                          instagramImageFormat === f ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {f === 'feed' ? 'Feed 1:1' : 'Story 9:16'}
                      </button>
                    ))}
                  </div>
                )}
                {imageUrl ? (
                  <div className="overflow-hidden rounded-xl border border-white/10 bg-surface-900">
                    <img src={imageUrl} alt="Generated post" className="max-h-48 w-full object-cover" />
                  </div>
                ) : (
                  <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-white/10 bg-surface-900/50 text-xs text-slate-500">
                    No image yet — enter topic, pick a style, then generate
                  </div>
                )}
                {carouselSlides.length > 1 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Carousel slides ({carouselSlides.length})
                    </p>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {carouselSlides.map((slide) => (
                        <button
                          key={slide.filename}
                          type="button"
                          onClick={() => setImageUrl(slide.imageUrl)}
                          className="shrink-0 overflow-hidden rounded-lg border border-white/10 hover:border-accent-cyan/40"
                        >
                          <img src={slide.imageUrl} alt={slide.slideTitle} className="h-20 w-20 object-cover" />
                          <p className="px-1 py-0.5 text-[9px] text-slate-500 truncate max-w-[80px]">{slide.slideTitle}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleGenerateImage}
                    disabled={generatingImage || (!topic.trim() && !caption.trim())}
                    className="btn-primary"
                  >
                    {generatingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Image className="h-4 w-4" />}
                    Create topic image
                  </button>
                  <button
                    onClick={handleGenerateAllImages}
                    disabled={generatingImage || !topic.trim()}
                    className="btn-secondary"
                  >
                    All platform sizes
                  </button>
                </div>
                <p className="text-[10px] text-slate-600">
                  Style: {IMAGE_STYLE_OPTIONS.find((s) => s.id === imageStyle)?.label} — content is generated from your topic only.
                </p>
                <input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="input-field text-xs"
                  placeholder="Or paste image URL…"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Schedule</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="input-field"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => handleSave(false)} disabled={saving} className="btn-secondary">
                  <Plus className="h-4 w-4" />
                  Save draft
                </button>
                <button onClick={() => handleSave(true)} disabled={saving || !scheduledAt} className="btn-primary">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
                  Schedule
                </button>
              </div>
            </div>

            <div className="glass-card p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold text-white">Content calendar</h2>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => setFilterPlatform('all')}
                    className={`rounded-lg px-2 py-1 text-[10px] ${filterPlatform === 'all' ? 'bg-white/10 text-white' : 'text-slate-500'}`}
                  >
                    All
                  </button>
                  {ALL_PLATFORMS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setFilterPlatform(p)}
                      className={`rounded-lg px-2 py-1 text-[10px] ${filterPlatform === p ? 'bg-white/10 text-white' : 'text-slate-500'}`}
                    >
                      {PLATFORM_META[p].label}
                    </button>
                  ))}
                </div>
              </div>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-accent-cyan" />
                </div>
              ) : filteredPosts.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">No posts yet — generate with AI or save a draft.</p>
              ) : (
                <div className="space-y-3">
                  {filteredPosts.map((post) => (
                    <div key={post.id} className="rounded-xl border border-white/5 bg-surface-900/60 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap gap-1">
                            {post.platforms.map((p) => {
                              const Icon = PLATFORM_ICONS[p];
                              return (
                                <span key={p} className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-300">
                                  <Icon className="h-3 w-3" />
                                  {PLATFORM_META[p].label}
                                </span>
                              );
                            })}
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_STYLES[post.status]}`}>
                              {post.status}
                            </span>
                          </div>
                          <p className="mt-2 line-clamp-2 text-sm text-slate-200">{post.caption}</p>
                          <p className="mt-1 text-[10px] text-slate-500">
                            {post.status === 'scheduled' ? `Scheduled: ${formatSchedule(post.scheduledAt)}` : formatSchedule(post.createdAt)}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          {post.status !== 'published' && (
                            <button
                              type="button"
                              onClick={() => handlePublish(post.id)}
                              disabled={saving}
                              className="rounded-lg border border-accent-emerald/30 px-2 py-1 text-[10px] text-accent-emerald hover:bg-accent-emerald/10"
                            >
                              Publish
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(post.id)}
                            className="rounded-lg border border-white/10 p-1.5 text-slate-500 hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass-card space-y-3 p-5">
              <h2 className="font-semibold text-white">Platform connections</h2>
              {connections.map((conn) => {
                const Icon = PLATFORM_ICONS[conn.platform];
                return (
                  <div key={conn.platform} className="flex items-center justify-between gap-2 rounded-xl border border-white/5 bg-surface-900/50 px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white">{PLATFORM_META[conn.platform].label}</p>
                        <p className="truncate text-[10px] text-slate-500">{conn.connected ? conn.accountName : conn.setupHint}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleConnection(conn)}
                      className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-medium ${
                        conn.connected
                          ? 'bg-accent-emerald/15 text-accent-emerald'
                          : 'border border-white/10 text-slate-400 hover:border-accent-cyan/30'
                      }`}
                    >
                      {conn.connected ? 'Connected' : 'Connect'}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="glass-card space-y-3 p-5">
              <div className="flex flex-wrap gap-1">
                {ALL_PLATFORMS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setPreviewPlatform(p);
                      if (variants[p]) applyVariantToComposer(p);
                      applyPlatformImage(p);
                    }}
                    className={`rounded-lg px-2 py-1 text-[10px] ${
                      previewPlatform === p ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {PLATFORM_META[p].label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-500">{limits.hint}</p>
              <SocialPostPreview
                platform={previewPlatform}
                caption={previewCaption}
                hashtags={previewHashtags}
                linkUrl={linkUrl || undefined}
                imageUrl={imageUrl || undefined}
                accountName={connections.find((c) => c.platform === previewPlatform)?.accountName}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}