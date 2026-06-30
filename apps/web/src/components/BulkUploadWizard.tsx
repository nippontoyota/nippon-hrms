import { useState } from 'react';
import toast from 'react-hot-toast';
import FileUploadZone from './FileUploadZone';
import MonthYearSelect from './MonthYearSelect';
import ImportResultPanel from './ImportResultPanel';
import ConfirmDialog from './ConfirmDialog';
import { importsApi } from '@/api/hooks';
import type { ImportEntityType, ImportJob, ImportMode } from '@/api/types';

type Step = 'configure' | 'processing' | 'done';

interface BulkUploadWizardProps {
  title: string;
  entityType: ImportEntityType;
  showMonthYear?: boolean;
  month?: number;
  year?: number;
  onMonthChange?: (m: number) => void;
  onYearChange?: (y: number) => void;
  onComplete?: (job: ImportJob) => void;
  onCancel?: () => void;
}

async function pollUntilDone(jobId: string): Promise<ImportJob> {
  for (let i = 0; i < 300; i++) {
    const job = await importsApi.getJob(jobId);
    if (job.status === 'COMPLETED' || job.status === 'FAILED') return job;
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error('Import timed out');
}

export default function BulkUploadWizard({
  title,
  entityType,
  showMonthYear,
  month = new Date().getMonth() + 1,
  year = new Date().getFullYear(),
  onMonthChange,
  onYearChange,
  onComplete,
  onCancel,
}: BulkUploadWizardProps) {
  const [step, setStep] = useState<Step>('configure');
  const [mode, setMode] = useState<ImportMode>('add');
  const [loading, setLoading] = useState(false);
  const [job, setJob] = useState<ImportJob | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);

  const startImport = async (file: File) => {
    setLoading(true);
    setStep('processing');
    try {
      const started = await importsApi.start(
        file,
        entityType,
        mode,
        showMonthYear ? month : undefined,
        showMonthYear ? year : undefined,
      );
      const finished = await pollUntilDone(started.id);
      setJob(finished);
      setStep('done');
      if (finished.status === 'FAILED') {
        toast.error(finished.errorMessage || 'Import failed');
      } else {
        toast.success(`Imported ${finished.inserted} rows`);
        onComplete?.(finished);
      }
    } catch {
      toast.error('Import failed');
      setStep('configure');
    } finally {
      setLoading(false);
      setPendingFile(null);
      setConfirmReplace(false);
    }
  };

  const handleFile = (f: File) => {
    if (mode === 'replace') {
      setPendingFile(f);
      setConfirmReplace(true);
      return;
    }
    startImport(f);
  };

  const reset = () => {
    setStep('configure');
    setJob(null);
    setPendingFile(null);
  };

  const resultForPanel = job
    ? {
        successCount: job.inserted,
        errorCount: job.rejected,
        skippedIdentical: job.skippedIdentical,
        conflictsPending: job.conflictsPending,
      }
    : null;

  return (
    <div className="card space-y-4">
      <ConfirmDialog
        open={confirmReplace}
        title="Replace existing data?"
        message={`This will replace all existing ${entityType} records with the imported file. This cannot be undone.`}
        confirmLabel="Replace and import"
        onConfirm={() => pendingFile && startImport(pendingFile)}
        onCancel={() => { setConfirmReplace(false); setPendingFile(null); }}
        danger
      />

      <div className="flex items-center justify-between">
        <p className="font-headline font-bold uppercase text-sm tracking-tight text-on-surface">{title}</p>
        <div className="flex gap-4">
          {step !== 'configure' && (
            <button type="button" className="text-sm text-primary font-semibold" onClick={reset}>
              Start over
            </button>
          )}
          {onCancel && (
            <button type="button" className="text-sm text-slate-500 font-semibold" onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
      </div>

      {step === 'configure' && (
        <>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={mode === 'add'} onChange={() => setMode('add')} />
              Add to current data
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={mode === 'replace'} onChange={() => setMode('replace')} />
              Replace existing data
            </label>
          </div>
          <p className="text-xs text-slate-500">
            CSV recommended for large imports (10k+ rows). Excel (.xlsx) also supported.
          </p>
          {showMonthYear && onMonthChange && onYearChange && (
            <MonthYearSelect month={month} year={year} onMonthChange={onMonthChange} onYearChange={onYearChange} />
          )}
          <FileUploadZone onFile={handleFile} accept=".csv,.xlsx,.xls" />
        </>
      )}

      {step === 'processing' && (
        <div className="py-6 text-center space-y-2">
          <div className="animate-pulse text-sm font-semibold text-primary">Processing import…</div>
          <p className="text-xs text-slate-500">Large files may take a few minutes. Do not close this page.</p>
          {loading && <div className="mx-auto w-48 h-1 bg-slate-200 rounded overflow-hidden"><div className="h-full bg-primary animate-pulse w-2/3" /></div>}
        </div>
      )}

      {step === 'done' && resultForPanel && (
        <ImportResultPanel result={resultForPanel} onDismiss={reset} />
      )}
    </div>
  );
}
