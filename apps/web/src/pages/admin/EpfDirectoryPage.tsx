import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { usePayrollRecords, salaryApi, employeesApi } from '@/api/hooks';
import { MicrosoftExcelLogo, CaretLeft, CaretRight, Trash, ArrowsDownUp } from '@phosphor-icons/react';
import { PayrollRecord } from '@/api/types';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

type SortKey = keyof PayrollRecord;
type SortDir = 'asc' | 'desc';

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ArrowsDownUp size={11} className="ml-1 text-slate-400 opacity-50" />;
  return sortDir === 'asc'
    ? <CaretLeft size={11} weight="fill" className="ml-1 text-[#eb0a1e] rotate-90" />
    : <CaretRight size={11} weight="fill" className="ml-1 text-[#eb0a1e] rotate-90" />;
}

const calculateYears = (dateStr?: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const diff = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  return diff.toFixed(1);
};

export default function EpfDirectoryPage() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [month, setMonth] = useState(currentMonth);
  const [year, setYear]   = useState(currentYear);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmState, setConfirmState] = useState<{
    open: boolean; title: string; message: string; confirmLabel: string; onConfirm: () => void;
  }>({ open: false, title: '', message: '', confirmLabel: '', onConfirm: () => {} });

  // Removing Preview Mode States since EPF is a direct upload

  // Sorting
  const [sortKey, setSortKey] = useState<SortKey>('employeeId');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const qc = useQueryClient();
  const { data: records, isLoading } = usePayrollRecords(month, year);

  const isNextMonthDisabled = year === currentYear && month === currentMonth;
  const isNextYearDisabled = year === currentYear;

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelectedIds(new Set());
  };
  const nextMonth = () => {
    if (isNextMonthDisabled) return;
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelectedIds(new Set());
  };

  const handleSort = (col: SortKey) => {
    if (sortKey === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(col);
      setSortDir('asc');
    }
  };

  const Th = ({ col, className = '', children }: { col: SortKey; className?: string; children: React.ReactNode }) => (
    <th
      className={`cursor-pointer select-none hover:bg-slate-200 dark:hover:bg-slate-500 dark:bg-slate-600 transition-colors ${className}`}
      onClick={() => handleSort(col)}
    >
      <span className={`inline-flex items-center ${className.includes('text-right') ? 'justify-end w-full' : ''}`}>
        {children}
        <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
      </span>
    </th>
  );

  const filtered = useMemo(() => {
    const base = (records ?? []);
    return [...base].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];

      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }

      const avStr = (av ?? '') as string;
      const bvStr = (bv ?? '') as string;

      if (sortKey === 'employeeId') {
        const an = parseInt(avStr, 10);
        const bn = parseInt(bvStr, 10);
        if (!isNaN(an) && !isNaN(bn)) return sortDir === 'asc' ? an - bn : bn - an;
      }
      return sortDir === 'asc' ? avStr.localeCompare(bvStr) : bvStr.localeCompare(avStr);
    });
  }, [records, sortKey, sortDir]);

  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(r => r.id || r.employeeId)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const openConfirm = (title: string, message: string, confirmLabel: string, onConfirm: () => void) => {
    setConfirmState({ open: true, title, message, confirmLabel, onConfirm });
  };
  const closeConfirm = () => setConfirmState(prev => ({ ...prev, open: false }));

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    openConfirm(
      'Delete Payroll Records',
      `You are about to permanently delete ${selectedIds.size} payroll record${selectedIds.size > 1 ? 's' : ''}. This action cannot be undone.`,
      `Delete ${selectedIds.size} Record${selectedIds.size > 1 ? 's' : ''}`,
      () => {
        closeConfirm();
        toast.promise(
          (async () => {
            for (const id of Array.from(selectedIds)) {
              await salaryApi.delete(id);
            }
            qc.invalidateQueries({ queryKey: ['payroll'] });
            qc.invalidateQueries({ queryKey: ['dashboard'] });
            setSelectedIds(new Set());
          })(),
          {
            loading: 'Deleting payroll records...',
            success: 'Successfully deleted records!',
            error: 'Failed to delete some records',
          }
        );
      }
    );
  };

  const handleEpfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    toast.promise(
      employeesApi.commitEpfBulkUpload(file).then((res) => {
        qc.invalidateQueries({ queryKey: ['payroll'] });
        qc.invalidateQueries({ queryKey: ['dashboard'] });
        return res;
      }),
      {
        loading: `Importing EPF Master data...`,
        success: (res) => `Successfully imported EPF details for ${res.successCount} employees!`,
        error: 'Failed to import EPF file',
      }
    );
    e.target.value = '';
  };
  // Removed unused preview functions

  return (
    <div className="space-y-4 max-w-full relative">

      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">

        {/* ── Left: Month / Year navigator ─────────────────────────── */}
        <div className="flex items-center gap-3">
          <div className="flex items-center border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-sm divide-x divide-slate-300 rounded-md overflow-hidden" style={{ borderRadius: '0.375rem' }}>
            <button
              onClick={prevMonth}
              className="px-2.5 py-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-600 dark:bg-slate-700 hover:text-slate-800 dark:text-slate-100 transition-colors cursor-pointer"
              title="Previous month"
            >
              <CaretLeft size={14} weight="bold" />
            </button>

            {/* Month pills */}
            <div className="flex items-center px-1 gap-0.5">
              {MONTH_SHORT.map((m, i) => {
                const isDisabled = year === currentYear && i + 1 > currentMonth;
                return (
                  <button
                    key={m}
                    onClick={() => { setMonth(i + 1); setSelectedIds(new Set()); }}
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

            {/* Year */}
            <div className="flex items-center gap-1 px-2">
              <button
                onClick={() => { setYear(y => y - 1); setSelectedIds(new Set()); }}
                className="text-slate-400 hover:text-slate-700 dark:text-slate-200 cursor-pointer"
                title="Previous year"
              >
                <CaretLeft size={11} weight="bold" />
              </button>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100 tabular-nums w-10 text-center select-none">
                {year}
              </span>
              <button
                onClick={() => { setYear(y => y + 1); setSelectedIds(new Set()); }}
                disabled={isNextYearDisabled}
                className={`transition-colors ${isNextYearDisabled ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-slate-700 dark:text-slate-200 cursor-pointer'}`}
                title="Next year"
              >
                <CaretRight size={11} weight="bold" />
              </button>
            </div>

            <button
              onClick={nextMonth}
              disabled={isNextMonthDisabled}
              className={`px-2.5 py-2 transition-colors ${isNextMonthDisabled ? 'text-slate-200 cursor-not-allowed' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-600 dark:bg-slate-700 hover:text-slate-800 dark:text-slate-100 cursor-pointer'}`}
              title="Next month"
            >
              <CaretRight size={14} weight="bold" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="btn-sm !px-4 !py-2 bg-white dark:bg-slate-800 text-green-600 hover:bg-green-50 border border-green-200 cursor-pointer flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors"
            >
              <Trash size={15} weight="bold" /> Delete ({selectedIds.size})
            </button>
          )}
          <label className="btn-success btn-sm !px-4 !py-2 bg-green-700 hover:bg-green-800 text-white border border-green-800 cursor-pointer flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors shadow-lg">
            <MicrosoftExcelLogo size={16} weight="bold" /> Upload EPF Master
            <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleEpfUpload} />
          </label>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────── */}
      <div className="mt-4 border-t border-l border-slate-300 dark:border-slate-600">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-4 bg-white dark:bg-slate-800 border-b border-r border-slate-300 dark:border-slate-600">
            <div className="spinner-dashed"></div>
            <p className="text-slate-500 dark:text-slate-400 font-mono text-[10px] uppercase tracking-widest">Fetching records...</p>
          </div>
        ) : (
          <div className="table-wrapper overflow-x-auto w-full">
            <table className="table-dense whitespace-nowrap">
              <thead>
                <tr>
                  <th className="w-8 text-center px-0">
                    <input
                      type="checkbox"
                      className="w-3.5 h-3.5 accent-green-600 cursor-pointer align-middle"
                      checked={allSelected}
                      onChange={toggleAll}
                    />
                  </th>
                  <th className="px-5 py-3 font-semibold w-12 text-center border-r border-slate-300 dark:border-slate-600">Sl. No.</th>
                  <Th col="employeeId">EMP ID</Th>
                  <Th col="empNameSnapshot">Name</Th>
                  <Th col="department">Department</Th>
                  <Th col="level">New Level</Th>
                  <Th col="doj" className="text-center">DOJ</Th>
                  <th className="px-5 py-3 font-semibold text-center border-r border-slate-300 dark:border-slate-600">No: of Yrs</th>
                  <Th col="doa" className="text-center">DOA</Th>
                  <th className="px-5 py-3 font-semibold text-center border-r border-slate-300 dark:border-slate-600">No: of Yrs</th>
                  <Th col="epfNumber">KR/KCH/19297/</Th>
                  <Th col="uan">UAN</Th>
                  <Th col="esiNumber">ESI</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, idx) => (
                  <tr key={r.id || `row-${idx}`} className={`hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-900 ${(r.id && selectedIds.has(r.id)) ? 'bg-red-50/50' : ''}`}>
                    <td className="text-center px-0">
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 accent-green-600 cursor-pointer align-middle"
                        checked={r.id ? selectedIds.has(r.id) : false}
                        onChange={() => r.id && toggleOne(r.id)}
                      />
                    </td>
                    <td className="text-center font-mono text-slate-500 dark:text-slate-400 text-xs px-2 border-r border-slate-300 dark:border-slate-600">{idx + 1}</td>
                    <td className="font-mono font-bold text-slate-900 dark:text-white">{r.employeeId}</td>
                    <td className="font-semibold text-slate-900 dark:text-white">{r.empNameSnapshot}</td>
                    <td className="text-slate-600 dark:text-slate-400">{r.department || '-'}</td>
                    <td className="text-slate-600 dark:text-slate-400">{r.level || '-'}</td>
                    <td className="text-center font-mono text-sm">{r.doj || '-'}</td>
                    <td className="text-center font-mono text-sm text-slate-500">{calculateYears(r.doj) || '-'}</td>
                    <td className="text-center font-mono text-sm">{r.doa || '-'}</td>
                    <td className="text-center font-mono text-sm text-slate-500">{calculateYears(r.doa) || '-'}</td>
                    <td className="font-mono text-slate-700 dark:text-slate-300">{r.epfNumber || '-'}</td>
                    <td className="font-mono text-slate-700 dark:text-slate-300">{r.uan || '-'}</td>
                    <td className="font-mono text-slate-700 dark:text-slate-300">{r.esiNumber || '-'}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={49} className="text-center p-8 text-slate-400 font-mono text-xs uppercase tracking-widest">
                      No EPF records for {MONTHS[month - 1]} {year}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmState.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={closeConfirm} />
          <div className="relative z-10 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider">{confirmState.title}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{confirmState.message}</p>
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={closeConfirm}
                className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-500 dark:bg-slate-600 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmState.onConfirm}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 transition-colors cursor-pointer"
              >
                {confirmState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
