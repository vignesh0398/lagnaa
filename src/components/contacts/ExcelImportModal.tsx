import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, FileSpreadsheet, Loader2, Upload, X } from 'lucide-react';
import { importContacts } from '../../api/contacts';
import {
  guessColumnMapping,
  IMPORT_FIELDS,
  mapRowsToContacts,
  parseExcelFile,
  type ContactImportField,
  type ParsedExcelSheet,
} from '../../utils/excelContacts';

type Step = 'upload' | 'map' | 'preview';

interface Props {
  onClose: () => void;
  onImported: (message: string) => void;
  onError: (msg: string) => void;
}

export function ExcelImportModal({ onClose, onImported, onError }: Props) {
  const [step, setStep] = useState<Step>('upload');
  const [sheet, setSheet] = useState<ParsedExcelSheet | null>(null);
  const [mapping, setMapping] = useState<Record<number, ContactImportField>>({});
  const [importing, setImporting] = useState(false);
  const [loadingFile, setLoadingFile] = useState(false);

  const phoneMapped = Object.values(mapping).includes('phone');
  const previewContacts = sheet ? mapRowsToContacts(sheet.rows.slice(0, 5), mapping) : [];

  const handleFile = async (file: File) => {
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      onError('Please upload .xlsx, .xls, or .csv file');
      return;
    }
    setLoadingFile(true);
    try {
      const parsed = await parseExcelFile(file);
      setSheet(parsed);
      setMapping(guessColumnMapping(parsed.headers));
      setStep('map');
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed to read file');
    } finally {
      setLoadingFile(false);
    }
  };

  const handleImport = async () => {
    if (!sheet || !phoneMapped) {
      onError('Map at least the Phone column before importing.');
      return;
    }
    setImporting(true);
    try {
      const contacts = mapRowsToContacts(sheet.rows, mapping);
      if (!contacts.length) {
        onError('No valid rows with phone numbers found.');
        return;
      }
      const result = await importContacts(contacts);
      onImported(
        `Imported ${result.imported} from ${sheet.fileName}${result.skipped ? ` (${result.skipped} duplicates skipped)` : ''}`
      );
      onClose();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="glass-card max-h-[90vh] w-full max-w-3xl overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-bold text-white">
              <FileSpreadsheet className="h-5 w-5 text-accent-emerald" />
              Import from Excel
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Step {step === 'upload' ? 1 : step === 'map' ? 2 : 3} of 3 — upload, map columns, preview & import
            </p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {step === 'upload' && (
          <div className="mt-6">
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/15 bg-white/[0.02] px-8 py-14 transition hover:border-accent-cyan/40 hover:bg-accent-cyan/5">
              {loadingFile ? (
                <Loader2 className="h-10 w-10 animate-spin text-accent-cyan" />
              ) : (
                <>
                  <Upload className="h-10 w-10 text-slate-500" />
                  <p className="mt-3 font-medium text-white">Drop Excel file or click to browse</p>
                  <p className="mt-1 text-xs text-slate-500">.xlsx, .xls, .csv — first sheet, header row required</p>
                </>
              )}
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFile(f);
                }}
              />
            </label>
          </div>
        )}

        {step === 'map' && sheet && (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-slate-400">
              <span className="font-medium text-white">{sheet.fileName}</span> — {sheet.rows.length} rows detected
            </p>
            {!phoneMapped && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Map one column to <strong>Phone</strong> (required)
              </div>
            )}
            <div className="space-y-2">
              {sheet.headers.map((header, index) => (
                <div key={index} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
                  <span className="min-w-[120px] text-sm font-medium text-slate-300">{header || `Column ${index + 1}`}</span>
                  <span className="text-slate-600">→</span>
                  <select
                    value={mapping[index] ?? 'skip'}
                    onChange={(e) =>
                      setMapping((m) => ({ ...m, [index]: e.target.value as ContactImportField }))
                    }
                    className="input-field min-w-[180px] flex-1"
                  >
                    {IMPORT_FIELDS.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                        {f.required ? ' *' : ''}
                      </option>
                    ))}
                  </select>
                  <span className="truncate text-xs text-slate-600">
                    e.g. {sheet.rows[0]?.[index] || '—'}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setStep('upload')} className="btn-secondary">
                Back
              </button>
              <button disabled={!phoneMapped} onClick={() => setStep('preview')} className="btn-primary">
                Preview import
              </button>
            </div>
          </div>
        )}

        {step === 'preview' && sheet && (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-slate-400">
              Ready to import <span className="font-bold text-white">{mapRowsToContacts(sheet.rows, mapping).length}</span> contacts
            </p>
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-500">
                    <th className="px-3 py-2">First name</th>
                    <th className="px-3 py-2">Last name</th>
                    <th className="px-3 py-2">Phone</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">DOB</th>
                    <th className="px-3 py-2">Postcode</th>
                  </tr>
                </thead>
                <tbody>
                  {previewContacts.map((c, i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td className="px-3 py-2 text-white">{c.firstName || c.name || '—'}</td>
                      <td className="px-3 py-2">{c.lastName || '—'}</td>
                      <td className="px-3 py-2">{c.phone}</td>
                      <td className="px-3 py-2 text-slate-400">{c.email || '—'}</td>
                      <td className="px-3 py-2 text-slate-400">{c.dob || '—'}</td>
                      <td className="px-3 py-2 text-slate-400">{c.postcode || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setStep('map')} className="btn-secondary">
                Back
              </button>
              <button onClick={handleImport} disabled={importing} className="btn-primary">
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Import {mapRowsToContacts(sheet.rows, mapping).length} contacts
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}