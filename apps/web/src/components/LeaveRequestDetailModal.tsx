import { useEffect } from 'react';
import { CheckCircle, XCircle, Clock, X } from '@phosphor-icons/react';
import type { LeaveRequest } from '@/api/types';

interface Props {
  leave: LeaveRequest | null;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isUpdating: boolean;
}

const shortDate = (dStr?: string) => {
  if (!dStr) return '—';
  const parts = dStr.split('T')[0].split('-');
  if (parts.length !== 3) return dStr;
  const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(parts[1], 10) - 1];
  return `${parts[2]} ${m} ${parts[0]}`;
};

function leaveTypeBadgeClass(type: string) {
  switch (type.toLowerCase()) {
    case 'casual':
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300';
    case 'sick':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-300';
    case 'unpaid':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-300';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/30 dark:border-slate-800 dark:text-slate-300';
  }
}

const formatDateTime = (dStr?: string) => {
  if (!dStr) return '—';
  const d = new Date(dStr);
  if (Number.isNaN(d.getTime())) return dStr;
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 items-start">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 pt-0.5">
        {label}
      </dt>
      <dd className="text-sm text-slate-800 dark:text-slate-200">{children}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: LeaveRequest['status'] }) {
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded shadow-sm text-[10px] uppercase tracking-widest font-bold bg-amber-100/50 text-amber-800 border border-amber-200/60 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/50">
        <Clock size={12} weight="bold" /> Pending
      </span>
    );
  }
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded shadow-sm text-[10px] uppercase tracking-widest font-bold bg-emerald-100/50 text-emerald-800 border border-emerald-200/60 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/50">
        <CheckCircle size={12} weight="bold" /> Approved
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded shadow-sm text-[10px] uppercase tracking-widest font-bold bg-rose-100/50 text-rose-800 border border-rose-200/60 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800/50">
      <XCircle size={12} weight="bold" /> Rejected
    </span>
  );
}

export default function LeaveRequestDetailModal({
  leave,
  onClose,
  onApprove,
  onReject,
  isUpdating,
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!leave) return;
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [leave, onClose]);

  if (!leave) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />

      <div className="relative z-10 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 shrink-0">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
            Leave Request Details
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4 overflow-y-auto">
          <dl className="space-y-3">
            <DetailRow label="Employee">
              <div className="font-bold text-slate-900 dark:text-white">{leave.employee?.name ?? '—'}</div>
              <div className="text-xs text-slate-500 font-mono mt-0.5">{leave.employee?.employeeId ?? leave.employeeId}</div>
            </DetailRow>
            <DetailRow label="Leave Type">
              <span
                className={`inline-block px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded border ${leaveTypeBadgeClass(leave.type)}`}
              >
                {leave.type}
              </span>
            </DetailRow>
            <DetailRow label="Duration">
              <span className="font-medium">
                {shortDate(leave.fromDate)}
                <span className="text-slate-400 font-normal px-1">–</span>
                {shortDate(leave.toDate)}
              </span>
              <span className="text-slate-500 ml-2 text-xs">
                ({leave.days} {leave.days === 1 ? 'day' : 'days'})
              </span>
            </DetailRow>
            <DetailRow label="Status">
              <StatusBadge status={leave.status} />
            </DetailRow>
            <DetailRow label="Submitted">
              {formatDateTime(leave.createdAt)}
            </DetailRow>
            {(leave.reviewedBy || leave.reviewedAt) && (
              <DetailRow label="Reviewed">
                <div>
                  {leave.reviewedBy && <span>{leave.reviewedBy}</span>}
                  {leave.reviewedAt && (
                    <span className="text-slate-500 text-xs block mt-0.5">{formatDateTime(leave.reviewedAt)}</span>
                  )}
                </div>
              </DetailRow>
            )}
          </dl>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Reason
            </p>
            <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
              {leave.reason || '—'}
            </p>
          </div>

          {leave.status === 'rejected' && leave.rejectionReason && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-2">
                HR Rejection Reason
              </p>
              <p className="text-sm text-rose-700 dark:text-rose-300 leading-relaxed whitespace-pre-wrap break-words">
                {leave.rejectionReason}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 shrink-0">
          {leave.status === 'pending' ? (
            <>
              <button
                onClick={onClose}
                disabled={isUpdating}
                className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                Close
              </button>
              <button
                onClick={() => onReject(leave.id)}
                disabled={isUpdating}
                className="px-3 py-1.5 text-[11px] uppercase tracking-wider font-bold rounded shadow-sm flex items-center gap-1.5 transition-all bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 hover:border-rose-200 dark:bg-slate-800 dark:border-slate-700 dark:hover:border-rose-900 dark:text-rose-400 disabled:opacity-50"
              >
                <XCircle size={14} weight="bold" /> Reject
              </button>
              <button
                onClick={() => onApprove(leave.id)}
                disabled={isUpdating}
                className="px-3 py-1.5 text-[11px] uppercase tracking-wider font-bold rounded shadow-sm flex items-center gap-1.5 transition-all bg-emerald-500 hover:bg-emerald-600 text-white border border-emerald-600 disabled:opacity-50"
              >
                <CheckCircle size={14} weight="bold" /> Approve
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
