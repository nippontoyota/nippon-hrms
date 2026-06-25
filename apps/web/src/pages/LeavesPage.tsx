import { CalendarPlus } from 'lucide-react';

const leaves = [
  { id: 'LV001', employee: 'Arjun Sharma',    type: 'Casual',   from: 'Jun 30', to: 'Jul 2',  days: 3, status: 'Pending'  },
  { id: 'LV002', employee: 'Priya Mehta',     type: 'Sick',     from: 'Jun 20', to: 'Jun 22', days: 3, status: 'Approved' },
  { id: 'LV003', employee: 'Sunita Patel',    type: 'Maternity',from: 'Jul 1',  to: 'Oct 1',  days: 90,status: 'Pending'  },
  { id: 'LV004', employee: 'Ravi Krishnan',   type: 'Annual',   from: 'Jul 15', to: 'Jul 19', days: 5, status: 'Approved' },
  { id: 'LV005', employee: 'Mohammed Farhan', type: 'Casual',   from: 'Jun 28', to: 'Jun 28', days: 1, status: 'Rejected' },
];

const statusBadge: Record<string, string> = {
  Pending:  'badge-warning',
  Approved: 'badge-success',
  Rejected: 'badge-error',
};

export default function LeavesPage() {
  return (
    <div className="fade-up">
      <div className="page-header">
        <div className="page-header-info">
          <h1 className="page-title">Leave Management</h1>
          <p className="page-subtitle">Review and manage employee leave requests</p>
        </div>
        <button id="btn-add-leave" className="btn btn-primary">
          <CalendarPlus size={15} /> New Request
        </button>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Employee</th>
              <th>Type</th>
              <th>From</th>
              <th>To</th>
              <th>Days</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {leaves.map((l) => (
              <tr key={l.id}>
                <td><code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{l.id}</code></td>
                <td>{l.employee}</td>
                <td>{l.type}</td>
                <td>{l.from}</td>
                <td>{l.to}</td>
                <td>{l.days}</td>
                <td><span className={`badge ${statusBadge[l.status]}`}>{l.status}</span></td>
                <td>
                  {l.status === 'Pending' ? (
                    <div className="flex gap-2">
                      <button className="btn btn-primary btn-sm" id={`btn-approve-${l.id}`}>Approve</button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }} id={`btn-reject-${l.id}`}>Reject</button>
                    </div>
                  ) : (
                    <span className="text-sm text-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
