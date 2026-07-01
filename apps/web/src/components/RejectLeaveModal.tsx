import { useEffect, useRef, useState } from 'react';
import { WarningDiamond, X } from '@phosphor-icons/react';
import {
  buildLeaveRejectedPreview,
  validateRejectionReason,
} from '@/lib/rejectionReason';

interface RejectLeaveModalProps {
  open: boolean;
  employeeName?: string;
  leaveDays?: number;
  leaveFromDate?: string;
  leaveToDate?: string;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
  isSubmitting?: boolean;
}

const MAX_REASON_LENGTH = 500;

function formatLeaveShortDate(iso: string): string {
  const datePart = iso.split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);
  if (!year || !month || !day) return iso;
  const label = new Date(year, month - 1, day).toLocaleString('en-IN', { day: '2-digit', month: 'short' });
  return label.replace(/^0/, '');
}

export default function RejectLeaveModal({
  open,
  employeeName,
  leaveDays = 1,
  leaveFromDate = '',
  leaveToDate = '',
  onCancel,
  onConfirm,
  isSubmitting = false,
}: RejectLeaveModalProps) {
  const [reason, setReason] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setReason('');
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const trimmed = reason.trim();
  const validationError = trimmed ? validateRejectionReason(trimmed) : null;
  const canSubmit = trimmed.length > 0 && !validationError && !isSubmitting;
  const preview =
    trimmed && !validationError
      ? buildLeaveRejectedPreview(
          employeeName ?? 'Employee',
          leaveDays,
          formatLeaveShortDate(leaveFromDate),
          formatLeaveShortDate(leaveToDate),
          trimmed,
        )
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={onCancel}
      />

      <div className="relative z-10 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700 bg-red-50 dark:bg-red-950/30">
          <div className="flex items-center gap-3">
            <WarningDiamond size={20} weight="fill" className="text-red-600" />
            <span className="text-sm font-bold uppercase tracking-wider text-red-800 dark:text-red-300">
              Reject Leave Request
            </span>
          </div>
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 dark:text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-3">
          {employeeName && (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Rejecting leave for <strong className="text-slate-900 dark:text-white">{employeeName}</strong>.
              The employee will receive this reason via WhatsApp.
            </p>
          )}
          <div>
            <label htmlFor="reject-reason" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Rejection reason <span className="text-red-600">*</span>
            </label>
            <textarea
              id="reject-reason"
              ref={textareaRef}
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, MAX_REASON_LENGTH))}
              rows={4}
              placeholder="e.g. Insufficient leave balance for this month"
              disabled={isSubmitting}
              className="w-full bg-white dark:bg-slate-900 rounded-md px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 focus:outline-none focus:border-[#eb0a1e] resize-none disabled:opacity-50"
            />
            <p className="text-[10px] text-slate-400 mt-1 text-right">
              {reason.length}/{MAX_REASON_LENGTH}
            </p>
            {validationError && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">{validationError}</p>
            )}
          </div>
          {preview && (
            <div className="rounded-md border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/60 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                WhatsApp preview
              </p>
              <p className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                {preview}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => canSubmit && onConfirm(trimmed)}
            disabled={!canSubmit}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 border border-red-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reject & Notify
          </button>
        </div>
      </div>
    </div>
  );
}
