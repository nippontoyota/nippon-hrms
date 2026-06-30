import { useState } from 'react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { importsApi, useImportConflicts } from '@/api/hooks';
import type { ImportEntityType } from '@/api/types';
import TablePagination from './TablePagination';

interface ImportConflictPanelProps {
  jobId: string;
  entityType: ImportEntityType;
  onResolved?: () => void;
}

export default function ImportConflictPanel({ jobId, entityType, onResolved }: ImportConflictPanelProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const qc = useQueryClient();

  const { data, isLoading } = useImportConflicts(jobId, page, search);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['import-conflicts', jobId] });
    qc.invalidateQueries({ queryKey: ['import-conflicts-job', entityType] });
    qc.invalidateQueries({ queryKey: [entityType === 'payroll' ? 'payroll' : entityType] });
    if (entityType === 'employees') qc.invalidateQueries({ queryKey: ['employees'] });
    if (entityType === 'epf') qc.invalidateQueries({ queryKey: ['epf'] });
    onResolved?.();
  };

  const resolve = async (ids: string[], resolution: 'keep_existing' | 'use_imported') => {
    if (ids.length === 0) return;
    try {
      await importsApi.resolveConflicts(jobId, ids, resolution);
      toast.success(`Resolved ${ids.length} conflict(s)`);
      setSelected(new Set());
      invalidate();
    } catch {
      toast.error('Failed to resolve conflicts');
    }
  };

  const resolveAll = async (resolution: 'keep_existing' | 'use_imported') => {
    try {
      await importsApi.resolveAllConflicts(jobId, resolution);
      toast.success('All conflicts resolved');
      setSelected(new Set());
      invalidate();
    } catch {
      toast.error('Failed to resolve conflicts');
    }
  };

  if (!data || data.total === 0) return null;

  return (
    <div className="card border-l-4 border-l-amber-500 space-y-3 mt-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-bold text-sm uppercase tracking-tight">Import conflicts ({data.total} pending)</h3>
          <p className="text-xs text-slate-500">Same record exists in DB and import file with different values. Choose which to keep.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button type="button" className="btn-secondary text-xs" onClick={() => resolveAll('keep_existing')}>
            Keep all existing
          </button>
          <button type="button" className="btn-primary text-xs" onClick={() => resolveAll('use_imported')}>
            Accept all imported
          </button>
        </div>
      </div>

      <input
        type="search"
        placeholder="Search by key or field…"
        className="input text-sm w-full max-w-xs"
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
      />

      <div className="overflow-x-auto">
        <table className="table-dense w-full text-xs">
          <thead>
            <tr>
              <th className="w-8">
                <input
                  type="checkbox"
                  checked={data.items.length > 0 && data.items.every((c) => selected.has(c.id))}
                  onChange={(e) => {
                    if (e.target.checked) setSelected(new Set(data.items.map((c) => c.id)));
                    else setSelected(new Set());
                  }}
                />
              </th>
              <th>Key</th>
              <th>Field</th>
              <th>Current</th>
              <th>Imported</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-4">Loading…</td></tr>
            ) : data.items.map((c) => (
              <tr key={c.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => {
                      const next = new Set(selected);
                      if (next.has(c.id)) next.delete(c.id);
                      else next.add(c.id);
                      setSelected(next);
                    }}
                  />
                </td>
                <td className="font-mono">{c.naturalKey}</td>
                <td>{c.fieldName}</td>
                <td className="max-w-[120px] truncate" title={c.existingValue}>{c.existingValue || '—'}</td>
                <td className="max-w-[120px] truncate" title={c.importedValue}>{c.importedValue || '—'}</td>
                <td className="whitespace-nowrap space-x-1">
                  <button type="button" className="text-xs underline" onClick={() => resolve([c.id], 'keep_existing')}>Keep</button>
                  <button type="button" className="text-xs underline text-primary" onClick={() => resolve([c.id], 'use_imported')}>Use imported</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected.size > 0 && (
        <div className="flex gap-2">
          <button type="button" className="btn-secondary text-xs" onClick={() => resolve(Array.from(selected), 'keep_existing')}>
            Keep selected ({selected.size})
          </button>
          <button type="button" className="btn-primary text-xs" onClick={() => resolve(Array.from(selected), 'use_imported')}>
            Use imported ({selected.size})
          </button>
        </div>
      )}

      <TablePagination page={page} limit={20} total={data.total} onPageChange={setPage} />
    </div>
  );
}
