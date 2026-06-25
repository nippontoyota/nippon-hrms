import { useAudit } from '@/api/hooks';

export default function AuditPage() {
  const { data: audit, isLoading } = useAudit();

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Audit log</h1>
          <p className="page-subtitle">History of HR admin actions</p>
        </div>
      </div>

      <div className="card">
        {isLoading ? (
          <p className="text-on-surface-variant">Loading...</p>
        ) : (
          <div className="table-wrapper max-h-[70vh] overflow-y-auto custom-scrollbar">
            <table className="data-table">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {(audit ?? []).map((entry) => (
                  <tr key={entry.id}>
                    <td className="whitespace-nowrap text-sm">
                      {new Date(entry.timestamp).toLocaleString('en-IN')}
                    </td>
                    <td>{entry.actor}</td>
                    <td><span className="badge badge-muted">{entry.action}</span></td>
                    <td className="font-mono text-xs">{entry.entity}</td>
                    <td>{entry.details}</td>
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
