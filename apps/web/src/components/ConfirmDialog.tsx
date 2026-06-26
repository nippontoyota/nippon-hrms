import { useEffect, useRef } from 'react';
import { WarningDiamond, X } from '@phosphor-icons/react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
  danger = true,
}: ConfirmDialogProps) {
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) confirmBtnRef.current?.focus();
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative z-10 bg-white border border-slate-300 shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b border-slate-200 ${danger ? 'bg-red-50' : 'bg-slate-50'}`}>
          <div className="flex items-center gap-3">
            <WarningDiamond
              size={20}
              weight="fill"
              className={danger ? 'text-red-600' : 'text-slate-500'}
            />
            <span className={`text-sm font-bold uppercase tracking-wider ${danger ? 'text-red-800' : 'text-slate-700'}`}>
              {title}
            </span>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-600 border border-slate-300 bg-white hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            ref={confirmBtnRef}
            onClick={onConfirm}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors cursor-pointer ${
              danger
                ? 'bg-red-600 hover:bg-red-700 border border-red-700'
                : 'bg-slate-800 hover:bg-slate-900 border border-slate-900'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
