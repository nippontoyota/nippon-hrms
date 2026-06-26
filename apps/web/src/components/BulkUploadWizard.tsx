import { useState } from 'react';
import toast from 'react-hot-toast';
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
  onCommit: (file: File) => Promise<{ successCount: number; errorCount: number }>;
  onComplete?: () => void;
  onCancel?: () => void;
}

export default function BulkUploadWizard({
  title,
  showMonthYear,
  month = new Date().getMonth() + 1,
  year = new Date().getFullYear(),
  onMonthChange,
  onYearChange,
  onCommit,
  onComplete,
  onCancel,
}: BulkUploadWizardProps) {
  const [step, setStep] = useState<Step>('select');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ successCount: number; errorCount: number } | null>(null);

  const handleFile = async (f: File) => {
    setLoading(true);
    try {
      const res = await onCommit(f);
      setResult(res);
      setStep('done');
      toast.success(`Imported ${res.successCount || 0} rows successfully`);
      onComplete?.();
    } catch {
      toast.error('Import failed');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep('select');
    setResult(null);
  };

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-headline font-bold uppercase text-sm tracking-tight text-on-surface">{title}</p>
        <div className="flex gap-4">
          {step !== 'select' && (
            <button type="button" className="text-sm text-primary font-semibold" onClick={reset}>
              Start over
            </button>
          )}
          {onCancel && (
            <button type="button" className="text-sm text-slate-500 hover:text-slate-700 font-semibold" onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
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

      {step === 'done' && result && (
        <ImportResultPanel result={result} onDismiss={reset} />
      )}
    </div>
  );
}
