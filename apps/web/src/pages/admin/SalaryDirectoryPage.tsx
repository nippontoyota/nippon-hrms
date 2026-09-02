import { useVaultStore } from '@/stores/vaultStore';
import { useState, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { usePayrollRecords, salaryApi, useLatestConflictsJob, useBulkDeletePayroll } from '@/api/hooks';
import { MicrosoftExcelLogo, CaretLeft, CaretRight, Trash, X, ArrowsDownUp, FileCsv, Eye, EyeSlash, FilePdf, Spinner } from '@phosphor-icons/react';
import { PayrollRecord } from '@/api/types';
import { downloadApiBlob } from '@/lib/format';
import { useTableRowHighlight } from '@/lib/useTableRowHighlight';
import BulkUploadWizard from '@/components/BulkUploadWizard';
import ImportConflictPanel from '@/components/ImportConflictPanel';
import TablePagination from '@/components/TablePagination';

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

export default function SalaryDirectoryPage() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [month, setMonth] = useState(currentMonth);
  const [year, setYear]   = useState(currentYear);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showImport, setShowImport] = useState(false);
  const limit = 50;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmState, setConfirmState] = useState<{
    open: boolean; title: string; message: string; confirmLabel: string; onConfirm: () => void;
  }>({ open: false, title: '', message: '', confirmLabel: '', onConfirm: () => {} });

  // Sorting
  const [sortKey, setSortKey] = useState<SortKey>('employeeId');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const qc = useQueryClient();

  const vaultToken = useVaultStore((s) => s.vaultToken);
  const isUnlocked = !!vaultToken;
  const m = (val: number | undefined) => {
    if (!isUnlocked && (val === 0 || val === undefined)) return '***';
    return val?.toFixed(2) || '0.00';
  };

  const { tableRef, handleRowClick, rowHighlightClass } = useTableRowHighlight();
  const { data, isLoading } = usePayrollRecords(month, year, { page, limit, search: debouncedSearch });
  const records = data?.items ?? [];
  const total = data?.total ?? 0;
  const { data: conflictsJob } = useLatestConflictsJob('payroll');
  const bulkDelete = useBulkDeletePayroll();

  const isNextMonthDisabled = year === currentYear && month === currentMonth;
  const isNextYearDisabled = year === currentYear;

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelectedIds(new Set());
    setPage(1);
  };
  const nextMonth = () => {
    if (isNextMonthDisabled) return;
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelectedIds(new Set());
    setPage(1);
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
    return [...records].sort((a, b) => {
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

  const handleClearMonth = () => {
    if (total === 0) return;
    openConfirm(
      'Clear All Records',
      `You are about to permanently delete all ${total} payroll records for ${MONTHS[month - 1]} ${year}. This action cannot be undone.`,
      `Clear ${total} Records`,
      () => {
        closeConfirm();
        toast.promise(bulkDelete.mutateAsync({ month, year }), {
          loading: 'Deleting all records...',
          success: 'Successfully cleared month!',
          error: 'Failed to clear month',
        }).then(() => setSelectedIds(new Set()));
      }
    );
  };

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

  const handleImportComplete = () => {
    qc.invalidateQueries({ queryKey: ['payroll'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
    qc.invalidateQueries({ queryKey: ['import-conflicts-job', 'payroll'] });
    setShowImport(false);
    setSelectedIds(new Set());
  };



  const handleDownloadTemplate = async () => {
    try {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-').replace('T', '_');
      await downloadApiBlob(
        () => salaryApi.downloadTemplateExcel(month, year),
        `SalaryDirectory_Template_${timestamp}.xlsx`,
        'Failed to download template'
      );
      toast.success('Template downloaded');
    } catch {
      toast.error('Failed to download template');
    }
  };

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreviewId, setLoadingPreviewId] = useState<string | null>(null);

  useEffect(() => {
    if (!isUnlocked) {
      setPreviewUrl((url) => {
        if (url) window.URL.revokeObjectURL(url);
        return null;
      });
    }
  }, [isUnlocked]);

  const handlePreview = async (employeeId: string) => {
    if (!isUnlocked) return;
    try {
      setLoadingPreviewId(employeeId);
      const blob = await salaryApi.previewPayslip(employeeId, month, year);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      setPreviewUrl(url);
    } catch {
      toast.error('Failed to load payslip preview');
    } finally {
      setLoadingPreviewId(null);
    }
  };

  const closePreview = () => {
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  return (
    <div className="space-y-4 max-w-full relative">

      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wide">Salary Directory</h2>
        <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
          {filtered.length} records
        </span>
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">

        {/* ── Left: Month / Year navigator + Search ─────────────────── */}
        <div className="flex items-center gap-3 flex-1 min-w-[300px]">
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
                    onClick={() => { setMonth(i + 1); setSelectedIds(new Set()); setPage(1); }}
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
                onClick={() => { setYear(y => y - 1); setSelectedIds(new Set()); setPage(1); }}
                className="text-slate-400 hover:text-slate-700 dark:text-slate-200 cursor-pointer"
                title="Previous year"
              >
                <CaretLeft size={11} weight="bold" />
              </button>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100 tabular-nums w-10 text-center select-none">
                {year}
              </span>
              <button
                onClick={() => { setYear(y => y + 1); setSelectedIds(new Set()); setPage(1); }}
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
          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="btn-sm !px-4 !py-2 bg-white dark:bg-slate-800 text-green-600 hover:bg-green-50 border border-green-200 cursor-pointer flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors"
            >
              <Trash size={15} weight="bold" /> Delete ({selectedIds.size})
            </button>
          )}
          {total > 0 && (
            <button
              onClick={handleClearMonth}
              className="btn-sm !px-4 !py-2 bg-white dark:bg-slate-800 text-red-600 hover:bg-red-50 border border-red-200 cursor-pointer flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors"
            >
              <Trash size={15} weight="bold" /> Clear Month ({total})
            </button>
          )}
          <button 
            onClick={handleDownloadTemplate}
            className="btn-sm !px-4 !py-2 bg-blue-700 hover:bg-blue-800 text-white border border-blue-800 cursor-pointer flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors"
          >
            <FileCsv size={14} weight="bold" /> Download Template
          </button>
          <button
            type="button"
            onClick={() => setShowImport(true)}
            className="btn-success btn-sm !px-4 !py-2 bg-green-700 hover:bg-green-800 text-white border border-green-800 cursor-pointer flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors"
          >
            <MicrosoftExcelLogo size={16} weight="bold" /> Import data
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 px-1">
        <input
          type="search"
          placeholder="Search employee ID or name…"
          className="input text-sm max-w-xs !rounded-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="text-xs text-slate-500">{filtered.length} on page · {total} total</span>
      </div>

      <div className="mt-4 border-t border-l border-slate-300 dark:border-slate-600">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-4 bg-white dark:bg-slate-800 border-b border-r border-slate-300 dark:border-slate-600">
            <div className="spinner-dashed"></div>
            <p className="text-slate-500 dark:text-slate-400 font-mono text-[10px] uppercase tracking-widest">Fetching records...</p>
          </div>
        ) : (
          <div ref={tableRef} className="table-wrapper overflow-x-auto w-full">
            <table className="table-dense whitespace-nowrap">
              <thead>
                <tr>
                  <th className="w-8 text-center px-0">
                    <input
                      type="checkbox"
                      className="w-3.5 h-3.5 accent-green-600 cursor-pointer align-middle"
                      checked={allSelected}
                      onChange={toggleAll}
                      disabled={false}
                    />
                  </th>
                  <th className="px-5 py-3 font-semibold w-12 text-center border-r border-slate-300 dark:border-slate-600">Sl. No.</th>
                  <th className="w-16 text-center" data-ui-only>Preview</th>
                  <Th col="employeeId">EMP ID</Th>
                  <Th col="empNameSnapshot">Name</Th>
                  <Th col="lop" className="text-center">LOP</Th>
                  <Th col="days" className="text-center">Paid Days</Th>
                  <Th col="basicDa" className="text-right font-bold bg-slate-50 dark:bg-slate-900">Basic+DA</Th>
                  <Th col="hra" className="text-right">HRA</Th>
                  <Th col="travel" className="text-right">Travel</Th>
                  <Th col="childrenHostel" className="text-right">Children Hostel</Th>
                  <Th col="childrenEducation" className="text-right">Children Education</Th>
                  <Th col="mobile" className="text-right">Mobile</Th>
                  <Th col="conveyance" className="text-right">Convy</Th>
                  <Th col="branchAllowance" className="text-right">Br. Allow</Th>
                  <Th col="performanceAllowance" className="text-right">Performance Allowance</Th>
                  <Th col="specialAllowance" className="text-right">Spl All</Th>
                  <Th col="training" className="text-right">Training</Th>
                  <Th col="incentive" className="text-right text-[#eb0a1e] font-bold">Incentive</Th>
                  <Th col="totalEarWithIncen" className="text-right font-black">Total Ear with incen</Th>
                  <Th col="pf" className="text-right">PF</Th>
                  <Th col="esi075" className="text-right">ESI 0.75</Th>
                  <Th col="tds" className="text-right">TDS</Th>
                  <Th col="salAdv" className="text-right">Sal Adv</Th>
                  <Th col="additionalDeduction" className="text-right">Additional Deduction</Th>
                  <Th col="loan" className="text-right">Loan</Th>
                  <Th col="totalDeductions" className="text-right font-bold !text-red-700 dark:!text-red-400 !bg-red-50 dark:!bg-red-950">Total Deductions</Th>
                  <Th col="actualFinalAmount" className="text-right font-black !text-green-700 dark:!text-green-400 !bg-green-50 dark:!bg-green-950 text-sm">Actual Final Amount</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, idx) => {
                  const rowId = r.id || r.employeeId;
                  return (
                  <tr
                    key={rowId}
                    className={`cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-900 ${(r.id && selectedIds.has(r.id)) ? 'bg-red-50/50' : ''} ${rowHighlightClass(rowId)}`}
                    onClick={(ev) => handleRowClick(rowId, ev)}
                  >
                    <td className="text-center px-0">
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 accent-green-600 cursor-pointer align-middle"
                        checked={r.id ? selectedIds.has(r.id) : false}
                        onChange={() => r.id && toggleOne(r.id)}
                        disabled={false}
                      />
                    </td>
                    <td className="text-center font-mono text-slate-500 dark:text-slate-400 text-xs px-2 border-r border-slate-300 dark:border-slate-600">{(page - 1) * limit + idx + 1}</td>
                    <td className="text-center px-2" data-ui-only>
                        <button
                          onClick={(e) => { e.stopPropagation(); handlePreview(r.employeeId); }}
                          disabled={!isUnlocked || loadingPreviewId === r.employeeId}
                          className={`inline-flex items-center justify-center p-1.5 rounded transition-colors ${
                            isUnlocked
                              ? 'text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950 disabled:opacity-50 cursor-pointer'
                              : 'text-slate-400 opacity-40 cursor-not-allowed'
                          }`}
                          title={isUnlocked ? 'Preview Payslip' : 'Disable Privacy Mode to preview payslip PDF'}
                        >
                          {loadingPreviewId === r.employeeId ? (
                            <Spinner className="animate-spin" size={16} weight="bold" />
                          ) : isUnlocked ? (
                            <Eye size={16} weight="duotone" />
                          ) : (
                            <EyeSlash size={16} weight="duotone" />
                          )}
                        </button>
                    </td>
                    <td className="font-mono font-bold text-slate-900 dark:text-white">{r.employeeId}</td>
                    <td className="font-semibold text-slate-900 dark:text-white">{r.empNameSnapshot}</td>
                    <td className="text-center font-mono text-red-600">{r.lop?.toFixed(1) || '0.0'}</td>
                    <td className="text-center font-mono">{r.days?.toFixed(1) || '0.0'}</td>
                    <td className="text-right font-mono font-bold bg-slate-50 dark:bg-slate-900">{m(r.basicDa)}</td>
                    <td className="text-right font-mono">{m(r.hra)}</td>
                    <td className="text-right font-mono">{m(r.travel)}</td>
                    <td className="text-right font-mono">{m(r.childrenHostel)}</td>
                    <td className="text-right font-mono">{m(r.childrenEducation)}</td>
                    <td className="text-right font-mono">{m(r.mobile)}</td>
                    <td className="text-right font-mono">{m(r.conveyance)}</td>
                    <td className="text-right font-mono">{m(r.branchAllowance)}</td>
                    <td className="text-right font-mono">{m(r.performanceAllowance)}</td>
                    <td className="text-right font-mono">{m(r.specialAllowance)}</td>
                    <td className="text-right font-mono">{m(r.training)}</td>
                    <td className="text-right font-mono text-[#eb0a1e] font-bold">{m(r.incentive)}</td>
                    <td className="text-right font-mono font-black">{m(r.totalEarWithIncen)}</td>
                    <td className="text-right font-mono">{m(r.pf)}</td>
                    <td className="text-right font-mono">{m(r.esi075)}</td>
                    <td className="text-right font-mono">{m(r.tds)}</td>
                    <td className="text-right font-mono">{m(r.salAdv)}</td>
                    <td className="text-right font-mono">{m(r.additionalDeduction)}</td>
                    <td className="text-right font-mono">{m(r.loan)}</td>
                    <td className="text-right font-mono font-bold !text-red-700 dark:!text-red-400 !bg-red-50 dark:!bg-red-950">{m(r.totalDeductions)}</td>
                    <td className="text-right font-mono font-black !text-green-700 dark:!text-green-400 !bg-green-50 dark:!bg-green-950 text-sm">{m(r.actualFinalAmount)}</td>
                  </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={30} className="text-center p-8 text-slate-400 font-mono text-xs uppercase tracking-widest">
                      {`No payroll records for ${MONTHS[month - 1]} ${year}`}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <TablePagination page={page} limit={limit} total={total} onPageChange={setPage} />

      {showImport && (
        <BulkUploadWizard
          title={`Import payroll — ${MONTHS[month - 1]} ${year}`}
          entityType="payroll"
          showMonthYear
          month={month}
          year={year}
          onMonthChange={setMonth}
          onYearChange={setYear}
          onComplete={handleImportComplete}
          onCancel={() => setShowImport(false)}
        />
      )}

      {conflictsJob?.id && (conflictsJob.conflictsPending ?? 0) > 0 && (
        <ImportConflictPanel jobId={conflictsJob.id} entityType="payroll" />
      )}

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

      {/* PDF Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 md:p-8">
          <div className="bg-white dark:bg-slate-800 rounded shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 shrink-0">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                <FilePdf size={20} weight="fill" className="text-red-500" />
                <h3 className="font-bold uppercase tracking-wider text-sm">Payslip Preview</h3>
              </div>
              <button
                onClick={closePreview}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-500 dark:bg-slate-600 rounded transition-colors cursor-pointer"
              >
                <X size={18} weight="bold" />
              </button>
            </div>
            <div className="flex-1 w-full bg-slate-200 dark:bg-slate-600 p-2">
              <iframe
                src={previewUrl}
                className="w-full h-full rounded border border-slate-300 dark:border-slate-600 shadow-inner"
                title="PDF Preview"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
