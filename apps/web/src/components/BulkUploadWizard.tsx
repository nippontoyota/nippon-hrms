import { useState } from 'react';
import toast from 'react-hot-toast';
import type { ImportPreviewResult } from '@/api/types';
import FileUploadZone from './FileUploadZone';
import MonthYearSelect from './MonthYearSelect';
import ImportResultPanel from './ImportResultPanel';

type Step = 'select' | 'preview' | 'done';

interface BulkUploadWizardProps {
  title: string;
  showMonthYear?: boolean;
  month?: number;
  year?: number;
  onMonthChange?: (m: number) => void;
  onYearChange?: (y: number) => void;
  onPreview: (file: File) => Promise<ImportPreviewResult>;
  onCommit: (file: File) => Promise<{ successCount: number; errorCount: number }>;
  onComplete?: () => void;
  previewColumns?: string[];
}

export default function BulkUploadWizard({
  title,
  showMonthYear,
  month = new Date().getMonth() + 1,
  year = new Date().getFullYear(),
  onMonthChange,
  onYearChange,
  onPreview,
  onCommit,
  onComplete,
  previewColumns = ['EMP ID', 'Name'],
}: BulkUploadWizardProps) {
  const [step, setStep] = useState<Step>('select');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ successCount: number; errorCount: number } | null>(null);

  const handleFile = async (f: File) => {
    setFile(f);
    setLoading(true);
    try {
      const data = await onPreview(f);
      setPreview(data);
      setStep('preview');
    } catch {
      toast.error('Failed to parse file');
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const res = await onCommit(file);
      setResult(res);
      setStep('done');
      toast.success(`Imported ${res.successCount} rows`);
      onComplete?.();
    } catch {
      toast.error('Import failed');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep('select');
    setFile(null);
    setPreview(null);
    setResult(null);
  };

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-headline font-bold uppercase text-sm tracking-tight text-on-surface">{title}</p>
        {step !== 'select' && (
          <button type="button" className="text-sm text-primary font-semibold" onClick={reset}>
            Start over
          </button>
        )}
      </div>

      {showMonthYear && onMonthChange && onYearChange && (
        <MonthYearSelect month={month} year={year} onMonthChange={onMonthChange} onYearChange={onYearChange} />
      )}

      {step === 'select' && (
        <>
          <FileUploadZone onFile={handleFile} />
          {loading && <p className="text-sm text-on-surface-variant">Parsing file…</p>}
        </>
      )}

      {step === 'preview' && preview && (
        <div className="space-y-4">
          <p className="text-sm text-on-surface-variant">
            {preview.successCount} valid · {preview.errorCount} errors · {preview.warningCount} warnings
          </p>
          <div className="overflow-x-auto max-h-64 border border-outline/30 rounded-lg">
            <table className="data-table text-xs">
              <thead>
                <tr>
                  <th>Row</th>
                  {previewColumns.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                  <th>Issues</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => (
                  <tr key={row.row} className={row.errors.length ? 'bg-error/5' : ''}>
                    <td>{row.row}</td>
                    {previewColumns.map((c) => (
                      <td key={c}>{String(row.data[c] ?? '—')}</td>
                    ))}
                    <td className="text-tertiary text-xs">
                      {[...row.errors, ...row.warnings].join('; ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            className="btn-primary btn-sm"
            onClick={handleCommit}
            disabled={loading || preview.errorCount > 0}
          >
            {loading ? 'Importing…' : 'Confirm import'}
          </button>
        </div>
      )}

      {step === 'done' && result && (
        <ImportResultPanel result={result} onDismiss={reset} />
      )}
    </div>
  );
}
