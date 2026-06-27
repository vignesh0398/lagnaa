import { useCallback, useEffect, useState } from 'react';
import { Bot, ExternalLink, Loader2, Newspaper, RefreshCw } from 'lucide-react';
import { getTechNews, type TechNewsArticle } from '../../api/news';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return 'Recently';
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const SOURCE_COLORS: Record<string, string> = {
  'VentureBeat AI': 'bg-emerald-500/20 text-emerald-300',
  'TechCrunch AI': 'bg-orange-500/20 text-orange-300',
  'AI News': 'bg-cyan-500/20 text-cyan-300',
  'MIT Tech Review': 'bg-violet-500/20 text-violet-300',
};

function NewsCard({
  article,
  featured = false,
}: {
  article: TechNewsArticle;
  featured?: boolean;
}) {
  const [imgError, setImgError] = useState(false);
  const imageSrc = imgError
    ? `/api/news/placeholder?title=${encodeURIComponent(article.title.slice(0, 72))}&source=${encodeURIComponent(article.source)}`
    : article.imageUrl;

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`group relative shrink-0 snap-start overflow-hidden rounded-2xl border border-white/10 bg-surface-900 shadow-card transition hover:-translate-y-0.5 hover:border-[var(--theme-accent)]/35 hover:shadow-glow ${
        featured ? 'w-[min(88vw,560px)]' : 'w-[min(78vw,320px)]'
      }`}
    >
      <div className={`relative overflow-hidden ${featured ? 'aspect-[16/10]' : 'aspect-[4/3]'}`}>
        <img
          src={imageSrc}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-black/10" />
        <div className="absolute left-3 top-3 flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide backdrop-blur-sm ${
              SOURCE_COLORS[article.source] ?? 'bg-white/15 text-white'
            }`}
          >
            {article.source}
          </span>
          <span className="rounded-full bg-black/40 px-2 py-0.5 text-[10px] text-slate-200 backdrop-blur-sm">
            {timeAgo(article.publishedAt)}
          </span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3
            className={`font-bold leading-snug text-white transition group-hover:text-[var(--theme-accent)] ${
              featured ? 'line-clamp-3 text-xl' : 'line-clamp-2 text-base'
            }`}
          >
            {article.title}
          </h3>
          <p className={`mt-2 text-slate-300 ${featured ? 'line-clamp-2 text-sm' : 'line-clamp-1 text-xs'}`}>
            {article.summary}
          </p>
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--theme-accent)]">
            Read story
            <ExternalLink className="h-3 w-3" />
          </span>
        </div>
      </div>
    </a>
  );
}

function NewsSkeleton({ featured = false }: { featured?: boolean }) {
  return (
    <div
      className={`shrink-0 animate-pulse overflow-hidden rounded-2xl border border-white/5 bg-white/5 ${
        featured ? 'w-[min(88vw,560px)] aspect-[16/10]' : 'w-[min(78vw,320px)] aspect-[4/3]'
      }`}
    />
  );
}

export function TechNewsFeed() {
  const [articles, setArticles] = useState<TechNewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const data = await getTechNews(10);
      if (!data.success && !data.articles?.length) {
        throw new Error(data.error || 'Failed to load news');
      }
      setArticles(data.articles ?? []);
      setFetchedAt(data.fetchedAt ?? new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load AI tech news');
      setArticles([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const [featured, ...rest] = articles;

  return (
    <section className="glass-card overflow-hidden border border-[var(--theme-accent)]/15 p-5 md:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Newspaper className="h-5 w-5 text-[var(--theme-accent)]" />
            AI &amp; tech news
          </h2>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <Bot className="h-3.5 w-3.5 text-[var(--theme-accent)]" />
            Visual headlines from VentureBeat, TechCrunch AI, AI News &amp; MIT Tech Review
            {fetchedAt ? <span>· Updated {timeAgo(fetchedAt)}</span> : null}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load(true)}
          disabled={loading || refreshing}
          className="btn-secondary text-xs"
        >
          {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex gap-4 overflow-hidden pb-2">
          <NewsSkeleton featured />
          <NewsSkeleton />
          <NewsSkeleton />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-6 text-center">
          <p className="text-sm text-amber-200">{error}</p>
          <button type="button" onClick={() => void load(true)} className="btn-secondary mt-3 text-xs">
            Try again
          </button>
        </div>
      ) : (
        <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2 snap-x snap-mandatory scroll-smooth">
          {featured && <NewsCard article={featured} featured />}
          {rest.map((article) => (
            <NewsCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </section>
  );
}