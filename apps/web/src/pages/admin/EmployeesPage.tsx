import { useVaultStore } from '@/stores/vaultStore';
import { useState, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { employeesApi, useEmployees, useDeleteEmployee, useLatestConflictsJob } from '@/api/hooks';
import { Employee } from '@/api/types';
import { MagnifyingGlass, MicrosoftExcelLogo, Plus, PencilSimple, Trash, ArrowUp, ArrowDown, ArrowsDownUp, WhatsappLogo, FloppyDisk, FileCsv } from '@phosphor-icons/react';
import ConfirmDialog from '@/components/ConfirmDialog';
import SendPayslipModal from '@/components/SendPayslipModal';
import { downloadApiBlob } from '@/lib/format';
import { useTableRowHighlight } from '@/lib/useTableRowHighlight';
import BulkUploadWizard from '@/components/BulkUploadWizard';
import BulkDeleteWizard from '@/components/BulkDeleteWizard';
import ImportConflictPanel from '@/components/ImportConflictPanel';
import TablePagination from '@/components/TablePagination';
import SearchableSelect from '@/components/SearchableSelect';

type SortKey = 'employeeId' | 'name' | 'department' | 'managerName' | 'doj' | 'birthday' | 'branch' | 'designation';
type SortDir = 'asc' | 'desc';

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ArrowsDownUp size={11} className="ml-1 text-slate-400 opacity-50" />;
  return sortDir === 'asc'
    ? <ArrowUp size={11} className="ml-1 text-[#eb0a1e]" weight="bold" />
    : <ArrowDown size={11} className="ml-1 text-[#eb0a1e]" weight="bold" />;
}

function formatMobile(mobile: string): string {
  if (!mobile) return '';
  const clean = mobile.replace(/^\+91\s?/, '').trim();
  return `+91 ${clean}`;
}

const Cell = ({ 
  emp, field, displayField, type = 'text', className = '', formatFn,
  editingId, editForm, setEditForm, onSave, options
}: { 
  emp: Employee, field: keyof Employee, displayField?: keyof Employee, type?: string, className?: string, formatFn?: (v: any) => React.ReactNode,
  editingId: string | null, editForm: Partial<Employee>, setEditForm: React.Dispatch<React.SetStateAction<Partial<Employee>>>,
  onSave?: () => void,
  options?: {label: string, value: string}[]
}) => {
  const vaultToken = useVaultStore(s => s.vaultToken);
  const isUnlocked = !!vaultToken;
  const isEditing = editingId === emp.id;
  
  if (!isUnlocked && ['basic', 'revisedBasicDa', 'hra', 'totalSalary', 'accountNumber', 'ifscCode', 'bankName'].includes(field as string)) {
      return <td className={`${className} p-1 opacity-50`}>***</td>;
  }

  
  if (isEditing) {
    if (options) {
      return (
        <td className={`${className} p-1`}>
          <SearchableSelect
            compact
            options={options}
            value={(editForm[field] as string) || ''}
            onChange={(val) => setEditForm(prev => ({ ...prev, [field]: val }))}
          />
        </td>
      );
    }
    return (
      <td className={`${className} p-1`}>
        <input
          type={type}
          className={type === 'checkbox' ? 'w-4 h-4 cursor-pointer accent-green-600' : 'w-full bg-yellow-50 border border-dashed border-slate-400 px-2 py-1 text-xs text-black focus:outline-none focus:border-[#eb0a1e] focus:bg-white dark:bg-slate-800 transition-colors'}
          value={type !== 'checkbox' ? (editForm[field] as string | number || '') : undefined}
          checked={type === 'checkbox' ? !!editForm[field] : undefined}
          onChange={(e) => setEditForm(prev => ({ 
            ...prev, 
            [field]: type === 'checkbox' ? e.target.checked : (type === 'number' ? (parseFloat(e.target.value) || 0) : e.target.value) 
          }))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && onSave) {
              onSave();
            }
          }}
        />
      </td>
    );
  }

  const val = emp[displayField || field];
  if (formatFn) return <td className={className}>{formatFn(val)}</td>;
  if (type === 'number') return <td className={className}>{(val as number)?.toFixed(2) || '0.00'}</td>;
  return <td className={className}>{val as React.ReactNode}</td>;
};

