import type { ImportResult } from '@/api/types';

interface ImportResultPanelProps {
  result: ImportResult;
  onDismiss?: () => void;
}

export default function ImportResultPanel({ result, onDismiss }: ImportResultPanelProps) {
  return (
    <div className="rounded-xl p-5 flex items-start gap-4 bg-primary/5" style={{ borderLeft: '3px solid #2e5bff' }}>
      <span className="material-symbols-outlined text-2xl text-primary">upload_file</span>
      <div className="flex-1">
        <p className="font-headline font-bold uppercase tracking-tight text-on-surface">
          Import: {result.successCount} imported
          {result.errorCount > 0 && <span className="text-tertiary"> · {result.errorCount} rejected</span>}
        </p>
        {result.errors && result.errors.length > 0 && (
          <ul className="mt-2 space-y-1">
            {result.errors.slice(0, 5).map((e) => (
              <li key={e.row} className="text-xs text-tertiary font-label">Row {e.row}: {e.message}</li>
            ))}
            {result.errors.length > 5 && (
              <li className="text-xs text-on-surface-variant">…and {result.errors.length - 5} more</li>
            )}
          </ul>
        )}
      </div>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="text-on-surface-variant hover:text-on-surface">
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      )}
    </div>
  );
}
