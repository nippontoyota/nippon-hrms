import { useState } from 'react';
import LogTable from '@/components/LogTable';
import MonthYearSelect from '@/components/MonthYearSelect';
import { useDispatchLogs } from '@/api/hooks';
import { dispatchItemBadge } from '@/lib/format';
import type { DispatchLogEntry } from '@/api/types';

export default function DispatchLogPage() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [status, setStatus] = useState('');
  const { data: logs, isLoading } = useDispatchLogs({
    month,
    year,
    status: status || undefined,
  });

  const columns = [
    { key: 'employeeId', label: 'EMP ID' },
    { key: 'employeeName', label: 'Name' },
    {
      key: 'status',
      label: 'Status',
      render: (row: DispatchLogEntry) => (
        <span className={`badge ${dispatchItemBadge(row.status)}`}>{row.status}</span>
      ),
    },
    { key: 'errorReason', label: 'Reason' },
    {
      key: 'sentAt',
      label: 'Sent at',
      render: (row: DispatchLogEntry) => new Date(row.sentAt).toLocaleString('en-IN'),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-headline font-bold tracking-tighter text-on-surface uppercase">Dispatch Log</h1>
        <p className="text-sm text-on-surface-variant mt-1">Payslip WhatsApp dispatch history</p>
      </div>

      <div className="card flex flex-wrap gap-4 items-end">
        <MonthYearSelect month={month} year={year} onMonthChange={setMonth} onYearChange={setYear} />
        <div>
          <label className="label">Status</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="Sent">Sent</option>
            <option value="Failed">Failed</option>
            <option value="Skipped">Skipped</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <p className="text-on-surface-variant">Loading…</p>
      ) : (
        <LogTable
          data={(logs ?? []) as unknown as Record<string, unknown>[]}
          columns={columns as never}
          searchKeys={['employeeId', 'employeeName']}
          exportFilename={`dispatch-log-${year}-${month}.csv`}
        />
      )}
    </div>
  );
}
