import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, Loader2, Shield, Trash2 } from 'lucide-react';
import type { Contact } from '../../api/contacts';
import {
  eraseContactGdprData,
  exportContactGdprData,
  GDPR_LEGAL_BASES,
  updateContactGdpr,
  type GdprLegalBasis,
} from '../../api/gdpr';

export function ContactGdprPanel({
  contact,
  onUpdated,
}: {
  contact: Contact;
  onUpdated: (contact: Contact) => void;
}) {
  const [legalBasis, setLegalBasis] = useState<GdprLegalBasis>(contact.gdprLegalBasis ?? 'not_recorded');
  const [consentAt, setConsentAt] = useState(contact.gdprConsentAt?.slice(0, 10) ?? '');
  const [consentSource, setConsentSource] = useState(contact.gdprConsentSource ?? '');
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setLegalBasis(contact.gdprLegalBasis ?? 'not_recorded');
    setConsentAt(contact.gdprConsentAt?.slice(0, 10) ?? '');
    setConsentSource(contact.gdprConsentSource ?? '');
    setError('');
    setSuccess('');
  }, [contact.id, contact.gdprLegalBasis, contact.gdprConsentAt, contact.gdprConsentSource]);

  const erased = Boolean(contact.gdprErasedAt);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const updated = await updateContactGdpr(contact.id, {
        gdprLegalBasis: legalBasis,
        gdprConsentAt: consentAt ? new Date(consentAt).toISOString() : undefined,
        gdprConsentSource: consentSource.trim() || undefined,
      });
      onUpdated(updated);
      setSuccess('GDPR fields saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    setBusy(true);
    setError('');
    try {
      const data = await exportContactGdprData(contact.id);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `gdpr-export-${contact.id}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setSuccess('GDPR data export downloaded.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setBusy(false);
    }
  };

  const handleErase = async () => {
    if (
      !window.confirm(
        `Erase all personal data for this contact?\n\nActive AI calls will NOT be stopped. New calls to this contact will be blocked after erase completes.`
      )
    ) {
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await eraseContactGdprData(contact.id);
      onUpdated(result.contact);
      setSuccess(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erase failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border-b border-white/10 bg-accent-violet/5 px-5 py-4">
      <div className="mb-3 flex items-center gap-2">
        <Shield className="h-4 w-4 text-accent-violet" />
        <h3 className="text-sm font-semibold text-white">GDPR & data rights</h3>
        {erased && (
          <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-300">
            Erased {new Date(contact.gdprErasedAt!).toLocaleDateString()}
          </span>
        )}
      </div>

      <p className="mb-3 text-xs text-slate-400">
        Export or erase stored data for this person. AI call scripts, agent prompts, and in-progress calls are unchanged.
      </p>

      {!erased && (
        <div className="mb-3 grid gap-3 sm:grid-cols-3">
          <label className="block text-xs text-slate-400">
            Legal basis
            <select
              value={legalBasis}
              onChange={(e) => setLegalBasis(e.target.value as GdprLegalBasis)}
              className="input-field mt-1"
            >
              {GDPR_LEGAL_BASES.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-slate-400">
            Consent date
            <input
              type="date"
              value={consentAt}
              onChange={(e) => setConsentAt(e.target.value)}
              className="input-field mt-1"
            />
          </label>
          <label className="block text-xs text-slate-400">
            Consent source
            <input
              value={consentSource}
              onChange={(e) => setConsentSource(e.target.value)}
              placeholder="e.g. voice call, web form"
              className="input-field mt-1"
            />
          </label>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {!erased && (
          <button onClick={handleSave} disabled={saving} className="btn-secondary text-xs">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            Save GDPR fields
          </button>
        )}
        <button onClick={handleExport} disabled={busy} className="btn-secondary text-xs">
          <Download className="h-3.5 w-3.5" />
          Export data (SAR)
        </button>
        {!erased && (
          <button onClick={handleErase} disabled={busy} className="btn-secondary text-xs text-red-300">
            <Trash2 className="h-3.5 w-3.5" />
            Erase personal data
          </button>
        )}
      </div>

      {error && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-red-400">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}
      {success && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-accent-emerald">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {success}
        </p>
      )}
    </div>
  );
}