import LogTable from '@/components/LogTable';
import { useLeaveLogs } from '@/api/hooks';
import { leaveStatusBadge } from '@/lib/format';
import type { LeaveRequest } from '@/api/types';

export default function LeaveLogPage() {
  const { data: logs, isLoading } = useLeaveLogs();

  const columns = [
    { key: 'employeeId', label: 'EMP ID' },
    { key: 'employeeName', label: 'Employee' },
    { key: 'leaveType', label: 'Type' },
    { key: 'fromDate', label: 'From' },
    { key: 'toDate', label: 'To' },
    {
      key: 'status',
      label: 'Status',
      render: (row: LeaveRequest) => (
        <span className={`badge ${leaveStatusBadge(row.status)}`}>{row.status}</span>
      ),
    },
    { key: 'approverName', label: 'Approver' },
    {
      key: 'appliedAt',
      label: 'Applied',
      render: (row: LeaveRequest) => new Date(row.appliedAt).toLocaleString('en-IN'),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-headline font-bold tracking-tighter text-on-surface uppercase">Leave Requests</h1>
        <p className="text-sm text-on-surface-variant mt-1">Read-only overview of WhatsApp leave applications</p>
      </div>

      {isLoading ? (
        <p className="text-on-surface-variant">Loading…</p>
      ) : (
        <LogTable
          data={(logs ?? []) as unknown as Record<string, unknown>[]}
          columns={columns as never}
          searchKeys={['employeeId', 'employeeName']}
          exportFilename="leave-requests.csv"
        />
      )}
    </div>
  );
}
