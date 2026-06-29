import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, ArrowClockwise, CheckCircle, WarningCircle, XCircle, Spinner } from '@phosphor-icons/react';
import { salaryApi } from '@/api/endpoints';
import type { DispatchJob, DispatchJobItem } from '@/api/types';
import { dispatchItemBadge } from '@/lib/format';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function jobStatusBadge(status: DispatchJob['status']) {
  if (status === 'COMPLETED') return 'badge-success';
  if (status === 'FAILED') return 'badge-error';
  if (status === 'RUNNING') return 'badge-info';
  return 'badge-warning';
}

export default function DispatchJobPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [job, setJob] = useState<DispatchJob | null>(null);
  const [failedItems, setFailedItems] = useState<DispatchJobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  const loadJob = useCallback(async () => {
    if (!jobId) return;
    try {
      const data = await salaryApi.getDispatchJob(jobId);
      setJob(data as DispatchJob);

      if (data.failed > 0 || data.status === 'COMPLETED' || data.status === 'FAILED') {
        const itemsRes = await salaryApi.getDispatchJobItems(jobId, { status: 'FAILED', page: 1, limit: 100 });
        setFailedItems(itemsRes.items);
      } else {
        setFailedItems([]);
      }
    } catch {
      toast.error('Failed to load dispatch job');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    loadJob();
  }, [loadJob]);

  useEffect(() => {
    if (!job || (job.status !== 'PENDING' && job.status !== 'RUNNING')) return;
    const timer = setInterval(loadJob, 2000);
    return () => clearInterval(timer);
  }, [job, loadJob]);

  const handleRetry = async () => {
    if (!jobId) return;
    setRetrying(true);
    try {
      await salaryApi.retryFailedDispatch(jobId);
      toast.success('Retrying failed payslips…');
      await loadJob();
    } catch {
      toast.error('Failed to retry dispatch');
    } finally {
      setRetrying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500">
        <Spinner className="animate-spin mr-2" size={24} />
        Loading dispatch job…
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-24 text-slate-500">
        Dispatch job not found.
        <div className="mt-4">
          <Link to="/admin/salary" className="text-[#eb0a1e] font-semibold hover:underline">
            Back to Process Payroll
          </Link>
        </div>
      </div>
    );
  }

  const processed = job.sent + job.failed + job.skipped;
  const progress = job.total > 0 ? Math.round((processed / job.total) * 100) : 0;
  const isActive = job.status === 'PENDING' || job.status === 'RUNNING';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/admin/salary"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-[#eb0a1e] transition-colors"
        >
          <ArrowLeft size={16} weight="bold" />
          Process Payroll
        </Link>
        {isActive && (
          <span className="inline-flex items-center gap-2 text-sm text-slate-500">
            <Spinner className="animate-spin" size={16} />
            Updating live…
          </span>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Payslip Dispatch — {MONTHS[job.month - 1]} {job.year}
            </h1>
            <p className="text-sm text-slate-500 mt-1 font-mono">Job {job.id}</p>
          </div>
          <span className={`badge ${jobStatusBadge(job.status)}`}>{job.status}</span>
        </div>

        <div className="mb-6">
          <div className="flex justify-between text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">
            <span>Progress</span>
            <span>{progress}% ({processed}/{job.total})</span>
          </div>
          <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#eb0a1e] transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total" value={job.total} icon={<CheckCircle size={18} className="text-slate-400" />} />
          <StatCard label="Sent" value={job.sent} icon={<CheckCircle size={18} className="text-green-600" />} />
          <StatCard label="Failed" value={job.failed} icon={<XCircle size={18} className="text-red-600" />} />
          <StatCard label="Skipped" value={job.skipped} icon={<WarningCircle size={18} className="text-amber-500" />} />
        </div>

        {!isActive && job.failed > 0 && (
          <div className="mt-6">
            <button
              type="button"
              onClick={handleRetry}
              disabled={retrying}
              className="inline-flex items-center gap-2 bg-[#eb0a1e] hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-md transition-colors disabled:opacity-60"
            >
              {retrying ? <Spinner className="animate-spin" size={18} /> : <ArrowClockwise size={18} weight="bold" />}
              Retry Failed ({job.failed})
            </button>
          </div>
        )}
      </div>

      {failedItems.length > 0 && (
        <div className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="font-bold text-slate-900 dark:text-white">Failed deliveries</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-xs">
                <tr>
                  <th className="text-left p-3">Emp ID</th>
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Reason</th>
                </tr>
              </thead>
              <tbody>
                {failedItems.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100 dark:border-slate-700">
                    <td className="p-3 font-mono">{item.employeeId}</td>
                    <td className="p-3">{item.employeeName}</td>
                    <td className="p-3">
                      <span className={`badge ${dispatchItemBadge(item.status)}`}>{item.status}</span>
                    </td>
                    <td className="p-3 text-red-600 dark:text-red-400">{item.errorReason ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-md p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500 mb-1">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
    </div>
  );
}
