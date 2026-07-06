import { useMemo, useState } from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react';

export interface ManagerOption {
  id: string;
  employeeId: string;
  name: string;
}

interface ManagerSelectProps {
  managers: ManagerOption[];
  value: string;
  onChange: (id: string) => void;
  compact?: boolean;
}

export default function ManagerSelect({ managers, value, onChange, compact = false }: ManagerSelectProps) {
  const [query, setQuery] = useState('');

  const selected = managers.find(m => m.id === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return managers;
    return managers.filter(
      m =>
        m.name.toLowerCase().includes(q) ||
        m.employeeId.toLowerCase().includes(q),
    );
  }, [managers, query]);

  const searchClass = compact
    ? 'w-full bg-yellow-50 border border-dashed border-slate-400 pl-8 pr-2 py-1 text-xs text-black placeholder:text-slate-400 focus:outline-none focus:border-[#eb0a1e] focus:bg-white'
    : 'input pl-9';

  const listClass = compact
    ? 'mt-1 max-h-36 overflow-y-auto border border-dashed border-slate-400 bg-white text-xs'
    : 'mt-2 max-h-48 overflow-y-auto border border-slate-300 bg-white';

  const itemClass = (active: boolean) =>
    compact
      ? `w-full px-2 py-1.5 text-left hover:bg-slate-100 ${active ? 'bg-slate-50 font-semibold text-[#eb0a1e]' : 'text-slate-900'}`
      : `w-full px-3 py-2 text-left text-sm hover:bg-slate-100 ${active ? 'bg-slate-50 font-semibold text-[#eb0a1e]' : 'text-slate-900'}`;

  return (
    <div className="w-full min-w-[200px]">
      <div className="relative">
        <MagnifyingGlass
          size={compact ? 12 : 16}
          className={`absolute left-2.5 text-slate-400 pointer-events-none ${compact ? 'top-1.5' : 'top-2.5'}`}
        />
        <input
          type="text"
          className={searchClass}
          placeholder="Search by name or EMP ID…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {selected && (
        <p className={`mt-1 text-slate-600 ${compact ? 'text-[10px]' : 'text-xs'}`}>
          Selected: <span className="font-semibold text-slate-900">{selected.name}</span>{' '}
          <span className="text-slate-400">({selected.employeeId})</span>
        </p>
      )}

      <div className={listClass} role="listbox">
        <button
          type="button"
          className={itemClass(!value)}
          onClick={() => onChange('')}
        >
          -- None --
        </button>
        {filtered.map(m => (
          <button
            key={m.id}
            type="button"
            className={itemClass(m.id === value)}
            onClick={() => onChange(m.id)}
          >
            {m.name} <span className="text-slate-400">({m.employeeId})</span>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className={`px-3 py-2 text-slate-400 ${compact ? 'text-xs' : 'text-sm'}`}>No matches</p>
        )}
      </div>
    </div>
  );
}
