import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { salaryApi, useDispatchJob } from '@/api/hooks';
import { dispatchItemBadge, exportCsv } from '@/lib/format';

export default function DispatchJobPage() {
  const { jobId } = useParams();
  const { data: job, isLoading } = useDispatchJob(jobId);
  const qc = useQueryClient();

  const progress = job ? Math.round(((job.sent + job.failed + job.skipped) / job.total) * 100) : 0;
  const isRunning = job?.status === 'PENDING' || job?.status === 'RUNNING';

  const handleRetry = async () => {
    if (!jobId) return;
    try {
      await salaryApi.retryFailed(jobId);
      toast.success('Retrying failed items');
      qc.invalidateQueries({ queryKey: ['dispatch-jobs', jobId] });
    } catch {
      toast.error('Retry failed');
    }
  };

  const handleDownloadReport = () => {
    if (!job) return;
    exportCsv(
      `dispatch-report-${job.id}.csv`,
      ['Employee ID', 'Name', 'Status', 'Reason'],
      job.items.map((i) => [i.employeeId, i.employeeName, i.status, i.errorReason ?? '']),
    );
  };

  if (isLoading) return <p className="text-on-surface-variant">Loading…</p>;
  if (!job) return <p className="text-on-surface-variant">Job not found</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/admin/salary" className="text-sm text-primary font-semibold">← Payroll</Link>
          <h1 className="text-3xl font-headline font-bold tracking-tighter text-on-surface uppercase mt-1">Dispatch Progress</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            <span className={`badge ${isRunning ? 'badge-info' : 'badge-success'}`}>{job.status}</span>
            <span className="ml-2">{job.sent + job.failed + job.skipped} / {job.total}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary btn-sm" onClick={handleDownloadReport}>
            Download report
          </button>
          {job.failed > 0 && !isRunning && (
            <button type="button" className="btn-danger btn-sm" onClick={handleRetry}>
              Retry failed ({job.failed})
            </button>
          )}
        </div>
      </div>

      <div className="card space-y-3">
        <div className="h-2 bg-surface-container rounded-full overflow-hidden">
          <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex flex-wrap gap-6 text-sm">
          <span className="text-success font-semibold">Sent {job.sent}</span>
          <span className="text-error font-semibold">Failed {job.failed}</span>
          <span className="text-on-surface-variant font-semibold">Skipped {job.skipped}</span>
          <span className="text-on-surface-variant">Pending {job.total - job.sent - job.failed - job.skipped}</span>
        </div>
        {isRunning && <p className="text-xs text-on-surface-variant">Updating every 3 seconds…</p>}
      </div>

      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>EMP ID</th>
                <th>Employee</th>
                <th>Status</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {job.items.map((item) => (
                <tr key={item.id}>
                  <td className="font-semibold">{item.employeeId}</td>
                  <td>{item.employeeName}</td>
                  <td><span className={`badge ${dispatchItemBadge(item.status)}`}>{item.status}</span></td>
                  <td className="text-sm text-on-surface-variant">{item.errorReason ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
