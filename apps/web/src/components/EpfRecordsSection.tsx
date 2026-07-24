import { useMemo, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import {
  MagnifyingGlass,
  MicrosoftExcelLogo,
  Trash,
  ArrowUp,
  ArrowDown,
  ArrowsDownUp,
  DownloadSimple,
  FileCsv,
} from '@phosphor-icons/react';
import { epfApi, useDeleteEpfRecord, useEpfRecords, useLatestConflictsJob } from '@/api/hooks';
import type { EpfRecord } from '@/api/types';
import ConfirmDialog from '@/components/ConfirmDialog';
import { downloadApiBlob, exportCsv } from '@/lib/format';
import { EPF_DIRECTORY_HEADERS } from '@/lib/exportColumns';
import { useTableRowHighlight } from '@/lib/useTableRowHighlight';
import BulkUploadWizard from '@/components/BulkUploadWizard';
import ImportConflictPanel from '@/components/ImportConflictPanel';
import TablePagination from '@/components/TablePagination';

type SortKey = 'employeeId' | 'name' | 'department' | 'level' | 'doj' | 'doa';
type SortDir = 'asc' | 'desc';

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ArrowsDownUp size={11} className="ml-1 text-slate-400 opacity-50" />;
  return sortDir === 'asc'
    ? <ArrowUp size={11} className="ml-1 text-[#eb0a1e]" weight="bold" />
    : <ArrowDown size={11} className="ml-1 text-[#eb0a1e]" weight="bold" />;
}

function formatEsi(value: string): string {
  if (!value || value === '0') return '-';
  return value;
}

