import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { WarningCircle, Spinner, CaretLeft, CaretRight, CheckCircle, WhatsappLogo } from '@phosphor-icons/react';
import { salaryApi } from '@/api/endpoints';
import { usePayrollRecords } from '@/api/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { useTableRowHighlight } from '@/lib/useTableRowHighlight';

interface ValidationError {
  employeeId: string;
  employeeName: string;
  reason: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function SalaryPage() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<ValidationError[] | null>(null);
  const [dispatching, setDispatching] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const qc = useQueryClient();
  const navigate = useNavigate();
  const { tableRef, handleRowClick, rowHighlightClass } = useTableRowHighlight();
  const { data: records, isLoading: recordsLoading } = usePayrollRecords(month, year);

  const isNextMonthDisabled = year === currentYear && month === currentMonth;
  const isNextYearDisabled = year === currentYear;

  const validate = async (m: number, y: number) => {
    setLoading(true);
    setErrors(null);
    try {
      const res = await salaryApi.validatePayroll(m, y);
      setErrors(res.errors);
    } catch {
      toast.error('Failed to validate payroll records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    validate(month, year);
  }, [month, year]);

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (isNextMonthDisabled) return;
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const isDispatched = records?.some(r => r.dispatchedAt) ?? false;
  const recordCount = records?.length ?? 0;

  const handleDispatch = async () => {
    setDispatching(true);
    try {
      const { jobId } = await salaryApi.dispatch(month, year);
      toast.success('Dispatch started');
      qc.invalidateQueries({ queryKey: ['payrollRecords', month, year] });
      setIsConfirmModalOpen(false);
      navigate(`/admin/salary/dispatch/${jobId}`);
    } catch {
      toast.error('Failed to trigger dispatch');
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="flex items-center border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-sm divide-x divide-slate-300 rounded-md overflow-hidden" style={{ borderRadius: '0.375rem' }}>
          <button
            onClick={prevMonth}
            className="px-2.5 py-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-600 dark:bg-slate-700 hover:text-slate-800 dark:text-slate-100 transition-colors cursor-pointer"
          >
            <CaretLeft size={14} weight="bold" />
          </button>
          <div className="flex items-center px-1 gap-0.5">
            {MONTH_SHORT.map((m, i) => {
              const isDisabled = year === currentYear && i + 1 > currentMonth;
              return (
                <button
                  key={m}
                  onClick={() => setMonth(i + 1)}
                  disabled={isDisabled}
                  className={`px-1.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                    isDisabled ? 'text-slate-200 cursor-not-allowed' :
                    month === i + 1
                      ? 'bg-green-600 text-white cursor-pointer'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-600 dark:bg-slate-700 cursor-pointer'
                  }`}
                >
                  {m}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-1 px-2">
            <button onClick={() => setYear(y => y - 1)} className="text-slate-400 hover:text-slate-700 dark:text-slate-200 cursor-pointer">
              <CaretLeft size={11} weight="bold" />
            </button>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100 tabular-nums w-10 text-center select-none">{year}</span>
            <button onClick={() => setYear(y => y + 1)} disabled={isNextYearDisabled} className={`transition-colors ${isNextYearDisabled ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-slate-700 dark:text-slate-200 cursor-pointer'}`}>
              <CaretRight size={11} weight="bold" />
            </button>
          </div>
          <button
            onClick={nextMonth}
            disabled={isNextMonthDisabled}
            className={`px-2.5 py-2 transition-colors ${isNextMonthDisabled ? 'text-slate-200 cursor-not-allowed' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-600 dark:bg-slate-700 hover:text-slate-800 dark:text-slate-100 cursor-pointer'}`}
          >
            <CaretRight size={14} weight="bold" />
          </button>
        </div>
      </div>

      {/* Validation Panel */}
      <div className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 shadow-sm min-h-[400px] flex flex-col relative">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-16">
            <Spinner className="animate-spin text-green-600" size={32} weight="bold" />
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-widest">Validating records...</p>
          </div>
        ) : errors && errors.length > 0 ? (
          <div className="flex-1 flex flex-col">
            <div className="flex items-start gap-3 bg-red-50 border-b border-red-200 p-5 shrink-0">
              <WarningCircle size={24} weight="fill" className="text-red-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-red-800 uppercase tracking-wide">Validation Failed</h3>
                <p className="text-xs text-red-700 mt-1 leading-relaxed">
                  Found <strong>{errors.length}</strong> critical issue{errors.length > 1 ? 's' : ''} for {MONTHS[month - 1]} {year}. These must be fixed in the database (or via Excel re-import) before payslips can be sent.
                </p>
              </div>
            </div>
            <div ref={tableRef} className="flex-1 overflow-y-auto custom-scrollbar p-0">
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-mono sticky top-0 border-b border-slate-200 dark:border-slate-700 shadow-sm z-10">
                  <tr>
                    <th className="px-5 py-3 font-semibold w-12 text-center">Sl. No.</th>
                    <th className="px-5 py-3 font-semibold">EMP ID</th>
                    <th className="px-5 py-3 font-semibold">Name</th>
                    <th className="px-5 py-3 font-semibold w-full">Issue</th>
                  </tr>
                </thead>
                <tbody className="text-xs text-slate-700 dark:text-slate-200 divide-y divide-slate-100">
                  {errors.map((err, i) => {
                    const rowId = err.employeeId || String(i);
                    return (
                    <tr
                      key={i}
                      className={`cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors ${rowHighlightClass(rowId)}`}
                      onClick={(ev) => handleRowClick(rowId, ev)}
                    >
                      <td className="px-5 py-3 text-slate-400 font-mono text-center">{i + 1}</td>
                      <td className="px-5 py-3 font-mono font-bold text-slate-900 dark:text-white">{err.employeeId}</td>
                      <td className="px-5 py-3 font-semibold">{err.employeeName}</td>
                      <td className="px-5 py-3 text-red-600 font-medium">{err.reason}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (!records || records.length === 0) ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 py-24 bg-white dark:bg-slate-800">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No Records Found</p>
            <p className="text-xs text-slate-400">Import records in the Salary Directory first.</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="flex items-start gap-3 bg-green-50 border-b border-green-200 p-5 shrink-0">
              <div className="p-2 bg-green-100 rounded-full shrink-0">
                <CheckCircle size={20} weight="fill" className="text-green-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-green-800 uppercase tracking-wide">All Systems Go</h3>
                <p className="text-xs text-green-700 mt-1 leading-relaxed">
                  Every payroll record for {MONTHS[month - 1]} {year} is valid and ready to dispatch.
                </p>
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center py-16 px-6 text-center">
              <p className="text-5xl font-black text-slate-900 dark:text-white tabular-nums">{recordCount}</p>
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mt-2">
                employee{recordCount !== 1 ? 's' : ''} ready
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {MONTHS[month - 1]} {year} payroll validated
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-4 max-w-sm">
                To preview an individual payslip, use the eye icon in Salary Directory.
              </p>
            </div>
          </div>
        )}

        {/* Action Footer */}
        <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-5 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {isDispatched ? 'Process Completed' : errors?.length === 0 ? 'Ready to process' : 'Action required'}
          </div>

          {isDispatched ? (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-green-100 border border-green-200 text-green-800 font-bold uppercase tracking-wider text-[11px] rounded-md">
              <CheckCircle size={18} weight="fill" className="text-green-600" />
              Payslips Dispatched
            </div>
          ) : (
            <button
              onClick={() => setIsConfirmModalOpen(true)}
              disabled={loading || (errors && errors.length > 0) || dispatching || recordsLoading || !records || records.length === 0}
              className="bg-green-700 hover:bg-green-800 text-white font-bold uppercase tracking-wider !px-6 !py-3 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-md transition-colors text-sm rounded-md"
            >
              <WhatsappLogo size={18} weight="fill" />
              {dispatching ? 'Dispatching...' : 'Dispatch Payslips'}
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200" style={{ borderRadius: '0.5rem' }}>
            <div className="bg-green-50 p-5 border-b border-green-100 flex items-start gap-3">
              <div className="bg-green-100 p-2 rounded-full shrink-0 mt-0.5">
                <WarningCircle size={24} weight="fill" className="text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-green-900 text-lg uppercase tracking-wide">Confirm Dispatch</h3>
                <p className="text-sm text-green-700 mt-1 leading-relaxed">
                  You are about to send {MONTHS[month - 1]} {year} payslips to all {recordCount} employees via WhatsApp.
                </p>
              </div>
            </div>
            <div className="p-5 bg-white dark:bg-slate-800">
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                PDF payslips will be sent directly to each employee&apos;s registered mobile number. <strong className="text-slate-900 dark:text-white font-bold">This cannot be undone.</strong>
              </p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2 font-bold uppercase tracking-wider text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 dark:bg-slate-700 transition-colors rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setIsConfirmModalOpen(false);
                  handleDispatch();
                }}
                className="px-5 py-2 font-bold uppercase tracking-wider text-xs text-white bg-green-700 hover:bg-green-800 transition-colors rounded-md flex items-center gap-2"
              >
                <WhatsappLogo size={16} weight="fill" />
                Confirm & Dispatch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
