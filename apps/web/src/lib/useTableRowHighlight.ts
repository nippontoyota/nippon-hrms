import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';

export function useTableRowHighlight() {
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: globalThis.MouseEvent) => {
      if (tableRef.current && !tableRef.current.contains(e.target as Node)) {
        setHighlightedId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRowClick = useCallback((id: string, e: ReactMouseEvent<HTMLTableRowElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, input, a, select, textarea, label')) return;

    setHighlightedId((prev) => (prev === id ? null : id));
  }, []);

  const isRowHighlighted = useCallback((id: string) => highlightedId === id, [highlightedId]);

  const rowHighlightClass = useCallback(
    (id: string) => (isRowHighlighted(id) ? 'row-selected' : ''),
    [isRowHighlighted],
  );

  return { tableRef, handleRowClick, isRowHighlighted, rowHighlightClass };
}
