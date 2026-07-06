import { useEffect, useMemo, useRef, useState } from 'react';
import { CaretDown, MagnifyingGlass, X } from '@phosphor-icons/react';

export interface SearchableSelectOption {
  label: string;
  value: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  compact?: boolean;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = '-- None --',
  searchPlaceholder = 'Search by name or EMP ID…',
  className = '',
  compact = false,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.value === value);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(o => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const select = (id: string) => {
    onChange(id);
    setOpen(false);
    setQuery('');
  };

  const triggerClass = compact
    ? `w-full bg-yellow-50 border border-dashed border-slate-400 px-2 py-1 text-xs text-black focus:outline-none focus:border-[#eb0a1e] focus:bg-white dark:bg-slate-800 transition-colors flex items-center justify-between gap-1 text-left ${className}`
    : `input flex items-center justify-between gap-2 text-left ${className}`;

  const itemClass = compact ? 'text-xs' : 'text-sm';
  const iconSize = compact ? 12 : 14;

  return (
    <div className="relative" ref={containerRef} onMouseDown={(e) => e.stopPropagation()}>
      <button
        type="button"
        className={triggerClass}
        onClick={() => setOpen(o => !o)}
      >
        <span className={`truncate ${selected ? 'text-slate-900' : 'text-slate-400'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          {selected && (
            <X
              size={iconSize}
              className="text-slate-400 hover:text-slate-700"
              onClick={(e) => {
                e.stopPropagation();
                select('');
              }}
            />
          )}
          <CaretDown size={iconSize} className="text-slate-400" />
        </span>
      </button>

      {open && (
        <div className="absolute z-50 mt-0.5 left-0 min-w-full w-max max-w-xs bg-white border border-slate-300 shadow-lg dark:bg-slate-800 dark:border-slate-600">
          <div className="flex items-center gap-2 px-2 py-1.5 border-b border-slate-200 dark:border-slate-600">
            <MagnifyingGlass size={iconSize} className="text-slate-400 shrink-0" />
            <input
              autoFocus
              className={`w-full bg-transparent ${itemClass} text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none`}
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
          <ul className={`max-h-48 overflow-y-auto py-0.5 ${itemClass}`}>
            <li>
              <button
                type="button"
                className={`w-full px-2 py-1 text-left ${itemClass} text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700`}
                onClick={() => select('')}
              >
                {placeholder}
              </button>
            </li>
            {filtered.map(o => (
              <li key={o.value}>
                <button
                  type="button"
                  className={`w-full px-2 py-1 text-left ${itemClass} hover:bg-slate-100 dark:hover:bg-slate-700 ${
                    o.value === value ? 'bg-slate-50 dark:bg-slate-700 font-semibold text-[#eb0a1e]' : 'text-slate-900 dark:text-slate-100'
                  }`}
                  onClick={() => select(o.value)}
                >
                  {o.label}
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className={`px-2 py-1.5 ${itemClass} text-slate-400`}>No matches</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
