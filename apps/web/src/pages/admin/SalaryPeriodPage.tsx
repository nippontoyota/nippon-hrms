import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { salaryApi, useSalaryPeriod, useSalaryRecords } from '@/api/hooks';
import { downloadBlob, formatCurrency, formatBreakdown, monthLabel, periodStatusBadge } from '@/lib/format';

export default function SalaryPeriodPage() {
  const { periodId } = useParams();
  const navigate = useNavigate();
  const { data: period } = useSalaryPeriod(periodId);
  const { data: records } = useSalaryRecords(periodId);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [dispatching, setDispatching] = useState(false);

  const unmatched = (records ?? []).filter((r) => !r.matched);

  const handlePreview = async (employeeId: string) => {
    if (!periodId) return;
    setPreviewing(employeeId);
    try {
      const blob = await salaryApi.previewPdf(periodId, employeeId);
      downloadBlob(blob, `payslip-${employeeId}.pdf`);
    } catch {
      toast.error('Preview failed');
    } finally {
      setPreviewing(null);
    }
  };

  const handleDispatch = async () => {
    if (!period || period.status === 'DRAFT') {
      toast.error('Validate salary upload before dispatch');
      return;
    }
    if (unmatched.length > 0) {
      toast.error('Resolve unmatched employee IDs first');
      return;
    }
    setDispatching(true);
    try {
      const { jobId } = await salaryApi.dispatch(period.month, period.year);
      toast.success('Dispatch started');
      navigate(`/admin/salary/dispatch/${jobId}`);
    } catch {
      toast.error('Failed to start dispatch');
    } finally {
      setDispatching(false);
    }
  };

  if (!period) return <p className="text-on-surface-variant">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/admin/salary" className="text-sm text-primary font-semibold">← Payroll</Link>
          <h1 className="text-3xl font-headline font-bold tracking-tighter text-on-surface uppercase mt-1">
            {monthLabel(period.year, period.month)}
          </h1>
          <span className={`badge ${periodStatusBadge(period.status)} mt-2`}>{period.status}</span>
        </div>
        <button
          type="button"
          className="btn-primary btn-sm"
          onClick={handleDispatch}
          disabled={dispatching || period.status === 'DRAFT' || unmatched.length > 0}
        >
          {dispatching ? 'Starting…' : 'Generate & Send'}
        </button>
      </div>

      {unmatched.length > 0 && (
        <div className="rounded-xl p-4 bg-tertiary/5 border-l-4 border-tertiary">
          <p className="font-semibold text-tertiary">{unmatched.length} unmatched employee ID(s)</p>
          <p className="text-sm text-on-surface-variant mt-1">Fix salary upload or add employees before dispatch.</p>
        </div>
      )}

      <div className="card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>EMP ID</th>
                <th>Name</th>
                <th>Net pay</th>
                <th>Matched</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(records ?? []).map((r) => (
                <tr key={r.id}>
                  <td className="font-semibold">{r.employeeId}</td>
                  <td>{r.employeeName}</td>
                  <td>{formatCurrency(r.netPay)}</td>
                  <td>
                    <span className={`badge ${r.matched ? 'badge-success' : 'badge-error'}`}>
                      {r.matched ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="text-primary text-sm font-semibold"
                      onClick={() => handlePreview(r.employeeId)}
                      disabled={previewing === r.employeeId}
                    >
                      {previewing === r.employeeId ? '…' : 'PDF'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(records ?? []).length > 0 && (
        <details className="card">
          <summary className="cursor-pointer font-semibold text-sm uppercase tracking-tight">Sample record breakdown</summary>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            {formatBreakdown(records![0].data).slice(0, 20).map(([k, v]) => (
              <div key={k} className="bg-surface-container rounded p-2">
                <p className="text-[10px] text-on-surface-variant truncate">{k}</p>
                <p className="font-medium">{String(v)}</p>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
