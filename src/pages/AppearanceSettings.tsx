import { Check, Moon, Palette, RotateCcw, Sparkles, Sun } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { useAppearance } from '../hooks/useAppearance';
import { BRAND_NAME, BRAND_TAGLINE } from '../constants/brand';
import {
  ACCENT_PRESETS,
  type AccentPreset,
  type BackgroundStyle,
  type CornerStyle,
  type MotionPreference,
  type ThemeMode,
  type UiDensity,
} from '../utils/appearance';

function OptionCard({
  active,
  onClick,
  title,
  description,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition ${
        active
          ? 'border-[var(--theme-accent)]/50 bg-[var(--theme-accent)]/10 ring-1 ring-[var(--theme-accent)]/30'
          : 'border-white/10 bg-white/[0.03] hover:border-white/20'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-white">{title}</p>
          <p className="mt-1 text-xs text-slate-400">{description}</p>
        </div>
        {active && <Check className="h-4 w-4 shrink-0 text-[var(--theme-accent)]" />}
      </div>
      {children}
    </button>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
            value === opt.id
              ? 'bg-[var(--theme-accent)]/20 text-white ring-1 ring-[var(--theme-accent)]/40'
              : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function AppearanceSettings() {
  const { settings, updateSettings, resetSettings } = useAppearance();

  return (
    <div>
      <Header
        title="Appearance"
        subtitle="Personalize"
        actions={
          <button onClick={resetSettings} className="btn-secondary text-xs">
            <RotateCcw className="h-3.5 w-3.5" />
            Reset defaults
          </button>
        }
      />

      <div className="mx-auto max-w-4xl space-y-8 p-8">
        <div className="glass-card border border-[var(--theme-accent)]/20 p-5">
          <p className="text-sm text-slate-300">
            Customize how Lagnaa looks on your screen. Settings are saved per account on this device — members and admins both get these options.
          </p>
        </div>

        <section className="space-y-4">
          <h3 className="flex items-center gap-2 text-lg font-bold text-white">
            <Sun className="h-5 w-5 text-[var(--theme-accent)]" />
            Display mode
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <OptionCard
              active={settings.mode === 'dark'}
              onClick={() => updateSettings({ mode: 'dark' as ThemeMode })}
              title="Dark"
              description="Default Lagnaa look — easy on the eyes for long sessions."
            >
              <div className="mt-3 h-16 rounded-xl bg-gradient-to-br from-surface-950 via-surface-900 to-surface-800" />
            </OptionCard>
            <OptionCard
              active={settings.mode === 'light'}
              onClick={() => updateSettings({ mode: 'light' as ThemeMode })}
              title="Light"
              description="Bright workspace with softer cards and readable contrast."
            >
              <div className="mt-3 h-16 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white" />
            </OptionCard>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="flex items-center gap-2 text-lg font-bold text-white">
            <Palette className="h-5 w-5 text-[var(--theme-accent)]" />
            Theme colour
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ACCENT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => updateSettings({ accent: preset.id as AccentPreset })}
                className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
                  settings.accent === preset.id
                    ? 'border-[var(--theme-accent)]/50 bg-[var(--theme-accent)]/10 ring-1 ring-[var(--theme-accent)]/30'
                    : 'border-white/10 bg-white/[0.03] hover:border-white/20'
                }`}
              >
                <div className="flex -space-x-1">
                  {preset.colors.map((color) => (
                    <span
                      key={color}
                      className="h-8 w-8 rounded-full border-2 border-surface-900"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white">{preset.label}</p>
                  {settings.accent === preset.id && (
                    <p className="text-xs text-[var(--theme-accent)]">Active</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="glass-card space-y-5 p-6">
          <h3 className="flex items-center gap-2 text-lg font-bold text-white">
            <Sparkles className="h-5 w-5 text-[var(--theme-accent)]" />
            More options
          </h3>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-300">Spacing</p>
            <Segmented<UiDensity>
              value={settings.density}
              onChange={(density) => updateSettings({ density })}
              options={[
                { id: 'comfortable', label: 'Comfortable' },
                { id: 'compact', label: 'Compact' },
              ]}
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-300">Corner style</p>
            <Segmented<CornerStyle>
              value={settings.corners}
              onChange={(corners) => updateSettings({ corners })}
              options={[
                { id: 'rounded', label: 'Rounded' },
                { id: 'sharp', label: 'Sharp' },
              ]}
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-300">Background</p>
            <Segmented<BackgroundStyle>
              value={settings.background}
              onChange={(background) => updateSettings({ background })}
              options={[
                { id: 'mesh', label: 'Gradient mesh' },
                { id: 'solid', label: 'Solid' },
              ]}
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-300">Animations</p>
            <Segmented<MotionPreference>
              value={settings.motion}
              onChange={(motion) => updateSettings({ motion })}
              options={[
                { id: 'full', label: 'Full motion' },
                { id: 'reduced', label: 'Reduced motion' },
              ]}
            />
          </div>
        </section>

        <section className="glass-card overflow-hidden p-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Live preview</p>
          <div className="rounded-2xl border border-white/10 bg-surface-900/50 p-5">
            <p className="gradient-text text-xl font-bold">{BRAND_NAME}</p>
            <p className="mt-1 text-xs text-slate-500">{BRAND_TAGLINE}</p>
            <p className="mt-2 text-sm text-slate-400">Buttons, accents, and cards update instantly as you change settings.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className="btn-primary text-xs">
                Primary action
              </button>
              <button type="button" className="btn-secondary text-xs">
                Secondary
              </button>
              <span className="status-pill bg-[var(--theme-accent)]/15 text-[var(--theme-accent)]">Accent pill</span>
            </div>
          </div>
        </section>

        <p className="flex items-center gap-2 text-center text-xs text-slate-600">
          <Moon className="h-3.5 w-3.5" />
          Tip: open Appearance anytime from the sidebar or your profile menu.
        </p>
      </div>
    </div>
  );
}