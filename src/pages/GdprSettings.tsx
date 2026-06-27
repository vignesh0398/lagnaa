import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Loader2, Shield } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { getGdprSettings, runGdprRetention, saveGdprSettings } from '../api/gdpr';

export function GdprSettings() {
  const [retentionMonths, setRetentionMonths] = useState(0);
  const [companyName, setCompanyName] = useState('DataCrew');
  const [dpoEmail, setDpoEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const settings = await getGdprSettings();
      setRetentionMonths(settings.retentionMonths);
      setCompanyName(settings.companyName);
      setDpoEmail(settings.dpoEmail);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await saveGdprSettings({ retentionMonths, companyName, dpoEmail });
      setSuccess('GDPR settings saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleRetention = async () => {
    if (!window.confirm('Erase personal data for contacts older than the retention period? Active AI calls are skipped.')) return;
    setRunning(true);
    setError('');
    try {
      const result = await runGdprRetention();
      setSuccess(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Retention run failed');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div>
      <Header title="GDPR Settings" subtitle="Data protection controls" onRefresh={load} />

      <div className="mx-auto max-w-2xl space-y-6 p-8">
        <div className="glass-card flex items-start gap-3 p-5">
          <Shield className="h-5 w-5 text-accent-violet" />
          <p className="text-sm text-slate-300">
            These settings manage data retention and privacy display. They do not modify AI call flows or agent prompts.
            See also <Link to="/settings/privacy" className="text-accent-cyan hover:underline">Privacy Policy</Link>.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-accent-cyan" />
          </div>
        ) : (
          <div className="glass-card space-y-4 p-5">
            <label className="block text-sm text-slate-300">
              Company / controller name
              <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="input-field mt-1" />
            </label>
            <label className="block text-sm text-slate-300">
              Data protection contact email
              <input
                value={dpoEmail}
                onChange={(e) => setDpoEmail(e.target.value)}
                placeholder="privacy@yourcompany.com"
                className="input-field mt-1"
              />
            </label>
            <label className="block text-sm text-slate-300">
              Data retention (months, 0 = off)
              <input
                type="number"
                min={0}
                max={120}
                value={retentionMonths}
                onChange={(e) => setRetentionMonths(Number(e.target.value))}
                className="input-field mt-1"
              />
              <span className="mt-1 block text-xs text-slate-500">
                Manual &quot;Run retention&quot; erases contacts not updated within this period. Skips active AI calls.
              </span>
            </label>

            <div className="flex flex-wrap gap-2 pt-2">
              <button onClick={handleSave} disabled={saving} className="btn-primary text-xs">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Save settings
              </button>
              <button
                onClick={handleRetention}
                disabled={running || retentionMonths < 1}
                className="btn-secondary text-xs"
              >
                {running ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Run retention now
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="flex items-center gap-2 text-sm text-red-400">
            <AlertCircle className="h-4 w-4" />
            {error}
          </p>
        )}
        {success && (
          <p className="flex items-center gap-2 text-sm text-accent-emerald">
            <CheckCircle2 className="h-4 w-4" />
            {success}
          </p>
        )}
      </div>
    </div>
  );
}