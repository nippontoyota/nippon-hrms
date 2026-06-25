import toast from 'react-hot-toast';
import { useUpdateTicketStatus, useTickets } from '@/api/hooks';
import type { TicketStatus } from '@/api/types';

function statusBadge(status: TicketStatus) {
  if (status === 'OPEN') return 'badge-warning';
  if (status === 'IN_PROGRESS') return 'badge-info';
  return 'badge-success';
}

export default function TicketsPage() {
  const { data: tickets, isLoading } = useTickets();
  const updateStatus = useUpdateTicketStatus();

  const handleStatusChange = async (id: string, status: TicketStatus) => {
    try {
      await updateStatus.mutateAsync({ id, status });
      toast.success('Ticket updated');
    } catch {
      toast.error('Update failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Maintenance tickets</h1>
          <p className="page-subtitle">Issues reported by employees via WhatsApp bot</p>
        </div>
      </div>

      <div className="card">
        {isLoading ? (
          <p className="text-on-surface-variant">Loading...</p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Description</th>
                  <th>Created</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(tickets ?? []).map((t) => (
                  <tr key={t.id}>
                    <td className="font-semibold">{t.employeeName}</td>
                    <td>{t.description}</td>
                    <td>{new Date(t.createdAt).toLocaleString('en-IN')}</td>
                    <td>
                      <select
                        className="input py-1.5 text-sm max-w-[160px]"
                        value={t.status}
                        onChange={(e) => handleStatusChange(t.id, e.target.value as TicketStatus)}
                      >
                        <option value="OPEN">OPEN</option>
                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                        <option value="RESOLVED">RESOLVED</option>
                      </select>
                      <span className={`badge ${statusBadge(t.status)} ml-2`}>{t.status}</span>
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
