import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { WhatsappLogo, X, PaperPlaneTilt, WarningCircle, ArrowClockwise } from '@phosphor-icons/react';
import { salaryApi } from '@/api/hooks';

interface Props {
  open: boolean;
  employee: { id: string; employeeId: string; name: string; mobileNo: string } | null;
  onClose: () => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatMobile(mobile: string): string {
  if (!mobile) return '';
  const clean = mobile.replace(/^\+91\s?/, '').trim();
  return `+91 ${clean}`;
}

export default function SendPayslipModal({ open, employee, onClose }: Props) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [sending, setSending] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  // Reset state whenever modal opens for a new employee
  useEffect(() => {
    if (open) {
      setInlineError(null);
      setSending(false);
      setMonth(currentMonth);
      setYear(currentYear);
    }
  }, [open, employee?.id, currentMonth, currentYear]);

  if (!open || !employee) return null;

  const handleSend = async () => {
    setInlineError(null);
    setSending(true);
    try {
      await salaryApi.sendPayslip(employee.id, month, year);
      toast.success(`Payslip for ${MONTHS[month - 1]} ${year} sent to ${employee.name}`);
      onClose();
    } catch (err: unknown) {
      const raw = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? '';

      // Detect "no payroll record" vs other errors and show inline
      if (raw.toLowerCase().includes('no payroll record') || raw.toLowerCase().includes('not found')) {
        setInlineError(
          `No salary record found for EMP ID ${employee.employeeId} (${employee.name}) ` +
          `for ${MONTHS[month - 1]} ${year}. ` +
          `Please upload the salary data for this period first.`
        );
      } else if (raw.toLowerCase().includes('no mobile')) {
        setInlineError(`Employee ${employee.employeeId} does not have a mobile number registered.`);
      } else {
        setInlineError(raw || 'Failed to send payslip. Please try again.');
      }
    } finally {
      setSending(false);
    }
  };

  const noMobile = !employee.mobileNo;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 bg-white border border-slate-300 shadow-2xl w-full max-w-md mx-4 rounded-lg overflow-hidden" style={{ borderRadius: '0.5rem' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-green-50">
          <div className="flex items-center gap-3">
            <WhatsappLogo size={20} weight="fill" className="text-green-600" />
            <span className="text-sm font-bold uppercase tracking-wider text-green-800">
              Send Payslip via WhatsApp
            </span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
            <X size={16} weight="bold" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4">

          {/* Employee info card */}
          <div className="bg-slate-50 border border-slate-200 px-4 py-3 space-y-1">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Employee</p>
            <p className="text-sm font-bold text-slate-900">{employee.name}</p>
            <p className="text-xs font-mono text-slate-500 flex items-center gap-2">
              <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 text-[10px] font-bold">
                {employee.employeeId}
              </span>
              {noMobile
                ? <span className="text-red-500 font-semibold">⚠ No mobile number registered</span>
                : <span>{formatMobile(employee.mobileNo)}</span>
              }
            </p>
          </div>

          {/* Inline error banner */}
          {inlineError && (
            <div className="flex gap-3 bg-red-50 border border-red-200 px-4 py-3">
              <WarningCircle size={18} weight="fill" className="text-red-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-red-800 uppercase tracking-wide">Cannot Send Payslip</p>
                <p className="text-xs text-red-700 leading-relaxed">{inlineError}</p>
              </div>
            </div>
          )}

          {/* Period selection */}
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-mono mb-2">Select Period</p>
            <div className="flex gap-3">
              <select
                className="flex-1 bg-white border border-slate-300 text-sm px-3 py-2 focus:outline-none focus:border-[#eb0a1e] rounded-md"
                style={{ borderRadius: '0.375rem' }}
                value={month}
                onChange={(e) => { setMonth(Number(e.target.value)); setInlineError(null); }}
              >
                {MONTHS.map((m, i) => {
                  const isDisabled = year === currentYear && i + 1 > currentMonth;
                  return (
                    <option key={m} value={i + 1} disabled={isDisabled}>
                      {m}
                    </option>
                  );
                })}
              </select>
              <input
                type="number"
                className="w-24 bg-white border border-slate-300 text-sm px-3 py-2 focus:outline-none focus:border-[#eb0a1e] rounded-md"
                style={{ borderRadius: '0.375rem' }}
                value={year}
                onChange={(e) => { 
                  let y = Number(e.target.value);
                  if (y > currentYear) y = currentYear;
                  setYear(y); 
                  if (y === currentYear && month > currentMonth) setMonth(currentMonth);
                  setInlineError(null); 
                }}
                min={2000}
                max={currentYear}
              />
            </div>
          </div>

          {!noMobile && !inlineError && (
            <p className="text-xs text-slate-400 leading-relaxed">
              The payslip PDF will be generated and delivered to{' '}
              <span className="font-mono text-slate-600">{formatMobile(employee.mobileNo)}</span> via WhatsApp.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-600 border border-slate-300 bg-white hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Close
          </button>
          {inlineError ? (
            <button
              onClick={() => setInlineError(null)}
              className="px-5 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer flex items-center gap-2"
            >
              <ArrowClockwise size={13} weight="bold" /> Try Different Period
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={sending || noMobile}
              className="px-5 py-2 text-xs font-bold uppercase tracking-wider text-white bg-green-700 hover:bg-green-800 border border-green-800 transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <PaperPlaneTilt size={14} weight="bold" />
              {sending ? 'Sending...' : `Send Payslip  ${MONTHS[month - 1]} ${year}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
