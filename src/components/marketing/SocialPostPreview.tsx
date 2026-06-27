import type { SocialPlatform } from '../../api/socialStudio';
import { PLATFORM_META } from '../../api/socialStudio';

type Props = {
  platform: SocialPlatform;
  caption: string;
  hashtags: string[];
  linkUrl?: string;
  imageUrl?: string;
  accountName?: string;
};

function fullText(caption: string, hashtags: string[]) {
  const tags = hashtags.length ? `\n\n${hashtags.join(' ')}` : '';
  return `${caption}${tags}`;
}

export function SocialPostPreview({ platform, caption, hashtags, linkUrl, imageUrl, accountName }: Props) {
  const meta = PLATFORM_META[platform];
  const text = fullText(caption, hashtags);
  const name = accountName || 'Lagnaa One';

  if (platform === 'instagram') {
    return (
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-surface-900">
        <div className="flex items-center gap-2 border-b border-white/5 px-3 py-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-600" />
          <span className="text-xs font-semibold text-white">{name}</span>
        </div>
        {imageUrl ? (
          <div className="aspect-square bg-cover bg-center" style={{ backgroundImage: `url(${imageUrl})` }} />
        ) : (
          <div className="flex aspect-square items-center justify-center bg-surface-800 text-xs text-slate-500">Image preview</div>
        )}
        <div className="p-3 text-xs text-slate-200 whitespace-pre-wrap">{text}</div>
      </div>
    );
  }

  if (platform === 'facebook') {
    return (
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-surface-900">
        <div className="flex items-center gap-2 px-3 py-3">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-600 to-blue-400" />
          <div>
            <p className="text-xs font-semibold text-white">{name}</p>
            <p className="text-[10px] text-slate-500">Just now · 🌐</p>
          </div>
        </div>
        <div className="px-3 pb-2 text-xs text-slate-200 whitespace-pre-wrap">{text}</div>
        {imageUrl && <div className="h-40 bg-cover bg-center" style={{ backgroundImage: `url(${imageUrl})` }} />}
        {linkUrl && (
          <div className="border-t border-white/5 bg-surface-800/80 px-3 py-2 text-[10px] text-slate-400 truncate">
            {linkUrl}
          </div>
        )}
      </div>
    );
  }

  if (platform === 'linkedin') {
    return (
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-surface-900">
        <div className="flex items-center gap-2 px-3 py-3">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-700 to-cyan-600" />
          <div>
            <p className="text-xs font-semibold text-white">{name}</p>
            <p className="text-[10px] text-slate-500">Company · 1h</p>
          </div>
        </div>
        <div className="px-3 pb-3 text-xs leading-relaxed text-slate-200 whitespace-pre-wrap">{text}</div>
        {linkUrl && (
          <div className="mx-3 mb-3 rounded-lg border border-white/10 bg-surface-800 p-2 text-[10px] text-accent-cyan truncate">
            {linkUrl}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-surface-900 p-3">
      <div className="flex gap-2">
        <div className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-slate-600 to-slate-800" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-white">
            {name} <span className="font-normal text-slate-500">@{name.toLowerCase().replace(/\s+/g, '')}</span>
          </p>
          <p className="mt-1 text-xs text-slate-200 whitespace-pre-wrap break-words">{text}</p>
          {linkUrl && <p className="mt-1 text-[10px] text-accent-cyan truncate">{linkUrl}</p>}
          <p className="mt-2 text-[10px] text-slate-500">{meta.label} · now</p>
        </div>
      </div>
    </div>
  );
}