export default function EpfRecordsSection() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showImport, setShowImport] = useState(false);
  const limit = 50;

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isError, error, refetch } = useEpfRecords({ page, limit, search: debouncedSearch });
  const records = data?.items ?? [];
  const total = data?.total ?? 0;
  const { data: conflictsJob } = useLatestConflictsJob('epf');
  const deleteMutation = useDeleteEpfRecord();
  const qc = useQueryClient();
  const { tableRef, handleRowClick, rowHighlightClass } = useTableRowHighlight();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>('employeeId');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', confirmLabel: '', onConfirm: () => {} });

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
    return [...records].sort((a, b) => {
      const av = (a[sortKey] ?? '') as string;
      const bv = (b[sortKey] ?? '') as string;
      if (sortKey === 'employeeId') {
        const an = parseInt(av, 10);
        const bn = parseInt(bv, 10);
        if (!isNaN(an) && !isNaN(bn)) return sortDir === 'asc' ? an - bn : bn - an;
      }
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [records, sortKey, sortDir]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filtered.map((r) => r.employeeId)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleImportComplete = () => {
    qc.invalidateQueries({ queryKey: ['epf'] });
    qc.invalidateQueries({ queryKey: ['import-conflicts-job', 'epf'] });
    setShowImport(false);
  };

  const handleExportExcel = async () => {
    try {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-').replace('T', '_');
      await downloadApiBlob(
        () => epfApi.exportExcel(),
        `EPFDirectory_${timestamp}.xlsx`,
        'Failed to export EPF to Excel',
      );
      toast.success('EPF directory exported to Excel');
    } catch {
      toast.error('Failed to export EPF to Excel');
    }
  };

  const handleDownloadTemplate = () => {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-').replace('T', '_');
    exportCsv(`EPFDirectory_Template_${timestamp}.csv`, [...EPF_DIRECTORY_HEADERS], []);
    toast.success('EPF template downloaded');
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    openConfirm(
      'Delete EPF Records',
      `You are about to permanently delete ${selectedIds.size} EPF record${selectedIds.size > 1 ? 's' : ''}. This action cannot be undone.`,
      `Delete ${selectedIds.size} Record${selectedIds.size > 1 ? 's' : ''}`,
      () => {
        closeConfirm();
        toast.promise(
          (async () => {
            for (const id of Array.from(selectedIds)) {
              await epfApi.delete(id);
            }
            qc.invalidateQueries({ queryKey: ['epf'] });
            setSelectedIds(new Set());
          })(),
          {
            loading: 'Deleting EPF records...',
            success: 'Successfully deleted selected EPF records!',
            error: 'Failed to delete some EPF records',
          },
        );
      },
    );
  };

  return (
    <div className="space-y-4">
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeConfirm}
        danger
      />

      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wide">EPF Records</h2>
        <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
          {filtered.length} on page · {total} total
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative w-full max-w-[500px]">
          <MagnifyingGlass className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input
            className="w-full bg-white dark:bg-slate-800 rounded-md pl-10 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-600 focus:outline-none focus:border-[#eb0a1e]"
            placeholder="Search name, EMP ID, UAN, EPF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="btn-sm !px-4 !py-2 bg-red-100 hover:bg-red-200 text-red-700 border border-red-200 cursor-pointer flex items-center gap-2 font-semibold transition-colors"
            >
              <Trash size={16} weight="bold" /> Delete Selected ({selectedIds.size})
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowImport(true)}
            className="btn-success btn-sm !px-4 !py-2 bg-green-700 hover:bg-green-800 text-white border-green-800 cursor-pointer flex items-center gap-2"
          >
            <MicrosoftExcelLogo size={16} weight="bold" /> Import data
          </button>
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
        </div>
      </div>

      <div className="border-t border-l border-slate-300 dark:border-slate-600">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-4 bg-white dark:bg-slate-800 border-b border-r border-slate-300 dark:border-slate-600">
            <div className="spinner-dashed" />
            <p className="text-slate-500 dark:text-slate-400 font-mono text-[10px] uppercase tracking-widest">Fetching EPF records...</p>
          </div>
        ) : isError ? (
          <div className="p-8 flex flex-col items-center justify-center gap-3 bg-red-50 dark:bg-red-950/30 border-b border-r border-slate-300 dark:border-slate-600">
            <p className="text-red-700 dark:text-red-300 font-semibold text-sm">Failed to load EPF records from the server.</p>
            <p className="text-red-600/80 dark:text-red-400/80 text-xs font-mono max-w-lg text-center">
              {(error as Error)?.message || 'The API may need a restart after deploying EPF routes.'}
            </p>
            <button
              onClick={() => refetch()}
              className="btn-sm !px-4 !py-2 bg-red-700 hover:bg-red-800 text-white border border-red-800"
            >
              Retry
            </button>
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
                      checked={filtered.length > 0 && selectedIds.size === filtered.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-5 py-3 font-semibold w-12 text-center">Sl. No.</th>
                  <Th col="employeeId">EMP ID</Th>
                  <Th col="name">Name</Th>
                  <Th col="department">Department</Th>
                  <Th col="level">Level</Th>
                  <Th col="doj">DOJ</Th>
                  <th className="text-center">Years since DOJ</th>
                  <Th col="doa">DOA</Th>
                  <th className="text-center">Years since DOA</th>
                  <th>EPF Number</th>
                  <th>UAN</th>
                  <th>ESI</th>
                  <th className="sticky right-0 z-10 bg-slate-100 dark:bg-slate-700 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)] border-l border-slate-300 dark:border-slate-600 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r: EpfRecord, index) => (
                  <tr
                    key={r.employeeId}
                    className={`cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-900 transition-colors ${rowHighlightClass(r.employeeId)}`}
                    onClick={(ev) => handleRowClick(r.employeeId, ev)}
                  >
                    <td className="text-center px-0">
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 rounded-none border-slate-400 accent-green-600 cursor-pointer align-middle"
                        checked={selectedIds.has(r.employeeId)}
                        onChange={() => handleSelectOne(r.employeeId)}
                      />
                    </td>
                    <td className="text-center font-mono text-slate-500 dark:text-slate-400 text-xs px-2">{index + 1}</td>
                    <td className="font-mono font-bold text-slate-900 dark:text-white">{r.employeeId}</td>
                    <td className="font-semibold text-slate-900 dark:text-white">{r.name}</td>
                    <td>{r.department || '-'}</td>
                    <td className="text-center">{r.level || '-'}</td>
                    <td className="text-center font-mono text-sm">{r.doj || '-'}</td>
                    <td className="text-center font-mono text-sm">{r.yearsSinceDoj?.toFixed(1) ?? '-'}</td>
                    <td className="text-center font-mono text-sm">{r.doa || '-'}</td>
                    <td className="text-center font-mono text-sm">{r.yearsSinceDoa?.toFixed(1) ?? '-'}</td>
                    <td className="font-mono text-slate-700 dark:text-slate-300">{r.epfNumber || '-'}</td>
                    <td className="font-mono text-slate-700 dark:text-slate-300">{r.uan || '-'}</td>
                    <td className="font-mono text-slate-700 dark:text-slate-300">{formatEsi(r.esiNumber)}</td>
                    <td className="sticky right-0 z-10 bg-white dark:bg-slate-800 group-hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-900 border-l border-slate-300 dark:border-slate-600 text-center px-2 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">
                      <button
                        className="text-red-500 hover:text-red-700 inline-flex cursor-pointer transition-colors"
                        onClick={() => {
                          openConfirm(
                            'Delete EPF Record',
                            `Delete EPF record for ${r.name} (${r.employeeId})?`,
                            'Delete Record',
                            () => {
                              closeConfirm();
                              deleteMutation.mutate(r.employeeId);
                            },
                          );
                        }}
                      >
                        <Trash size={16} weight="duotone" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={14} className="text-center p-4 text-slate-500 dark:text-slate-400 font-mono">NO EPF RECORDS FOUND</td>
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
          title="Import EPF records"
          entityType="epf"
          onComplete={handleImportComplete}
          onCancel={() => setShowImport(false)}
        />
      )}

      {conflictsJob?.id && (conflictsJob.conflictsPending ?? 0) > 0 && (
        <ImportConflictPanel jobId={conflictsJob.id} entityType="epf" />
      )}
    </div>
  );
}
