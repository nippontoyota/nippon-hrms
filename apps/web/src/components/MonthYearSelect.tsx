interface MonthYearSelectProps {
  month: number;
  year: number;
  onMonthChange: (m: number) => void;
  onYearChange: (y: number) => void;
  className?: string;
}

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: new Date(2000, i).toLocaleString('en-IN', { month: 'long' }),
}));

export default function MonthYearSelect({
  month,
  year,
  onMonthChange,
  onYearChange,
  className = '',
}: MonthYearSelectProps) {
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  return (
    <div className={`flex gap-3 ${className}`}>
      <div className="flex-1">
        <label className="label">Month</label>
        <select className="input" value={month} onChange={(e) => onMonthChange(Number(e.target.value))}>
          {MONTHS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>
      <div className="flex-1">
        <label className="label">Year</label>
        <select className="input" value={year} onChange={(e) => onYearChange(Number(e.target.value))}>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
