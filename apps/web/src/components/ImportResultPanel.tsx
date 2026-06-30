interface ImportResultPanelProps {
  result: {
    successCount: number;
    errorCount: number;
    skippedIdentical?: number;
    conflictsPending?: number;
    errors?: { row: number; message: string }[] | string[];
  };
  onDismiss?: () => void;
}

export default function ImportResultPanel({ result, onDismiss }: ImportResultPanelProps) {
  const errList = result.errors ?? [];
  const normalizedErrors = errList.map((e) =>
    typeof e === 'string' ? { row: 0, message: e } : e,
  );

  return (
    <div className="rounded-xl p-5 flex items-start gap-4 bg-primary/5" style={{ borderLeft: '3px solid #2e5bff' }}>
      <span className="material-symbols-outlined text-2xl text-primary">upload_file</span>
      <div className="flex-1">
        <p className="font-headline font-bold uppercase tracking-tight text-on-surface">
          Import: {result.successCount} inserted
          {(result.skippedIdentical ?? 0) > 0 && (
            <span className="text-tertiary"> · {result.skippedIdentical} identical skipped</span>
          )}
          {result.errorCount > 0 && <span className="text-tertiary"> · {result.errorCount} rejected</span>}
          {(result.conflictsPending ?? 0) > 0 && (
            <span className="text-amber-600"> · {result.conflictsPending} conflicts need review below</span>
          )}
        </p>
        {normalizedErrors.length > 0 && (
          <ul className="mt-2 space-y-1">
            {normalizedErrors.slice(0, 5).map((e, i) => (
              <li key={`${e.row}-${i}`} className="text-xs text-tertiary font-label">
                {e.row > 0 ? `Row ${e.row}: ` : ''}{e.message}
              </li>
            ))}
            {normalizedErrors.length > 5 && (
              <li className="text-xs text-on-surface-variant">…and {normalizedErrors.length - 5} more</li>
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
