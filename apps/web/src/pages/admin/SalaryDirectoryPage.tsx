import { useVaultStore } from '@/stores/vaultStore';
import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { usePayrollRecords, salaryApi } from '@/api/hooks';
import { MicrosoftExcelLogo, CaretLeft, CaretRight, Trash, FloppyDisk, Warning, X, ArrowsDownUp, MagnifyingGlass, DownloadSimple, FileCsv, Eye, FilePdf, Spinner } from '@phosphor-icons/react';
import { PayrollRecord } from '@/api/types';
import { downloadApiBlob, exportCsv } from '@/lib/format';
import { SALARY_DIRECTORY_HEADERS } from '@/lib/exportColumns';
import { useTableRowHighlight } from '@/lib/useTableRowHighlight';

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

  // Search
  const [search, setSearch] = useState('');

  const qc = useQueryClient();

  const vaultToken = useVaultStore((s) => s.vaultToken);
  const isUnlocked = !!vaultToken;
  const m = (val: number | undefined) => {
    if (!isUnlocked && (val === 0 || val === undefined)) return '***';
    return val?.toFixed(2) || '0.00';
  };

  const { tableRef, handleRowClick, rowHighlightClass } = useTableRowHighlight();
  const { data: records, isLoading } = usePayrollRecords(month, year);

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
    let result = [...base].sort((a, b) => {
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

    // Apply search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter(r =>
        r.employeeId?.toLowerCase().includes(searchLower) ||
        r.empNameSnapshot?.toLowerCase().includes(searchLower) ||
        r.mobileNo?.toLowerCase().includes(searchLower)
      );
    }

    return result;
  }, [records, previewData, sortKey, sortDir, search]);

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

  const handleExportExcel = async () => {
    if (previewFile || previewData) {
      toast.error('Save payroll data to the database before exporting');
      return;
    }
    try {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-').replace('T', '_');
      await downloadApiBlob(
        () => salaryApi.exportExcel(month, year),
        `SalaryDirectory_${timestamp}.xlsx`,
        'Failed to export to Excel',
      );
      toast.success('Salary directory exported to Excel');
    } catch {
      toast.error('Failed to export to Excel');
    }
  };

  const handleDownloadTemplate = () => {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-').replace('T', '_');
    exportCsv(`SalaryDirectory_Template_${timestamp}.csv`, [...SALARY_DIRECTORY_HEADERS], []);
    toast.success('Template downloaded');
  };

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreviewId, setLoadingPreviewId] = useState<string | null>(null);

  const handlePreview = async (employeeId: string) => {
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

          {/* Search Input */}
          <div className="relative w-full max-w-[400px] flex-1">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search employee..."
              className="w-full bg-white dark:bg-slate-800 rounded-md pl-10 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-600 focus:outline-none focus:border-[#eb0a1e]"
              style={{ borderRadius: '0.375rem' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={!!previewFile}
            />
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
                <FloppyDisk size={16} weight="bold" /> Save Payroll to Database
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
              <label className="btn-success btn-sm !px-4 !py-2 bg-green-700 hover:bg-green-800 text-white border border-green-800 cursor-pointer flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors">
                <MicrosoftExcelLogo size={16} weight="bold" /> Import from Excel
                <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleFileUpload} />
              </label>
              <button 
                onClick={handleDownloadTemplate}
                className="btn-sm !px-4 !py-2 bg-blue-700 hover:bg-blue-800 text-white border border-blue-800 cursor-pointer flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors"
              >
                <FileCsv size={14} weight="bold" /> Download Template
              </button>
              <button 
                onClick={handleExportExcel}
                className="btn-sm !px-4 !py-2 bg-purple-700 hover:bg-purple-800 text-white border border-purple-800 cursor-pointer flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors"
              >
                <DownloadSimple size={14} weight="bold" /> Export to Excel
              </button>
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
            This data is parsed from <strong>{previewFile.name}</strong> but has <strong>not</strong> been saved to the database yet. Please review the records and click "Save Payroll to Database" to commit them.
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
                      disabled={!!previewFile}
                    />
                  </th>
                  <th className="px-5 py-3 font-semibold w-12 text-center border-r border-slate-300 dark:border-slate-600">Sl. No.</th>
                  <th className="w-16 text-center" data-ui-only>Preview</th>
                  <Th col="employeeId">EMP ID</Th>
                  <Th col="empNameSnapshot">Name</Th>
                  <Th col="leaves" className="text-center">Leaves</Th>
                  <Th col="lop" className="text-center">LOP</Th>
                  <Th col="days" className="text-center">Days</Th>
                  <Th col="basic" className="text-right">Basic</Th>
                  <Th col="da" className="text-right">DA</Th>
                  <Th col="basicDa" className="text-right font-bold bg-slate-50 dark:bg-slate-900">Basic+DA</Th>
                  <Th col="hra" className="text-right">HRA</Th>
                  <Th col="travel" className="text-right">Travel</Th>
                  <Th col="childrenHostel" className="text-right">Children Hostel</Th>
                  <Th col="childrenEducation" className="text-right">Children Education</Th>
                  <Th col="mobile" className="text-right">Mobile</Th>
                  <Th col="conveyance" className="text-right">Convy</Th>
                  <Th col="branchAllowance" className="text-right">Br. Allow</Th>
                  <Th col="washAllowance" className="text-right">W.A.</Th>
                  <Th col="specialAllowance" className="text-right">Spl All</Th>
                  <Th col="training" className="text-right">Training</Th>
                  <Th col="incentive" className="text-right text-[#eb0a1e] font-bold">Incentive</Th>
                  <Th col="totalEarWithIncen" className="text-right font-black">Total Ear with incen</Th>
                  <Th col="grossSalWithoutIncentives" className="text-right font-bold">Gross Sal-With out Incentives</Th>
                  <Th col="pf" className="text-right">PF</Th>
                  <Th col="pf367" className="text-right">3.67</Th>
                  <Th col="pf833" className="text-right">8.33</Th>
                  <Th col="esi075" className="text-right">ESI 0.75</Th>
                  <Th col="esi325" className="text-right">ESI 3.25</Th>
                  <Th col="tds" className="text-right">TDS</Th>
                  <Th col="salAdv" className="text-right">Sal Adv</Th>
                  <Th col="additionalDeduction" className="text-right">Additional Deduction</Th>
                  <Th col="loan" className="text-right">Loan</Th>
                  <Th col="companyStatutoryContribution" className="text-right">Company's Statutory contribution</Th>
                  <Th col="reimbMedical" className="text-right">Reimbursement of Medical Expences</Th>
                  <Th col="reimbLTA" className="text-right">Reimbursement of LTA</Th>
                  <Th col="zetaMealVoucher" className="text-right">Zeta Meal Voucher / Gift Card / Sudexo</Th>
                  <Th col="reimbTravel" className="text-right">Reimbursement of Travel Expences</Th>
                  <Th col="totalReimbursement" className="text-right font-bold">Total Reimbursement</Th>
                  <Th col="netIncentive" className="text-right">Net Incentive</Th>
                  <Th col="totalDeductions" className="text-right font-bold !text-red-700 dark:!text-red-400 !bg-red-50 dark:!bg-red-950">Total Deductions</Th>
                  <Th col="actualFinalAmount" className="text-right font-black !text-green-700 dark:!text-green-400 !bg-green-50 dark:!bg-green-950 text-sm">Actual Final Amount</Th>
                  <Th col="lopDeduction" className="text-right">LOP.1</Th>
                  <Th col="epfER" className="text-right">EPF ER</Th>
                  <Th col="grossForPT" className="text-right">Gross for PT</Th>
                  <Th col="advance" className="text-right">Advance</Th>
                  <Th col="pf367" className="text-right">3.67.1</Th>
                  <Th col="pf833" className="text-right">8.33.1</Th>
                  <th className="text-right font-bold text-slate-500 dark:text-slate-400 select-none">Total</th>
                  <Th col="absents" className="text-center text-red-600 font-bold">ABSENTS</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, idx) => {
                  const rowId = r.id || `preview-${idx}`;
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
                        disabled={!!previewFile}
                      />
                    </td>
                    <td className="text-center font-mono text-slate-500 dark:text-slate-400 text-xs px-2 border-r border-slate-300 dark:border-slate-600">{idx + 1}</td>
                    <td className="text-center px-2" data-ui-only>
                      {!previewFile && (
                        <button
                          onClick={() => handlePreview(r.employeeId)}
                          disabled={loadingPreviewId === r.employeeId}
                          className="inline-flex items-center justify-center p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950 disabled:opacity-50 cursor-pointer transition-colors rounded"
                          title="Preview Payslip"
                        >
                          {loadingPreviewId === r.employeeId ? (
                            <Spinner className="animate-spin" size={16} weight="bold" />
                          ) : (
                            <Eye size={16} weight="duotone" />
                          )}
                        </button>
                      )}
                    </td>
                    <td className="font-mono font-bold text-slate-900 dark:text-white">{r.employeeId}</td>
                    <td className="font-semibold text-slate-900 dark:text-white">{r.empNameSnapshot}</td>
                    <td className="text-center font-mono">{r.leaves?.toFixed(1) || '0.0'}</td>
                    <td className="text-center font-mono text-red-600">{r.lop?.toFixed(1) || '0.0'}</td>
                    <td className="text-center font-mono">{r.days?.toFixed(1) || '0.0'}</td>
                    <td className="text-right font-mono">{m(r.basic)}</td>
                    <td className="text-right font-mono">{m(r.da)}</td>
                    <td className="text-right font-mono font-bold bg-slate-50 dark:bg-slate-900">{m(r.basicDa)}</td>
                    <td className="text-right font-mono">{m(r.hra)}</td>
                    <td className="text-right font-mono">{m(r.travel)}</td>
                    <td className="text-right font-mono">{m(r.childrenHostel)}</td>
                    <td className="text-right font-mono">{m(r.childrenEducation)}</td>
                    <td className="text-right font-mono">{m(r.mobile)}</td>
                    <td className="text-right font-mono">{m(r.conveyance)}</td>
                    <td className="text-right font-mono">{m(r.branchAllowance)}</td>
                    <td className="text-right font-mono">{m(r.washAllowance)}</td>
                    <td className="text-right font-mono">{m(r.specialAllowance)}</td>
                    <td className="text-right font-mono">{m(r.training)}</td>
                    <td className="text-right font-mono text-[#eb0a1e] font-bold">{m(r.incentive)}</td>
                    <td className="text-right font-mono font-black">{m(r.totalEarWithIncen)}</td>
                    <td className="text-right font-mono font-bold">{m(r.grossSalWithoutIncentives)}</td>
                    <td className="text-right font-mono">{m(r.pf)}</td>
                    <td className="text-right font-mono">{m(r.pf367)}</td>
                    <td className="text-right font-mono">{m(r.pf833)}</td>
                    <td className="text-right font-mono">{m(r.esi075)}</td>
                    <td className="text-right font-mono">{m(r.esi325)}</td>
                    <td className="text-right font-mono">{m(r.tds)}</td>
                    <td className="text-right font-mono">{m(r.salAdv)}</td>
                    <td className="text-right font-mono">{m(r.additionalDeduction)}</td>
                    <td className="text-right font-mono">{m(r.loan)}</td>
                    <td className="text-right font-mono">{m(r.companyStatutoryContribution)}</td>
                    <td className="text-right font-mono">{m(r.reimbMedical)}</td>
                    <td className="text-right font-mono">{m(r.reimbLTA)}</td>
                    <td className="text-right font-mono">{m(r.zetaMealVoucher)}</td>
                    <td className="text-right font-mono">{m(r.reimbTravel)}</td>
                    <td className="text-right font-mono font-bold">{m(r.totalReimbursement)}</td>
                    <td className="text-right font-mono">{m(r.netIncentive)}</td>
                    <td className="text-right font-mono font-bold !text-red-700 dark:!text-red-400 !bg-red-50 dark:!bg-red-950">{m(r.totalDeductions)}</td>
                    <td className="text-right font-mono font-black !text-green-700 dark:!text-green-400 !bg-green-50 dark:!bg-green-950 text-sm">{m(r.actualFinalAmount)}</td>
                    <td className="text-right font-mono">{m(r.lopDeduction)}</td>
                    <td className="text-right font-mono">{m(r.epfER)}</td>
                    <td className="text-right font-mono">{m(r.grossForPT)}</td>
                    <td className="text-right font-mono">{m(r.advance)}</td>
                    <td className="text-right font-mono">{m(r.pf367)}</td>
                    <td className="text-right font-mono">{m(r.pf833)}</td>
                    <td className="text-right font-mono font-bold">{m((r.pf367 || 0) + (r.pf833 || 0))}</td>
                    <td className="text-center font-mono font-bold text-red-600">{r.absents?.toFixed(1) || '0.0'}</td>
                  </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={50} className="text-center p-8 text-slate-400 font-mono text-xs uppercase tracking-widest">
                      {previewFile ? 'No valid records found in the Excel file' : `No payroll records for ${MONTHS[month - 1]} ${year}`}
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