export default function EmployeesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [showBulkDeleteWizard, setShowBulkDeleteWizard] = useState(false);
  const limit = 50;

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
      setSelectedIds(new Set());
      setSelectAllMatching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useEmployees({ page, limit, search: debouncedSearch });
  const employees = data?.items ?? [];
  const total = data?.total ?? 0;
  const { data: conflictsJob } = useLatestConflictsJob('employees');
  const deleteMutation = useDeleteEmployee();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAllMatching, setSelectAllMatching] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('employeeId');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  
  // Inline Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Employee>>({});

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', confirmLabel: '', onConfirm: () => {} });
  
  const [payslipTarget, setPayslipTarget] = useState<{
    id: string; employeeId: string; name: string; mobileNo: string;
  } | null>(null);
  
  const qc = useQueryClient();
  const { tableRef, handleRowClick, rowHighlightClass } = useTableRowHighlight();

  const openConfirm = (title: string, message: string, confirmLabel: string, onConfirm: () => void) => {
    setConfirmDialog({ open: true, title, message, confirmLabel, onConfirm });
  };
  const closeConfirm = () => setConfirmDialog(d => ({ ...d, open: false }));

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
      <span className="inline-flex items-center">
        {children}
        <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
      </span>
    </th>
  );

  const filtered = useMemo(() => {
    return [...employees].sort((a, b) => {
      const av = (a[sortKey] ?? '') as string;
      const bv = (b[sortKey] ?? '') as string;
      if (sortKey === 'employeeId') {
        const an = parseInt(av, 10);
        const bn = parseInt(bv, 10);
        if (!isNaN(an) && !isNaN(bn)) return sortDir === 'asc' ? an - bn : bn - an;
      }
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [employees, sortKey, sortDir]);

  const allPageSelected = filtered.length > 0 && filtered.every((emp) => selectedIds.has(emp.id));
  const headerChecked = selectAllMatching || allPageSelected;
  const selectedCount = selectAllMatching ? total : selectedIds.size;
  const showSelectAllBanner = !selectAllMatching && allPageSelected && total > filtered.length;

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filtered.map((emp) => emp.id)));
      setSelectAllMatching(false);
    } else {
      setSelectedIds(new Set());
      setSelectAllMatching(false);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectAllMatching(false);
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleImportComplete = () => {
    qc.invalidateQueries({ queryKey: ['employees'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
    qc.invalidateQueries({ queryKey: ['import-conflicts-job', 'employees'] });
    setShowImport(false);
  };

  const handleBulkDeleteComplete = () => {
    qc.invalidateQueries({ queryKey: ['employees'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
    setShowBulkDeleteWizard(false);
  };



  const handleDownloadTemplate = async () => {
    try {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-').replace('T', '_');
      await downloadApiBlob(
        () => employeesApi.downloadTemplateExcel(),
        `EmployeeDirectory_Template_${timestamp}.xlsx`,
        'Failed to download template'
      );
      toast.success('Template downloaded');
    } catch {
      toast.error('Failed to download template');
    }
  };

  const handleExportExcel = async () => {
    try {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-').replace('T', '_');
      await downloadApiBlob(
        () => employeesApi.exportExcel(),
        `EmployeeDirectory_Export_${timestamp}.xlsx`,
        'Failed to export directory'
      );
      toast.success('Directory exported successfully');
    } catch {
      toast.error('Failed to export directory');
    }
  };

  const handleBulkDelete = () => {
    if (selectedCount === 0) return;
    openConfirm(
      'Delete Employees',
      `You are about to permanently delete ${selectedCount} employee${selectedCount > 1 ? 's' : ''}. This action cannot be undone and will also remove associated payroll, EPF, and dispatch records.`,
      `Delete ${selectedCount} Employee${selectedCount > 1 ? 's' : ''}`,
      () => {
        closeConfirm();
        setIsDeleting(true);
        toast.promise(
          (async () => {
            const result = selectAllMatching
              ? await employeesApi.bulkDelete({ deleteAll: true, search: debouncedSearch || undefined })
              : await employeesApi.bulkDelete({ ids: Array.from(selectedIds) });
            qc.invalidateQueries({ queryKey: ['employees'] });
            qc.invalidateQueries({ queryKey: ['dashboard'] });
            setSelectedIds(new Set());
            setSelectAllMatching(false);
            return result;
          })(),
          {
            loading: 'Deleting employees...',
            success: (result) => `Deleted ${result.deleted} employee${result.deleted === 1 ? '' : 's'}.`,
            error: 'Failed to delete employees',
          }
        ).finally(() => setIsDeleting(false));
      }
    );
  };

  const handleClearDirectory = () => {
    if (total === 0) return;
    openConfirm(
      'Clear Employee Directory',
      `You are about to permanently delete all ${total} employees. This action cannot be undone and will also remove all associated payroll, EPF, and dispatch records.`,
      `Clear ${total} Employees`,
      () => {
        closeConfirm();
        setIsDeleting(true);
        toast.promise(
          (async () => {
            const result = await employeesApi.bulkDelete({ deleteAll: true });
            qc.invalidateQueries({ queryKey: ['employees'] });
            qc.invalidateQueries({ queryKey: ['dashboard'] });
            setSelectedIds(new Set());
            setSelectAllMatching(false);
            return result;
          })(),
          {
            loading: 'Clearing employee directory...',
            success: (result) => `Cleared ${result.deleted} employee${result.deleted === 1 ? '' : 's'}.`,
            error: 'Failed to clear employee directory',
          }
        ).finally(() => setIsDeleting(false));
      }
    );
  };

  const startEdit = (e: Employee) => {
    setEditingId(e.id);
    setEditForm({ ...e });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async () => {
    if (!editingId) return;
    toast.promise(
      employeesApi.update(editingId, editForm).then(() => {
        qc.invalidateQueries({ queryKey: ['employees'] });
        setEditingId(null);
        setEditForm({});
      }),
      {
        loading: 'Saving changes...',
        success: 'Employee updated successfully',
        error: 'Failed to update employee'
      }
    );
  };

  return (
    <div className="space-y-4 max-w-full">
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeConfirm}
        danger
      />
      <SendPayslipModal
        open={!!payslipTarget}
        employee={payslipTarget}
        onClose={() => setPayslipTarget(null)}
      />
      
      {showBulkDeleteWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <BulkDeleteWizard 
            onComplete={handleBulkDeleteComplete}
            onCancel={() => setShowBulkDeleteWizard(false)}
          />
        </div>
      )}

      {/* Top action bar */}
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wide">Employee Directory</h2>
        <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
          {filtered.length} on page · {total} total
        </span>
      </div>

      <div className="flex items-center justify-between gap-4 flex-nowrap whitespace-nowrap overflow-x-auto pb-1">
        <div className="flex items-center gap-3 w-full max-w-xs">
          <div className="relative w-full">
            <MagnifyingGlass className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              className="w-full bg-white dark:bg-slate-800 rounded-none pl-10 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-600 focus:outline-none focus:border-[#eb0a1e]"
              placeholder="Search employee name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={!!editingId}
            />
          </div>
        </div>
        <div className="flex items-center gap-3 flex-nowrap whitespace-nowrap">
          {editingId ? (
            <div className="flex items-center gap-2">
              <button 
                onClick={cancelEdit}
                className="btn-sm !px-4 !py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 font-semibold transition-colors uppercase tracking-wider text-[10px]"
              >
                Cancel
              </button>
              <button 
                onClick={saveEdit}
                className="btn-sm !px-4 !py-1.5 bg-green-700 hover:bg-green-800 text-white font-bold transition-colors flex items-center gap-2 shadow-md uppercase tracking-wider text-[10px]"
              >
                <FloppyDisk size={14} weight="bold" /> Save Changes
              </button>
            </div>
          ) : (
            <>
              {selectedCount > 0 && (
                <button 
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                  className="btn-sm !px-4 !py-2 bg-red-100 hover:bg-red-200 text-red-700 border border-red-200 cursor-pointer flex items-center gap-2 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash size={16} weight="bold" /> Delete Selected ({selectedCount})
                </button>
              )}
              {total > 0 && (
                <button
                  onClick={handleClearDirectory}
                  disabled={isDeleting}
                  className="btn-sm !px-4 !py-2 bg-white dark:bg-slate-800 text-red-600 hover:bg-red-50 border border-red-200 cursor-pointer flex items-center gap-2 font-bold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash size={16} weight="bold" /> Clear Directory ({total})
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowBulkDeleteWizard(true)}
                className="btn-sm !px-4 !py-2 bg-red-100 hover:bg-red-200 text-red-700 border border-red-200 cursor-pointer flex items-center gap-2 font-semibold transition-colors"
              >
                <Trash size={16} weight="bold" /> Bulk Delete (Excel)
              </button>
              <button 
                onClick={handleDownloadTemplate}
                className="btn-sm !px-4 !py-2 bg-blue-700 hover:bg-blue-800 text-white border border-blue-800 cursor-pointer flex items-center gap-2 transition-colors"
              >
                <FileCsv size={16} weight="bold" /> Download Template
              </button>
              <button 
                onClick={handleExportExcel}
                className="btn-sm !px-4 !py-2 bg-slate-700 hover:bg-slate-800 text-white border border-slate-800 cursor-pointer flex items-center gap-2 transition-colors"
              >
                <MicrosoftExcelLogo size={16} weight="bold" /> Export Table
              </button>
              <button
                type="button"
                onClick={() => setShowImport(true)}
                className="btn-success btn-sm !px-4 !py-2 bg-green-700 hover:bg-green-800 text-white border-green-800 cursor-pointer flex items-center gap-2"
              >
                <MicrosoftExcelLogo size={16} weight="bold" /> Import data
              </button>
              <Link to="/admin/employees/new" className="btn-primary btn-sm !px-4 !py-2" title="Add Employee">
                <Plus size={16} weight="bold" />
              </Link>
            </>
          )}
        </div>
      </div>

      {showSelectAllBanner && (
        <div className="mt-3 px-4 py-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-sm text-blue-900 dark:text-blue-100 flex items-center gap-2 flex-wrap">
          <span>
            All {filtered.length} employees on this page are selected.
          </span>
          <button
            type="button"
            onClick={() => setSelectAllMatching(true)}
            className="font-semibold underline hover:no-underline"
          >
            Select all {total} employees
          </button>
        </div>
      )}

      <div className="mt-6 border-t border-l border-slate-300 dark:border-slate-600 relative z-0">
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
                      className="w-3.5 h-3.5 rounded-none border-slate-400 accent-green-600 cursor-pointer align-middle" 
                      checked={headerChecked}
                      onChange={handleSelectAll}
                      disabled={!!editingId}
                    />
                  </th>
                  <th className="px-5 py-3 font-semibold w-12 text-center">Sl. No.</th>
                  <Th col="employeeId">EMP ID</Th>
                  <Th col="name">Name</Th>
                  <Th col="department">Department</Th>
                  <Th col="managerName">Reporting Manager</Th>
                  <th>Mobile Number</th>
                  <th>Level</th>
                  <Th col="doj">DOJ</Th>
                  <Th col="birthday">Date of Birth</Th>
                  <th>No: of Yrs</th>
                  <Th col="branch">Branch</Th>
                  <Th col="designation">Designation</Th>
                  <th className="text-right">Basic</th>
                  <th className="text-right">DA</th>
                  <th className="text-right">Revised Basic+DA</th>
                  <th className="text-right">HRA</th>
                  <th className="text-right">Travel</th>
                  <th className="text-right">Hostel</th>
                  <th className="text-right">Children</th>
                  <th className="text-right font-bold">Total Salary</th>
                  <th className="text-right">Mobile</th>
                  <th className="text-right">Convy</th>
                  <th className="text-right">Wash Allo</th>
                  <th className="text-right">Bran. Allo</th>
                  <th className="text-right">Spl All</th>
                  <th className="text-right">Training</th>
                  <th className="text-right font-bold">Total Allowances</th>
                  <th className="text-right font-black text-[#eb0a1e]">Total salary With Allowances</th>
                  <th>Bank</th>
                  <th>A/c No.</th>
                  <th>Bank Branch</th>
                  <th>IFSC Code</th>
                  <th>Zone</th>
                  <th className="text-center">Health Card Eligible</th>
                  <th className="text-center">Health Card No.</th>
                  <th className="text-center">Policy No.</th>
                  <th className="text-center">Valid Up To</th>
                  <th className="sticky right-0 z-10 bg-slate-100 dark:bg-slate-700 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)] border-l border-slate-300 dark:border-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((e, index) => {
                  const isEditing = editingId === e.id;
                  
                  // Common cell props
                  const cellProps = {
                    emp: e, editingId, editForm, setEditForm, onSave: saveEdit
                  };

                  return (
                    <tr
                      key={e.id}
                      className={`cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors ${isEditing ? 'bg-yellow-50/50' : ''} ${rowHighlightClass(e.id)}`}
                      onClick={(ev) => handleRowClick(e.id, ev)}
                    >
                      <td className="text-center px-0">
                        <input 
                          type="checkbox" 
                          className="w-3.5 h-3.5 rounded-none border-slate-400 accent-green-600 cursor-pointer align-middle" 
                          checked={selectAllMatching || selectedIds.has(e.id)}
                          onChange={() => handleSelectOne(e.id)}
                          disabled={!!editingId}
                        />
                      </td>
                      <td className="text-center font-mono text-slate-500 dark:text-slate-400 text-xs px-2">{(page - 1) * limit + index + 1}</td>
                      <Cell {...cellProps} field="employeeId" className="font-mono font-bold text-slate-900 dark:text-white" />
                      <Cell {...cellProps} field="name" className="font-semibold text-slate-900 dark:text-white" />
                      <Cell {...cellProps} field="department" />
                      <Cell {...cellProps} field="managerId" displayField="managerName" options={employees.map(emp => ({ label: `${emp.name} (${emp.employeeId})`, value: emp.id }))} />
                      <Cell {...cellProps} field="mobileNo" className="font-mono text-slate-700 dark:text-slate-200" formatFn={v => formatMobile(v as string)} />
                      <Cell {...cellProps} field="level" className="text-center" />
                      <Cell {...cellProps} field="doj" type="date" />
                      <Cell {...cellProps} field="birthday" type="date" />
                      <Cell {...cellProps} field="yearsExperience" type="number" className="text-center" formatFn={v => v?.toString()} />
                      <Cell {...cellProps} field="branch" />
                      <Cell {...cellProps} field="designation" />
                      <Cell {...cellProps} field="basic" type="number" className="text-right font-mono" />
                      <Cell {...cellProps} field="da" type="number" className="text-right font-mono" />
                      <Cell {...cellProps} field="revisedBasicDa" type="number" className="text-right font-mono" />
                      <Cell {...cellProps} field="hra" type="number" className="text-right font-mono" />
                      <Cell {...cellProps} field="travel" type="number" className="text-right font-mono" />
                      <Cell {...cellProps} field="hostel" type="number" className="text-right font-mono" />
                      <Cell {...cellProps} field="children" type="number" className="text-right font-mono" />
                      <Cell {...cellProps} field="totalSalary" type="number" className="text-right font-mono font-bold bg-slate-50 dark:bg-slate-900" />
                      <Cell {...cellProps} field="mobile" type="number" className="text-right font-mono" />
                      <Cell {...cellProps} field="conveyance" type="number" className="text-right font-mono" />
                      <Cell {...cellProps} field="washAllowance" type="number" className="text-right font-mono" />
                      <Cell {...cellProps} field="branchAllowance" type="number" className="text-right font-mono" />
                      <Cell {...cellProps} field="specialAllowance" type="number" className="text-right font-mono" />
                      <Cell {...cellProps} field="training" type="number" className="text-right font-mono" />
                      <Cell {...cellProps} field="totalAllowances" type="number" className="text-right font-mono font-bold bg-slate-50 dark:bg-slate-900" />
                      <Cell {...cellProps} field="totalSalaryWithAllowances" type="number" className="text-right font-mono font-black text-[#eb0a1e] bg-slate-50 dark:bg-slate-900" />
                      <Cell {...cellProps} field="bankName" />
                      <Cell {...cellProps} field="accountNumber" className="font-mono" />
                      <Cell {...cellProps} field="bankBranch" />
                      <Cell {...cellProps} field="ifscCode" className="font-mono" />
                      <Cell {...cellProps} field="zone" />
                      <Cell 
                        {...cellProps} 
                        field="isHealthCardEligible" 
                        type="checkbox"
                        className="text-center font-bold"
                        formatFn={v => v ? <span className="text-green-600">Yes</span> : <span className="text-slate-400">No</span>}
                      />
                      <Cell 
                        {...cellProps} 
                        field="healthCardNo" 
                        className="text-center font-mono"
                        formatFn={v => (!e.isHealthCardEligible || !v) ? <span className="text-slate-400 italic">N/A</span> : v}
                      />
                      <Cell 
                        {...cellProps} 
                        field="healthPolicyNo" 
                        className="text-center font-mono"
                        formatFn={v => (!e.isHealthCardEligible || !v) ? <span className="text-slate-400 italic">N/A</span> : v}
                      />
                      <Cell 
                        {...cellProps} 
                        field="healthCardValidUpto" 
                        className="text-center"
                        formatFn={v => (!e.isHealthCardEligible || !v) ? <span className="text-slate-400 italic">N/A</span> : v}
                      />
                      
                      <td className={`sticky right-0 z-10 ${isEditing ? 'bg-yellow-50' : 'bg-white dark:bg-slate-800 group-hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-900'} border-l border-slate-300 dark:border-slate-600 text-center space-x-2 px-2 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]`}>
                        {isEditing ? (
                          <span className="text-[10px] font-bold text-yellow-700 uppercase tracking-wider px-2">Editing</span>
                        ) : (
                          <>
                            <div className="relative group/btn inline-flex items-center justify-center">
                              <button
                                type="button"
                                className="text-green-600 hover:text-green-700 inline-flex cursor-pointer transition-colors"
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  setPayslipTarget({ id: e.id, employeeId: e.employeeId, name: e.name, mobileNo: e.mobileNo });
                                }}
                                disabled={!!editingId}
                              >
                                <WhatsappLogo size={16} weight="duotone" className={editingId ? 'opacity-30' : ''} />
                              </button>
                              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/btn:block bg-slate-800 text-white text-[10px] uppercase font-bold tracking-wider px-2 py-1 whitespace-nowrap z-50 pointer-events-none">Send Payslip</span>
                            </div>

                            <div className="relative group/btn inline-flex items-center justify-center ml-2">
                              <button 
                                onClick={() => startEdit(e)} 
                                className="text-blue-600 hover:text-blue-800 inline-flex cursor-pointer transition-colors"
                                disabled={!!editingId}
                              >
                                <PencilSimple size={16} weight="duotone" className={editingId ? 'opacity-30' : ''} />
                              </button>
                              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/btn:block bg-slate-800 text-white text-[10px] uppercase font-bold tracking-wider px-2 py-1 whitespace-nowrap z-50 pointer-events-none">Edit</span>
                            </div>

                            <div className="relative group/btn inline-flex items-center justify-center ml-2">
                              <button
                                className="text-red-500 hover:text-red-700 inline-flex cursor-pointer transition-colors"
                                disabled={!!editingId}
                                onClick={() => {
                                    openConfirm(
                                      'Delete Employee',
                                      `You are about to permanently delete ${e.name} (${e.employeeId}). This cannot be undone.`,
                                      'Delete Employee',
                                      () => { closeConfirm(); deleteMutation.mutate(e.id); }
                                    );
                                  }}
                              >
                                <Trash size={16} weight="duotone" className={editingId ? 'opacity-30' : ''} />
                              </button>
                              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/btn:block bg-slate-800 text-white text-[10px] uppercase font-bold tracking-wider px-2 py-1 whitespace-nowrap z-50 pointer-events-none">Delete</span>
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={33} className="text-center p-4 text-slate-500 dark:text-slate-400 font-mono">NO RECORDS FOUND</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <TablePagination
        page={page}
        limit={limit}
        total={total}
        onPageChange={(p) => {
          setPage(p);
          setSelectedIds(new Set());
          setSelectAllMatching(false);
        }}
      />

      {showImport && (
        <BulkUploadWizard
          title="Import employees"
          entityType="employees"
          onComplete={handleImportComplete}
          onCancel={() => setShowImport(false)}
        />
      )}

      {conflictsJob?.id && (conflictsJob.conflictsPending ?? 0) > 0 && (
        <ImportConflictPanel jobId={conflictsJob.id} entityType="employees" />
      )}
    </div>
  );
}
