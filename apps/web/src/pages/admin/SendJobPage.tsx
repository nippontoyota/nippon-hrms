import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { sendJobsApi, useSendJob } from '@/api/hooks';
import type { SendJobItemStatus } from '@/api/types';

function itemBadge(status: SendJobItemStatus) {
  if (status === 'SENT') return 'badge-success';
  if (status === 'FAILED') return 'badge-error';
  return 'badge-muted';
}

export default function SendJobPage() {
  const { jobId } = useParams();
  const { data: job, isLoading } = useSendJob(jobId);
  const qc = useQueryClient();

  const progress = job ? Math.round(((job.sent + job.failed) / job.total) * 100) : 0;
  const isRunning = job?.status === 'PENDING' || job?.status === 'RUNNING';

  const handleRetry = async () => {
    if (!jobId) return;
    try {
      await sendJobsApi.retryFailed(jobId);
      toast.success('Retrying failed items');
      qc.invalidateQueries({ queryKey: ['send-jobs', jobId] });
    } catch {
      toast.error('Retry failed');
    }
  };

  if (isLoading) return <p className="text-on-surface-variant">Loading job...</p>;
  if (!job) return <p className="text-on-surface-variant">Job not found</p>;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Send job</h1>
          <p className="page-subtitle">
            Job {job.id} · <span className={`badge ${isRunning ? 'badge-info' : 'badge-success'}`}>{job.status}</span>
          </p>
        </div>
        {job.failed > 0 && !isRunning && (
          <button type="button" className="btn-danger btn-sm" onClick={handleRetry}>
            Retry failed ({job.failed})
          </button>
        )}
      </div>

      <div className="card space-y-4">
        <div className="flex justify-between text-sm font-label uppercase tracking-widest text-on-surface-variant">
          <span>Progress</span>
          <span>{job.sent + job.failed} / {job.total} ({progress}%)</span>
        </div>
        <div className="h-3 bg-surface-container rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary-fixed-dim to-primary-container transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex gap-6 text-sm">
          <span className="text-success font-semibold">Sent: {job.sent}</span>
          <span className="text-error font-semibold">Failed: {job.failed}</span>
          <span className="text-on-surface-variant">Pending: {job.total - job.sent - job.failed}</span>
        </div>
        {isRunning && (
          <p className="text-xs text-on-surface-variant flex items-center gap-2">
            <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
            Auto-refreshing every 3 seconds...
          </p>
        )}
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Employee</th>
                <th>Status</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {job.items.map((item) => (
                <tr key={item.id}>
                  <td className="font-semibold">{item.employeeCode}</td>
                  <td>{item.employeeName}</td>
                  <td><span className={`badge ${itemBadge(item.status)}`}>{item.status}</span></td>
                  <td className="text-error text-sm">{item.error ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
