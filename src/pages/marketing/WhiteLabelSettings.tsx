import { useEffect, useState } from 'react';
import { Check, Loader2, Palette } from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { getWhiteLabel, saveWhiteLabel, type WhiteLabelConfig } from '../../api/marketing';

export function WhiteLabelSettings() {
  const [config, setConfig] = useState<WhiteLabelConfig>({
    agencyName: '',
    agencyTagline: '',
    logoUrl: '',
    primaryColor: '#22d3ee',
    contactEmail: '',
    website: '',
    showPoweredBy: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getWhiteLabel()
      .then(setConfig)
      .catch(() => setError('Could not load settings'))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      setConfig(await saveWhiteLabel(config));
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const field = (key: keyof WhiteLabelConfig, label: string, placeholder: string, type = 'text') => (
    <div>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">{label}</label>
      <input
        type={type}
        value={String(config[key] ?? '')}
        onChange={(e) => setConfig((c) => ({ ...c, [key]: e.target.value }))}
        placeholder={placeholder}
        className="input-field"
      />
    </div>
  );

  return (
    <div>
      <Header title="White-label PDF" subtitle="Marketing" />
      <div className="space-y-6 p-8">
        <div className="rounded-2xl border border-accent-cyan/20 bg-gradient-to-r from-accent-cyan/10 to-accent-violet/5 px-5 py-4 text-sm text-slate-300">
          Brand your client PDF and HTML reports with your agency name, colors, and contact details. Applies to all marketing downloads.
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-accent-cyan" />
          </div>
        ) : (
          <div className="glass-card grid max-w-2xl gap-4 p-6">
            {field('agencyName', 'Agency / company name', 'Your Agency Ltd')}
            {field('agencyTagline', 'Tagline', 'Digital marketing that delivers')}
            {field('logoUrl', 'Logo URL (optional)', 'https://yoursite.com/logo.png')}
            {field('primaryColor', 'Primary brand color', '#22d3ee')}
            {field('contactEmail', 'Contact email on reports', 'hello@youragency.com')}
            {field('website', 'Website', 'https://youragency.com')}

            <label className="flex items-center gap-3 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={config.showPoweredBy}
                onChange={(e) => setConfig((c) => ({ ...c, showPoweredBy: e.target.checked }))}
                className="rounded border-white/20"
              />
              Show &quot;Powered by DataCrew&quot; on reports
            </label>

            <div className="rounded-xl border border-white/10 p-4" style={{ borderColor: `${config.primaryColor}40` }}>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Preview</p>
              <p className="mt-2 text-lg font-bold" style={{ color: config.primaryColor }}>
                {config.agencyName || 'Your Agency'}
              </p>
              <p className="text-sm text-slate-400">{config.agencyTagline || 'Your tagline'}</p>
            </div>

            {error && <p className="text-sm text-red-300">{error}</p>}
            {saved && (
              <p className="flex items-center gap-2 text-sm text-accent-emerald">
                <Check className="h-4 w-4" /> Settings saved — applies to new PDF/HTML exports
              </p>
            )}

            <button onClick={save} disabled={saving} className="btn-primary w-fit">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Palette className="h-4 w-4" />}
              Save white-label settings
            </button>
          </div>
        )}
      </div>
    </div>
  );
}