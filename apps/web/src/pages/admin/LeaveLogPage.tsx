import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useLeaveLogs, useUpdateLeaveStatus } from '@/api/hooks';
import { exportCsv, leaveStatusBadge } from '@/lib/format';
import type { LeaveStatus } from '@/api/types';

type Filter = 'All' | LeaveStatus;

export default function LeaveLogPage() {
  const { data: logs, isLoading } = useLeaveLogs();
  const updateStatus = useUpdateLeaveStatus();
  const [filter, setFilter] = useState<Filter>('All');
  const [search, setSearch] = useState('');
  const [actingId, setActingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let rows = logs ?? [];
    if (filter !== 'All') rows = rows.filter((r) => r.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.employeeName.toLowerCase().includes(q) ||
          r.employeeId.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [logs, filter, search]);

  const pendingCount = (logs ?? []).filter((l) => l.status === 'Pending').length;

  const handleDecision = async (id: string, status: 'Approved' | 'Rejected') => {
    setActingId(id);
    try {
      await updateStatus.mutateAsync({ id, status });
      toast.success(`Leave ${status.toLowerCase()}`);
    } catch {
      toast.error('Could not update leave request');
    } finally {
      setActingId(null);
    }
  };

  const handleExport = () => {
    exportCsv(
      'leave-requests.csv',
      ['EMP ID', 'Employee', 'Type', 'From', 'To', 'Reason', 'Status', 'Decided by', 'Applied'],
      filtered.map((r) => [
        r.employeeId,
        r.employeeName,
        r.leaveType,
        r.fromDate,
        r.toDate,
        r.reason,
        r.status,
        r.approverName ?? '',
        new Date(r.appliedAt).toLocaleString('en-IN'),
      ]),
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold tracking-tighter text-on-surface uppercase">Leave Requests</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Review and approve leave applications submitted via WhatsApp
            {pendingCount > 0 && (
              <span className="ml-2 badge badge-warning">{pendingCount} pending</span>
            )}
          </p>
        </div>
        <button type="button" className="btn-secondary btn-sm" onClick={handleExport}>
          Export CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['All', 'Pending', 'Approved', 'Rejected'] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors ${
              filter === f
                ? 'bg-primary text-white'
                : 'bg-surface-container text-on-surface-variant hover:bg-primary/10'
            }`}
          >
            {f}
            {f === 'Pending' && pendingCount > 0 && ` (${pendingCount})`}
          </button>
        ))}
      </div>

      <input
        className="input max-w-sm"
        placeholder="Search employee…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="card !p-0 overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-on-surface-variant">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-sm text-on-surface-variant">No leave requests found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>EMP ID</th>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>Dates</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Decided by</th>
                  <th>Applied</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    <td className="font-semibold">{row.employeeId}</td>
                    <td>{row.employeeName}</td>
                    <td>{row.leaveType}</td>
                    <td className="text-sm whitespace-nowrap">{row.fromDate} → {row.toDate}</td>
                    <td className="text-sm max-w-[200px] truncate" title={row.reason}>{row.reason}</td>
                    <td>
                      <span className={`badge ${leaveStatusBadge(row.status)}`}>{row.status}</span>
                    </td>
                    <td className="text-sm">{row.decidedAt ? (row.approverName ?? '—') : '—'}</td>
                    <td className="text-sm whitespace-nowrap">
                      {new Date(row.appliedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td>
                      {row.status === 'Pending' ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="btn-primary btn-sm !py-1 !px-2"
                            disabled={actingId === row.id}
                            onClick={() => handleDecision(row.id, 'Approved')}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="btn-danger btn-sm !py-1 !px-2"
                            disabled={actingId === row.id}
                            onClick={() => handleDecision(row.id, 'Rejected')}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-on-surface-variant">
                          {row.decidedAt
                            ? new Date(row.decidedAt).toLocaleString('en-IN', { dateStyle: 'medium' })
                            : '—'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
