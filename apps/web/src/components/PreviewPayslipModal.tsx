import { useState, useEffect } from 'react';
import { X, ArrowClockwise } from '@phosphor-icons/react';
import { salaryApi } from '@/api/endpoints';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface Props {
  open: boolean;
  employeeId: string;
  employeeName: string;
  month: number;
  year: number;
  onClose: () => void;
}

export default function PreviewPayslipModal({ open, employeeId, employeeName, month, year, onClose }: Props) {
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setLoading(true);
      setError(null);
      setPdfBlob(null);
      salaryApi.previewPayslip(employeeId, month, year)
        .then((blob) => {
          setPdfBlob(blob);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message || 'Failed to load payslip preview');
          setLoading(false);
        });
    } else {
      setPdfBlob(null);
      setError(null);
      setLoading(false);
    }
  }, [open, employeeId, month, year]);

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (pdfBlob) {
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPdfUrl(null);
  }, [pdfBlob]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative z-10 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 shadow-2xl w-full max-w-4xl mx-4 flex flex-col max-h-[90vh] rounded-lg overflow-hidden" style={{ borderRadius: '0.5rem' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 shrink-0">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
              Payslip Preview — {employeeName} ({employeeId})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {MONTHS[month - 1]} {year}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:text-slate-300 transition-colors cursor-pointer">
            <X size={16} weight="bold" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden p-2 bg-white dark:bg-slate-800">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="spinner-dashed" />
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-widest">Loading payslip...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-4">
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 p-4 rounded-lg max-w-md">
                <svg className="text-red-600 shrink-0 mt-0.5" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div className="text-left">
                  <h3 className="text-sm font-bold text-red-800 uppercase tracking-wide">Failed to Load Preview</h3>
                  <p className="text-xs text-red-700 mt-1 leading-relaxed">{error}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  salaryApi.previewPayslip(employeeId, month, year)
                    .then((blob) => setPdfBlob(blob))
                    .catch((err) => setError(err.message || 'Failed to load payslip preview'))
                    .finally(() => setLoading(false));
                }}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-500 dark:bg-slate-600 border border-slate-300 dark:border-slate-600 transition-colors cursor-pointer flex items-center gap-2"
              >
                <ArrowClockwise size={13} weight="bold" /> Retry
              </button>
            </div>
          ) : pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0"
              title={`Payslip - ${employeeName} - ${MONTHS[month - 1]} ${year}`}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}