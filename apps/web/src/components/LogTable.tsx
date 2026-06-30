import { useMemo, useState, type ReactNode } from 'react';
import { exportCsv } from '@/lib/format';
import { useTableRowHighlight } from '@/lib/useTableRowHighlight';

interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
}

interface LogTableProps<T extends Record<string, unknown>> {
  data: T[];
  columns: Column<T>[];
  searchKeys?: (keyof T)[];
  exportFilename?: string;
  emptyMessage?: string;
}

export default function LogTable<T extends Record<string, unknown>>({
  data,
  columns,
  searchKeys = [],
  exportFilename,
  emptyMessage = 'No records found.',
}: LogTableProps<T>) {
  const [search, setSearch] = useState('');
  const { tableRef, handleRowClick, rowHighlightClass } = useTableRowHighlight();

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((row) =>
      searchKeys.some((k) => String(row[k] ?? '').toLowerCase().includes(q)),
    );
  }, [data, search, searchKeys]);

  const handleExport = () => {
    if (!exportFilename) return;
    exportCsv(
      exportFilename,
      columns.map((c) => c.label),
      filtered.map((row) => columns.map((c) => String(row[c.key] ?? ''))),
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 justify-between">
        {searchKeys.length > 0 && (
          <input
            className="input max-w-xs"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        )}
        {exportFilename && (
          <button type="button" className="btn-secondary btn-sm" onClick={handleExport}>
            Export CSV
          </button>
        )}
      </div>
      <div className="card !p-0 overflow-hidden">
        <div ref={tableRef} className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="text-center text-on-surface-variant py-8">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                filtered.map((row, i) => {
                  const rowId = String(i);
                  return (
                  <tr
                    key={i}
                    className={`cursor-pointer ${rowHighlightClass(rowId)}`}
                    onClick={(ev) => handleRowClick(rowId, ev)}
                  >
                    {columns.map((c) => (
                      <td key={c.key}>{c.render ? c.render(row) : String(row[c.key] ?? '—')}</td>
                    ))}
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
