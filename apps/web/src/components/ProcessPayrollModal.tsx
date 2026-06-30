import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { WarningCircle, CheckCircle, X, PaperPlaneTilt, Spinner } from '@phosphor-icons/react';
import { salaryApi } from '@/api/endpoints';
import { useTableRowHighlight } from '@/lib/useTableRowHighlight';

interface Props {
  open: boolean;
  month: number;
  year: number;
  onClose: () => void;
  onSuccess: () => void;
}

interface ValidationError {
  employeeId: string;
  employeeName: string;
  reason: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function ProcessPayrollModal({ open, month, year, onClose, onSuccess }: Props) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<ValidationError[] | null>(null);
  const [dispatching, setDispatching] = useState(false);
  const { tableRef, handleRowClick, rowHighlightClass } = useTableRowHighlight();

  useEffect(() => {
    if (open) {
      setLoading(true);
      setErrors(null);
      setDispatching(false);
      salaryApi.validatePayroll(month, year)
        .then(res => setErrors(res.errors))
        .catch(() => toast.error('Failed to validate payroll records'))
        .finally(() => setLoading(false));
    }
  }, [open, month, year]);

  if (!open) return null;

  const handleDispatch = async () => {
    setDispatching(true);
    try {
      const { jobId } = await salaryApi.dispatch(month, year);
      toast.success(`Payslip dispatch started for ${MONTHS[month - 1]} ${year}`);
      onSuccess();
      onClose();
      navigate(`/admin/salary/dispatch/${jobId}`);
    } catch {
      toast.error('Failed to trigger bulk dispatch');
      setDispatching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 shrink-0">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
              Process Payroll — {MONTHS[month - 1]} {year}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Validation checks must pass before WhatsApp dispatch
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:text-slate-300 transition-colors cursor-pointer">
            <X size={16} weight="bold" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 bg-white dark:bg-slate-800">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-4">
              <Spinner className="animate-spin text-[#eb0a1e]" size={32} weight="bold" />
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-widest">Validating records...</p>
            </div>
          ) : errors && errors.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 p-4">
                <WarningCircle size={24} weight="fill" className="text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-red-800 uppercase tracking-wide">Validation Failed</h3>
                  <p className="text-xs text-red-700 mt-1 leading-relaxed">
                    Found <strong>{errors.length}</strong> critical issue{errors.length > 1 ? 's' : ''}. These must be fixed in the database or Excel sheet before payslips can be sent.
                  </p>
                </div>
              </div>

              <div ref={tableRef} className="border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-mono">
                    <tr>
                      <th className="px-4 py-3 font-semibold border-b border-slate-200 dark:border-slate-700">EMP ID</th>
                      <th className="px-4 py-3 font-semibold border-b border-slate-200 dark:border-slate-700">Name</th>
                      <th className="px-4 py-3 font-semibold border-b border-slate-200 dark:border-slate-700">Issue</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs text-slate-700 dark:text-slate-200">
                    {errors.map((err, i) => {
                      const rowId = err.employeeId || String(i);
                      return (
                      <tr
                        key={i}
                        className={`cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-900 ${rowHighlightClass(rowId)}`}
                        onClick={(ev) => handleRowClick(rowId, ev)}
                      >
                        <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">{err.employeeId}</td>
                        <td className="px-4 py-3 font-semibold">{err.employeeName}</td>
                        <td className="px-4 py-3 text-red-600 font-medium">{err.reason}</td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center gap-4 text-center">
              <CheckCircle size={48} weight="fill" className="text-green-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">All Checks Passed</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
                  Every payroll record for {MONTHS[month - 1]} {year} is valid, has a positive net salary, and corresponds to an employee with a registered mobile number.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-600 dark:bg-slate-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleDispatch}
            disabled={loading || (errors && errors.length > 0) || dispatching}
            className="px-5 py-2 text-xs font-bold uppercase tracking-wider text-white bg-green-700 hover:bg-green-800 border border-green-800 transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <PaperPlaneTilt size={14} weight="bold" />
            {dispatching ? 'Triggering...' : 'Confirm & Dispatch Payslips'}
          </button>
        </div>

      </div>
    </div>
  );
}
