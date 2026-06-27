import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { usePayrollRecords, salaryApi } from '@/api/hooks';
import { MicrosoftExcelLogo, CaretLeft, CaretRight, Trash, FloppyDisk, Warning, X, ArrowsDownUp } from '@phosphor-icons/react';
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

  // Preview Mode States
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<{ records: any[] } | null>(null);

  // Sorting
  const [sortKey, setSortKey] = useState<SortKey>('employeeId');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const qc = useQueryClient();
  const { data: records, isLoading } = usePayrollRecords(month, year);

  const hasData = !isLoading && records && records.length > 0;
  const isNextMonthDisabled = year === currentYear && month === currentMonth;
  const isNextYearDisabled = year === currentYear;

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelectedIds(new Set());
    cancelPreview();
  };
  const nextMonth = () => {
    if (isNextMonthDisabled) return;
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelectedIds(new Set());
    cancelPreview();
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
    const base = previewData ? previewData.records : (records ?? []);
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
  }, [records, previewData, sortKey, sortDir]);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    toast.promise(
      salaryApi.previewBulkUpload(file, month, year).then((res) => {
        setPreviewFile(file);
        setPreviewData(res);
        return res;
      }),
      {
        loading: `Parsing Excel file for ${MONTHS[month - 1]} ${year}...`,
        success: (res) => `Preview ready! Found ${res.records.length} records.`,
        error: 'Failed to parse Excel file',
      }
    );
    e.target.value = '';
  };

  const handleCommit = async () => {
    if (!previewFile) return;
    toast.promise(
      salaryApi.commitBulkUpload(previewFile, month, year).then((res) => {
        qc.invalidateQueries({ queryKey: ['payroll'] });
        qc.invalidateQueries({ queryKey: ['dashboard'] });
        setPreviewFile(null);
        setPreviewData(null);
        setSelectedIds(new Set());
        return res;
      }),
      {
        loading: `Saving payroll data to database...`,
        success: (res) => `Successfully committed ${res.successCount} payroll records!`,
        error: 'Failed to save payroll data',
      }
    );
  };

  const cancelPreview = () => {
    setPreviewFile(null);
    setPreviewData(null);
    setSelectedIds(new Set());
  };

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
                    onClick={() => { setMonth(i + 1); setSelectedIds(new Set()); cancelPreview(); }}
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
                onClick={() => { setYear(y => y - 1); setSelectedIds(new Set()); cancelPreview(); }}
                className="text-slate-400 hover:text-slate-700 dark:text-slate-200 cursor-pointer"
                title="Previous year"
              >
                <CaretLeft size={11} weight="bold" />
              </button>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100 tabular-nums w-10 text-center select-none">
                {year}
              </span>
              <button
                onClick={() => { setYear(y => y + 1); setSelectedIds(new Set()); cancelPreview(); }}
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

        {/* ── Right: Actions ─────────────────────────── */}
        <div className="flex items-center gap-3">
          {previewFile ? (
            <>
              <button
                onClick={cancelPreview}
                className="btn-sm !px-4 !py-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 cursor-pointer flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors"
              >
                <X size={15} weight="bold" /> Cancel
              </button>
              <button
                onClick={handleCommit}
                className="btn-sm !px-5 !py-2 bg-green-700 hover:bg-green-800 text-white border border-green-800 cursor-pointer flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors shadow-lg"
              >
                <FloppyDisk size={16} weight="bold" /> Save EPF to Database
              </button>
            </>
          ) : (
            <>
              {selectedIds.size > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="btn-sm !px-4 !py-2 bg-white dark:bg-slate-800 text-green-600 hover:bg-green-50 border border-green-200 cursor-pointer flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  <Trash size={15} weight="bold" /> Delete ({selectedIds.size})
                </button>
              )}
              {!hasData && (
                <label className="btn-success btn-sm !px-4 !py-2 bg-green-700 hover:bg-green-800 text-white border border-green-800 cursor-pointer flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors">
                  <MicrosoftExcelLogo size={16} weight="bold" /> Import from Excel
                  <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleFileUpload} />
                </label>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Preview Banner ──────────────────────────────────────── */}
      {previewFile && (
        <div className="bg-yellow-50 border border-yellow-200 px-4 py-3 flex items-center gap-3">
          <Warning size={20} weight="fill" className="text-yellow-600 shrink-0" />
          <div className="text-xs text-yellow-800">
            <strong className="uppercase tracking-wider font-bold block mb-0.5">Preview Mode</strong>
            This data is parsed from <strong>{previewFile.name}</strong> but has <strong>not</strong> been saved to the database yet. Please review the records and click "Save EPF to Database" to commit them.
          </div>
        </div>
      )}

      {/* ── Table ───────────────────────────────────────────────── */}
      <div className="mt-4 border-t border-l border-slate-300 dark:border-slate-600">
        {isLoading && !previewFile ? (
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
                      disabled={!!previewFile}
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
                  <Th col="basic" className="text-right">PF Wages</Th>
                  <Th col="pf" className="text-right bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300">EE PF (12%)</Th>
                  <Th col="pf833" className="text-right bg-purple-50 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300">ER Pen (8.33%)</Th>
                  <Th col="pf367" className="text-right bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300">ER PF (3.67%)</Th>
                  <Th col="epfER" className="text-right">EPF ER</Th>
                  <th className="text-right font-bold text-slate-700 dark:text-slate-200 select-none bg-green-50 dark:bg-green-900/20">Total ER (8.33+3.67)</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, idx) => (
                  <tr key={r.id || `preview-${idx}`} className={`hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-900 ${(r.id && selectedIds.has(r.id)) ? 'bg-red-50/50' : ''}`}>
                    <td className="text-center px-0">
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 accent-green-600 cursor-pointer align-middle"
                        checked={r.id ? selectedIds.has(r.id) : false}
                        onChange={() => r.id && toggleOne(r.id)}
                        disabled={!!previewFile}
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
                    <td className="text-right font-mono">{r.basic?.toFixed(2) || '0.00'}</td>
                    <td className="text-right font-mono font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20">{r.pf?.toFixed(2) || '0.00'}</td>
                    <td className="text-right font-mono font-bold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20">{r.pf833?.toFixed(2) || '0.00'}</td>
                    <td className="text-right font-mono font-bold text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20">{r.pf367?.toFixed(2) || '0.00'}</td>
                    <td className="text-right font-mono">{r.epfER?.toFixed(2) || '0.00'}</td>
                    <td className="text-right font-mono font-black text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20">{((r.pf367 || 0) + (r.pf833 || 0)).toFixed(2)}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={49} className="text-center p-8 text-slate-400 font-mono text-xs uppercase tracking-widest">
                      {previewFile ? 'No valid records found in the Excel file' : `No EPF records for ${MONTHS[month - 1]} ${year}`}
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
