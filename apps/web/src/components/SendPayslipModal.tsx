import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { WhatsappLogo, X, PaperPlaneTilt, WarningCircle, ArrowClockwise, Spinner } from '@phosphor-icons/react';
import { salaryApi, useSendablePeriods } from '@/api/hooks';
import { getApiErrorMessage } from '@/lib/format';

import { MONTHS, comparePeriods } from '@/lib/payrollPeriod';

interface Props {
  open: boolean;
  employee: { id: string; employeeId: string; name: string; mobileNo: string } | null;
  onClose: () => void;
}

function formatMobile(mobile: string): string {
  if (!mobile) return '';
  const clean = mobile.replace(/^\+91\s?/, '').trim();
  return `+91 ${clean}`;
}

export default function SendPayslipModal({ open, employee, onClose }: Props) {
  const [month, setMonth] = useState<number | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const { data: periods = [], isLoading: periodsLoading } = useSendablePeriods(
    open && employee ? employee.id : undefined,
  );

  const availableYears = useMemo(
    () => [...new Set(periods.map((p) => p.year))].sort((a, b) => b - a),
    [periods],
  );

  const monthsForYear = useMemo(
    () =>
      periods
        .filter((p) => p.year === year)
        .map((p) => p.month)
        .sort((a, b) => a - b),
    [periods, year],
  );

  // Reset state and default to the most recent valid period when modal opens
  useEffect(() => {
    if (!open || !employee) return;
    setInlineError(null);
    setSending(false);
  }, [open, employee?.id]);

  useEffect(() => {
    if (!open || periodsLoading || periods.length === 0) return;
    const latest = [...periods].sort(comparePeriods)[0];
    setYear(latest.year);
    setMonth(latest.month);
  }, [open, periods, periodsLoading]);

  // Keep month in sync when year changes
  useEffect(() => {
    if (year == null || monthsForYear.length === 0) {
      setMonth(null);
      return;
    }
    if (month == null || !monthsForYear.includes(month)) {
      setMonth(monthsForYear[monthsForYear.length - 1]);
    }
  }, [year, monthsForYear, month]);

  if (!open || !employee) return null;

  const handleSend = async () => {
    if (month == null || year == null) return;
    setInlineError(null);
    setSending(true);
    try {
      await salaryApi.sendPayslip(employee.id, month, year);
      toast.success(`Payslip for ${MONTHS[month - 1]} ${year} sent via WhatsApp to ${employee.name}`);
      onClose();
    } catch (err: unknown) {
      const raw = getApiErrorMessage(err, 'Failed to send payslip. Please try again.');

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
  const noValidPeriods = !periodsLoading && periods.length === 0;
  const canSend = !noMobile && !noValidPeriods && month != null && year != null && !inlineError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />

      <div className="relative z-10 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 shadow-2xl w-full max-w-md mx-4 rounded-lg overflow-hidden" style={{ borderRadius: '0.5rem' }}>

        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700 bg-green-50">
          <div className="flex items-center gap-3">
            <WhatsappLogo size={20} weight="fill" className="text-green-600" />
            <span className="text-sm font-bold uppercase tracking-wider text-green-800">
              Send Payslip via WhatsApp
            </span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:text-slate-300 transition-colors cursor-pointer">
            <X size={16} weight="bold" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">

          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-3 space-y-1">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Employee</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white">{employee.name}</p>
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <span className="bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 px-1.5 py-0.5 text-[10px] font-bold">
                {employee.employeeId}
              </span>
              {noMobile
                ? <span className="text-red-500 font-semibold">⚠ No mobile number registered</span>
                : <span>{formatMobile(employee.mobileNo)}</span>
              }
            </p>
          </div>

          {inlineError && (
            <div className="flex gap-3 bg-red-50 border border-red-200 px-4 py-3">
              <WarningCircle size={18} weight="fill" className="text-red-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-red-800 uppercase tracking-wide">Cannot Send Payslip</p>
                <p className="text-xs text-red-700 leading-relaxed">{inlineError}</p>
              </div>
            </div>
          )}

          {noValidPeriods && !inlineError && (
            <div className="flex gap-3 bg-amber-50 border border-amber-200 px-4 py-3">
              <WarningCircle size={18} weight="fill" className="text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">No Valid Payslips</p>
                <p className="text-xs text-amber-700 leading-relaxed">
                  No validated payroll records are available for {employee.name}. Upload and validate salary data first.
                </p>
              </div>
            </div>
          )}

          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-mono mb-2">Select Period</p>
            {periodsLoading ? (
              <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                <Spinner size={14} className="animate-spin" />
                Loading available periods...
              </div>
            ) : noValidPeriods ? (
              <p className="text-xs text-slate-400">No periods available to send.</p>
            ) : (
              <div className="flex gap-3">
                <select
                  className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-sm px-3 py-2 focus:outline-none focus:border-[#eb0a1e] rounded-md"
                  style={{ borderRadius: '0.375rem' }}
                  value={month ?? ''}
                  onChange={(e) => { setMonth(Number(e.target.value)); setInlineError(null); }}
                  disabled={monthsForYear.length === 0}
                >
                  {monthsForYear.map((m) => (
                    <option key={m} value={m}>
                      {MONTHS[m - 1]}
                    </option>
                  ))}
                </select>
                <select
                  className="w-24 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-sm px-3 py-2 focus:outline-none focus:border-[#eb0a1e] rounded-md"
                  style={{ borderRadius: '0.375rem' }}
                  value={year ?? ''}
                  onChange={(e) => { setYear(Number(e.target.value)); setInlineError(null); }}
                >
                  {availableYears.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {canSend && (
            <p className="text-xs text-slate-400 leading-relaxed">
              The payslip PDF will be generated and delivered to{' '}
              <span className="font-mono text-slate-600 dark:text-slate-300">{formatMobile(employee.mobileNo)}</span> via WhatsApp.
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-600 dark:bg-slate-700 transition-colors cursor-pointer"
          >
            Close
          </button>
          {inlineError ? (
            <button
              onClick={() => setInlineError(null)}
              className="px-5 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-500 dark:bg-slate-600 border border-slate-300 dark:border-slate-600 transition-colors cursor-pointer flex items-center gap-2"
            >
              <ArrowClockwise size={13} weight="bold" /> Try Different Period
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={sending || !canSend}
              className="px-5 py-2 text-xs font-bold uppercase tracking-wider text-white bg-green-700 hover:bg-green-800 border border-green-800 transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <PaperPlaneTilt size={14} weight="bold" />
              {sending
                ? 'Sending...'
                : month != null && year != null
                  ? `Send Payslip  ${MONTHS[month - 1]} ${year}`
                  : 'Send Payslip'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
