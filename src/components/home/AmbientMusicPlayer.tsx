import { useCallback, useEffect, useState } from 'react';
import { Leaf, Music2, Piano, Volume2, VolumeX, Waves, Minus, Plus, Play, Pause } from 'lucide-react';
import { ambientEngine, type AmbientTrackId } from './ambientAudioEngine';

const STORAGE_KEY = 'lagnaa_ambient_prefs';

const TRACKS: Record<
  AmbientTrackId,
  { label: string; icon: typeof Leaf; description: string }
> = {
  nature: {
    label: 'Nature',
    icon: Leaf,
    description: 'Soft wind, leaves & gentle birds',
  },
  melody: {
    label: 'Melody',
    icon: Piano,
    description: 'Light piano-style tones',
  },
  relaxing: {
    label: 'Relaxing',
    icon: Waves,
    description: 'Warm ambient drone pad',
  },
};

interface AmbientPrefs {
  track: AmbientTrackId;
  volume: number;
  muted: boolean;
  playing: boolean;
}

const DEFAULT_PREFS: AmbientPrefs = {
  track: 'relaxing',
  volume: 0.35,
  muted: false,
  playing: false,
};

function loadPrefs(): AmbientPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<AmbientPrefs>;
    return { ...DEFAULT_PREFS, ...parsed, playing: false };
  } catch {
    return DEFAULT_PREFS;
  }
}

function savePrefs(prefs: AmbientPrefs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

function clampVolume(v: number): number {
  return Math.min(0.55, Math.max(0.08, v));
}

export function AmbientMusicPlayer() {
  const [expanded, setExpanded] = useState(false);
  const [prefs, setPrefs] = useState<AmbientPrefs>(loadPrefs);
  const [status, setStatus] = useState('');

  const applyVolume = useCallback(() => {
    ambientEngine.setVolume(prefs.volume, prefs.muted);
  }, [prefs.volume, prefs.muted]);

  useEffect(() => {
    ambientEngine.stop();
  }, []);

  useEffect(() => {
    applyVolume();
  }, [applyVolume]);

  const update = useCallback((patch: Partial<AmbientPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      savePrefs(next);
      return next;
    });
  }, []);

  const startPlayback = useCallback(
    async (track: AmbientTrackId = prefs.track) => {
      try {
        await ambientEngine.play(track);
        ambientEngine.setVolume(prefs.volume, false);
        setStatus('');
      } catch {
        setStatus('Could not start audio — try clicking Play again.');
      }
    },
    [prefs.volume, prefs.track]
  );

  const stopPlayback = useCallback(() => {
    ambientEngine.stop();
  }, []);

  const togglePlay = async () => {
    if (prefs.playing && !prefs.muted) {
      stopPlayback();
      update({ playing: false });
      return;
    }
    await startPlayback(prefs.track);
    update({ playing: true, muted: false });
  };

  const selectTrack = async (id: AmbientTrackId) => {
    if (prefs.playing && !prefs.muted) {
      await startPlayback(id);
      update({ track: id, playing: true, muted: false });
      return;
    }
    update({ track: id });
  };

  const toggleMute = () => {
    const nextMuted = !prefs.muted;
    if (nextMuted) {
      ambientEngine.setVolume(prefs.volume, true);
      stopPlayback();
      update({ muted: true, playing: false });
      return;
    }
    update({ muted: false });
    if (prefs.playing) {
      ambientEngine.setVolume(prefs.volume, false);
    }
  };

  const handleMainButtonClick = () => {
    setExpanded((v) => !v);
  };

  const track = TRACKS[prefs.track];
  const TrackIcon = track.icon;
  const isActive = prefs.playing && !prefs.muted;

  return (
    <div className="pointer-events-none fixed bottom-5 right-6 z-50 flex flex-col items-end gap-2">
      {expanded && (
        <div className="pointer-events-auto w-72 rounded-2xl border border-white/10 bg-surface-900/95 p-4 shadow-2xl backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-white">Ambient sound</p>
              <p className="text-[10px] text-slate-500">Built-in — no downloads, soft volume</p>
            </div>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="rounded-lg px-2 py-1 text-[10px] text-slate-500 hover:bg-white/5"
            >
              Close
            </button>
          </div>

          {status && (
            <p className="mb-2 rounded-lg bg-amber-500/10 px-2 py-1 text-[10px] text-amber-300">{status}</p>
          )}

          <button
            type="button"
            onClick={() => void togglePlay()}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-accent-cyan/15 py-2.5 text-sm font-medium text-accent-cyan hover:bg-accent-cyan/25"
          >
            {isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isActive ? 'Pause' : 'Play'} {track.label}
          </button>

          <div className="mb-3 grid grid-cols-3 gap-1.5">
            {(Object.keys(TRACKS) as AmbientTrackId[]).map((id) => {
              const t = TRACKS[id];
              const Icon = t.icon;
              const active = prefs.track === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => void selectTrack(id)}
                  className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2 transition ${
                    active
                      ? 'border-accent-cyan/40 bg-accent-cyan/10 text-accent-cyan'
                      : 'border-white/5 text-slate-400 hover:border-white/15 hover:text-slate-200'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-[10px] font-medium">{t.label}</span>
                </button>
              );
            })}
          </div>

          <p className="mb-3 text-[10px] text-slate-500">{track.description}</p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMute}
              className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-white"
              title={prefs.muted ? 'Unmute' : 'Mute'}
            >
              {prefs.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => {
                const vol = clampVolume(prefs.volume - 0.08);
                update({ volume: vol, muted: false });
                ambientEngine.setVolume(vol, false);
              }}
              className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-white"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <input
              type="range"
              min={0.08}
              max={0.55}
              step={0.01}
              value={prefs.muted ? 0.08 : prefs.volume}
              onChange={(e) => {
                const vol = Number(e.target.value);
                update({ volume: vol, muted: false });
                ambientEngine.setVolume(vol, false);
              }}
              className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-accent-cyan"
            />
            <button
              type="button"
              onClick={() => {
                const vol = clampVolume(prefs.volume + 0.08);
                update({ volume: vol, muted: false });
                ambientEngine.setVolume(vol, false);
              }}
              className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-white"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="mt-2 text-center text-[9px] text-slate-600">
            Volume · {Math.round((prefs.muted ? 0 : prefs.volume) * 100)}%
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => void handleMainButtonClick()}
        className={`pointer-events-auto relative flex h-12 w-12 items-center justify-center rounded-full border shadow-lg backdrop-blur-md transition hover:scale-105 ${
          isActive
            ? 'border-accent-cyan/40 bg-accent-cyan/15 text-accent-cyan'
            : 'border-white/10 bg-surface-900/90 text-slate-400 hover:text-white'
        }`}
        title="Ambient sound — paused until you press Play"
      >
        {isActive && (
          <span
            className="absolute inset-0 animate-ping rounded-full bg-accent-cyan/15"
            style={{ animationDuration: '2.5s' }}
          />
        )}
        {isActive ? <TrackIcon className="relative h-5 w-5" /> : <Music2 className="relative h-5 w-5" />}
      </button>
    </div>
  );
}