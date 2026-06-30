interface DispatchProgressBarProps {
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  createdAt: string;
  isActive: boolean;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.ceil(seconds)} sec`;
  const mins = Math.ceil(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hours} hr ${remMins} min` : `${hours} hr`;
}

function formatRate(rate: number): string {
  if (rate >= 1) return rate.toFixed(1);
  return rate.toFixed(2);
}

export default function DispatchProgressBar({
  total,
  sent,
  failed,
  skipped,
  createdAt,
  isActive,
}: DispatchProgressBarProps) {
  const processed = sent + failed + skipped;
  const pending = Math.max(0, total - processed);
  const progress = total > 0 ? Math.round((processed / total) * 100) : 0;

  const sentPct = total > 0 ? (sent / total) * 100 : 0;
  const failedPct = total > 0 ? (failed / total) * 100 : 0;
  const skippedPct = total > 0 ? (skipped / total) * 100 : 0;

  const elapsedSec = Math.max(0, (Date.now() - new Date(createdAt).getTime()) / 1000);
  const rate = elapsedSec > 0 && processed > 0 ? processed / elapsedSec : 0;
  const etaSec = isActive && rate > 0 && pending > 0 ? pending / rate : null;

  return (
    <div className="mb-6">
      <div className="flex flex-wrap justify-between gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">
        <span>Progress</span>
        <span>{progress}% ({processed.toLocaleString()}/{total.toLocaleString()})</span>
      </div>

      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
        {sentPct > 0 && (
          <div
            className="h-full bg-green-600 transition-all duration-500 ease-out"
            style={{ width: `${sentPct}%` }}
            title={`Sent: ${sent}`}
          />
        )}
        {failedPct > 0 && (
          <div
            className="h-full bg-red-600 transition-all duration-500 ease-out"
            style={{ width: `${failedPct}%` }}
            title={`Failed: ${failed}`}
          />
        )}
        {skippedPct > 0 && (
          <div
            className="h-full bg-amber-500 transition-all duration-500 ease-out"
            style={{ width: `${skippedPct}%` }}
            title={`Skipped: ${skipped}`}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mt-2 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-600" />
            Sent
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-600" />
            Failed
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Skipped
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
            Pending
          </span>
        </div>
        {pending > 0 && (
          <span>{pending.toLocaleString()} remaining</span>
        )}
      </div>

      {isActive && rate > 0 && etaSec != null && (
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          ~{formatDuration(etaSec)} remaining at {formatRate(rate)}/sec
        </p>
      )}

      {!isActive && processed === total && failed === 0 && total > 0 && (
        <p className="mt-3 text-sm font-semibold text-green-700 dark:text-green-400">
          All payslips dispatched successfully.
        </p>
      )}
    </div>
  );
}
