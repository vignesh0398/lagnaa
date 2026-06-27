export type ThemeMode = 'dark' | 'light';
export type AccentPreset = 'lagnaa' | 'ocean' | 'forest' | 'sunset' | 'royal' | 'amber';
export type UiDensity = 'comfortable' | 'compact';
export type CornerStyle = 'rounded' | 'sharp';
export type BackgroundStyle = 'mesh' | 'solid';
export type MotionPreference = 'full' | 'reduced';

export interface AppearanceSettings {
  mode: ThemeMode;
  accent: AccentPreset;
  density: UiDensity;
  corners: CornerStyle;
  background: BackgroundStyle;
  motion: MotionPreference;
}

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  mode: 'dark',
  accent: 'lagnaa',
  density: 'comfortable',
  corners: 'rounded',
  background: 'mesh',
  motion: 'full',
};

export const ACCENT_PRESETS: {
  id: AccentPreset;
  label: string;
  colors: [string, string, string];
}[] = [
  { id: 'lagnaa', label: 'Lagnaa', colors: ['#22d3ee', '#8b5cf6', '#ec4899'] },
  { id: 'ocean', label: 'Ocean', colors: ['#38bdf8', '#0ea5e9', '#14b8a6'] },
  { id: 'forest', label: 'Forest', colors: ['#34d399', '#22c55e', '#84cc16'] },
  { id: 'sunset', label: 'Sunset', colors: ['#fb923c', '#f472b6', '#f43f5e'] },
  { id: 'royal', label: 'Royal', colors: ['#a78bfa', '#6366f1', '#3b82f6'] },
  { id: 'amber', label: 'Amber', colors: ['#fbbf24', '#f97316', '#ef4444'] },
];

const STORAGE_PREFIX = 'lagnaa_appearance';
const STORAGE_LAST_KEY = `${STORAGE_PREFIX}_last`;

export function appearanceStorageKey(userId?: string | null): string {
  return userId ? `${STORAGE_PREFIX}_${userId}` : STORAGE_LAST_KEY;
}

export function loadAppearance(userId?: string | null): AppearanceSettings {
  const keys = userId
    ? [appearanceStorageKey(userId), STORAGE_LAST_KEY]
    : [STORAGE_LAST_KEY];

  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as Partial<AppearanceSettings>;
      return { ...DEFAULT_APPEARANCE, ...parsed };
    } catch {
      continue;
    }
  }
  return { ...DEFAULT_APPEARANCE };
}

export function saveAppearance(settings: AppearanceSettings, userId?: string | null): void {
  const payload = JSON.stringify(settings);
  localStorage.setItem(appearanceStorageKey(userId), payload);
  localStorage.setItem(STORAGE_LAST_KEY, payload);
}

export function applyAppearanceToDocument(settings: AppearanceSettings): void {
  const root = document.documentElement;
  root.dataset.theme = settings.mode;
  root.dataset.accent = settings.accent;
  root.dataset.density = settings.density;
  root.dataset.corners = settings.corners;
  root.dataset.background = settings.background;
  root.dataset.motion = settings.motion;

  const preset = ACCENT_PRESETS.find((p) => p.id === settings.accent) ?? ACCENT_PRESETS[0];
  root.style.setProperty('--theme-accent', preset.colors[0]);
  root.style.setProperty('--theme-accent-2', preset.colors[1]);
  root.style.setProperty('--theme-accent-3', preset.colors[2]);
  root.style.setProperty(
    '--theme-gradient',
    `linear-gradient(135deg, ${preset.colors[0]} 0%, ${preset.colors[1]} 50%, ${preset.colors[2]} 100%)`
  );
}

/** Apply before React mounts so first paint matches saved prefs. */
export function bootstrapAppearance(): void {
  applyAppearanceToDocument(loadAppearance());
}