import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { employeesApi, useEmployees, useDeleteEmployee } from '@/api/hooks';
import { Employee } from '@/api/types';
import { MagnifyingGlass, MicrosoftExcelLogo, Plus, PencilSimple, Trash, ArrowUp, ArrowDown, ArrowsDownUp, WhatsappLogo, FloppyDisk, DownloadSimple, FileCsv } from '@phosphor-icons/react';
import ConfirmDialog from '@/components/ConfirmDialog';
import SendPayslipModal from '@/components/SendPayslipModal';
import { downloadApiBlob, exportCsv } from '@/lib/format';
import { EMPLOYEE_DIRECTORY_HEADERS } from '@/lib/exportColumns';
import EpfRecordsSection from '@/components/EpfRecordsSection';

type SortKey = 'employeeId' | 'name' | 'department' | 'doj' | 'branch' | 'designation';
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
  emp, field, type = 'text', className = '', formatFn,
  editingId, editForm, setEditForm, onSave
}: { 
  emp: Employee, field: keyof Employee, type?: string, className?: string, formatFn?: (v: any) => React.ReactNode,
  editingId: string | null, editForm: Partial<Employee>, setEditForm: React.Dispatch<React.SetStateAction<Partial<Employee>>>,
  onSave?: () => void
}) => {
  const isEditing = editingId === emp.id;
  
  if (isEditing) {
    return (
      <td className={`${className} p-1`}>
        <input
          type={type}
          className="w-full bg-yellow-50 border border-dashed border-slate-400 px-2 py-1 text-xs text-black focus:outline-none focus:border-[#eb0a1e] focus:bg-white dark:bg-slate-800 transition-colors"
          value={editForm[field] as string | number || ''}
          onChange={(e) => setEditForm(prev => ({ 
            ...prev, 
            [field]: type === 'number' ? (parseFloat(e.target.value) || 0) : e.target.value 
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

  const val = emp[field];
  if (formatFn) return <td className={className}>{formatFn(val)}</td>;
  if (type === 'number') return <td className={className}>{(val as number)?.toFixed(2) || '0.00'}</td>;
  return <td className={className}>{val as React.ReactNode}</td>;
};

export default function EmployeesPage() {
  const { data: employees, isLoading } = useEmployees();
  const deleteMutation = useDeleteEmployee();
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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
    const base = (employees ?? []).filter(
      (e) =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.employeeId.toLowerCase().includes(search.toLowerCase()) ||
        e.mobileNo.includes(search)
    );
    return [...base].sort((a, b) => {
      const av = (a[sortKey] ?? '') as string;
      const bv = (b[sortKey] ?? '') as string;
      // Numeric sort for employeeId
      if (sortKey === 'employeeId') {
        const an = parseInt(av, 10);
        const bn = parseInt(bv, 10);
        if (!isNaN(an) && !isNaN(bn)) return sortDir === 'asc' ? an - bn : bn - an;
      }
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [employees, search, sortKey, sortDir]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filtered.map((emp) => emp.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    toast.promise(
      employeesApi.commitBulkUpload(file).then((res) => {
        qc.invalidateQueries({ queryKey: ['employees'] });
        qc.invalidateQueries({ queryKey: ['dashboard'] });
        return res;
      }),
      {
        loading: 'Importing employees...',
        success: (res) => `Successfully imported ${res.successCount} employees!`,
        error: 'Failed to import employees',
      }
    );
    e.target.value = '';
  };

  const handleExportExcel = async () => {
    try {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-').replace('T', '_');
      await downloadApiBlob(
        () => employeesApi.exportExcel(),
        `EmployeeDirectory_${timestamp}.xlsx`,
        'Failed to export to Excel',
      );
      toast.success('Employee directory exported to Excel');
    } catch {
      toast.error('Failed to export to Excel');
    }
  };

  const handleDownloadTemplate = () => {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-').replace('T', '_');
    exportCsv(`EmployeeDirectory_Template_${timestamp}.csv`, [...EMPLOYEE_DIRECTORY_HEADERS], []);
    toast.success('Template downloaded');
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    openConfirm(
      'Delete Employees',
      `You are about to permanently delete ${selectedIds.size} employee${selectedIds.size > 1 ? 's' : ''}. This action cannot be undone and will also remove all associated salary records.`,
      `Delete ${selectedIds.size} Employee${selectedIds.size > 1 ? 's' : ''}`,
      () => {
        closeConfirm();
        toast.promise(
          (async () => {
            for (const id of Array.from(selectedIds)) {
              await employeesApi.delete(id);
            }
            qc.invalidateQueries({ queryKey: ['employees'] });
            qc.invalidateQueries({ queryKey: ['dashboard'] });
            setSelectedIds(new Set());
          })(),
          {
            loading: 'Deleting employees...',
            success: 'Successfully deleted selected employees!',
            error: 'Failed to delete some employees',
          }
        );
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
      {/* Top action bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-[300px]">
          <div className="relative w-full max-w-[500px]">
            <MagnifyingGlass className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              className="w-full bg-white dark:bg-slate-800 rounded-md pl-10 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-600 focus:outline-none focus:border-[#eb0a1e]"
              style={{ borderRadius: '0.375rem' }}
              placeholder="Search employee name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={!!editingId}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
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
              {selectedIds.size > 0 && (
                <button 
                  onClick={handleBulkDelete}
                  className="btn-sm !px-4 !py-2 bg-red-100 hover:bg-red-200 text-red-700 border border-red-200 cursor-pointer flex items-center gap-2 font-semibold transition-colors"
                >
                  <Trash size={16} weight="bold" /> Delete Selected ({selectedIds.size})
                </button>
              )}
              <label className="btn-success btn-sm !px-4 !py-2 bg-green-700 hover:bg-green-800 text-white border-green-800 cursor-pointer flex items-center gap-2">
                <MicrosoftExcelLogo size={16} weight="bold" /> Import from Excel
                <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleFileUpload} />
              </label>
              <button 
                onClick={handleDownloadTemplate}
                className="btn-sm !px-4 !py-2 bg-blue-700 hover:bg-blue-800 text-white border border-blue-800 cursor-pointer flex items-center gap-2 transition-colors"
              >
                <FileCsv size={16} weight="bold" /> Download Template
              </button>
              <button 
                onClick={handleExportExcel}
                className="btn-sm !px-4 !py-2 bg-purple-700 hover:bg-purple-800 text-white border border-purple-800 cursor-pointer flex items-center gap-2 transition-colors"
              >
                <DownloadSimple size={16} weight="bold" /> Export to Excel
              </button>
              <Link to="/admin/employees/new" className="btn-primary btn-sm !px-4 !py-2">
                <Plus size={16} weight="bold" /> Add Employee
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="mt-6 border-t border-l border-slate-300 dark:border-slate-600 relative z-0">
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
                      className="w-3.5 h-3.5 rounded-none border-slate-400 accent-green-600 cursor-pointer align-middle" 
                      checked={filtered.length > 0 && selectedIds.size === filtered.length}
                      onChange={handleSelectAll}
                      disabled={!!editingId}
                    />
                  </th>
                  <th className="px-5 py-3 font-semibold w-12 text-center">Sl. No.</th>
                  <Th col="employeeId">EMP ID</Th>
                  <Th col="name">Name</Th>
                  <Th col="department">Department</Th>
                  <th>Mobile Number</th>
                  <th>Level</th>
                  <Th col="doj">DOJ</Th>
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
                  <th className="sticky right-0 z-10 bg-slate-100 dark:bg-slate-700 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)] border-l border-slate-300 dark:border-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, index) => {
                  const isEditing = editingId === e.id;
                  
                  // Common cell props
                  const cellProps = {
                    emp: e, editingId, editForm, setEditForm, onSave: saveEdit
                  };

                  return (
                    <tr key={e.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors ${isEditing ? 'bg-yellow-50/50' : ''}`}>
                      <td className="text-center px-0">
                        <input 
                          type="checkbox" 
                          className="w-3.5 h-3.5 rounded-none border-slate-400 accent-green-600 cursor-pointer align-middle" 
                          checked={selectedIds.has(e.id)}
                          onChange={() => handleSelectOne(e.id)}
                          disabled={!!editingId}
                        />
                      </td>
                      <td className="text-center font-mono text-slate-500 dark:text-slate-400 text-xs px-2">{index + 1}</td>
                      <Cell {...cellProps} field="employeeId" className="font-mono font-bold text-slate-900 dark:text-white" />
                      <Cell {...cellProps} field="name" className="font-semibold text-slate-900 dark:text-white" />
                      <Cell {...cellProps} field="department" />
                      <Cell {...cellProps} field="mobileNo" className="font-mono text-slate-700 dark:text-slate-200" formatFn={v => formatMobile(v as string)} />
                      <Cell {...cellProps} field="level" className="text-center" />
                      <Cell {...cellProps} field="doj" />
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
                      
                      <td className={`sticky right-0 z-10 ${isEditing ? 'bg-yellow-50' : 'bg-white dark:bg-slate-800 group-hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-900'} border-l border-slate-300 dark:border-slate-600 text-center space-x-2 px-2 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]`}>
                        {isEditing ? (
                          <span className="text-[10px] font-bold text-yellow-700 uppercase tracking-wider px-2">Editing</span>
                        ) : (
                          <>
                            <div className="relative group/btn inline-flex items-center justify-center">
                              <button
                                className="text-green-600 hover:text-green-700 inline-flex cursor-pointer transition-colors"
                                onClick={() => setPayslipTarget({ id: e.id, employeeId: e.employeeId, name: e.name, mobileNo: e.mobileNo })}
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
                    <td colSpan={32} className="text-center p-4 text-slate-500 dark:text-slate-400 font-mono">NO RECORDS FOUND</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <EpfRecordsSection />
    </div>
  );
}
