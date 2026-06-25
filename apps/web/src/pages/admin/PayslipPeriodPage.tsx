import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { payslipsApi, usePayslipPeriod, usePayslipRecords } from '@/api/hooks';
import type { PeriodStatus } from '@/api/types';

function statusBadge(status: PeriodStatus) {
  if (status === 'DRAFT') return 'badge-warning';
  if (status === 'FINALIZED') return 'badge-info';
  return 'badge-success';
}

function monthLabel(year: number, month: number) {
  return new Date(year, month - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default function PayslipPeriodPage() {
  const { periodId } = useParams();
  const { data: period, isLoading: periodLoading } = usePayslipPeriod(periodId);
  const { data: records, isLoading: recordsLoading } = usePayslipRecords(periodId);
  const [finalizing, setFinalizing] = useState(false);
  const qc = useQueryClient();

  const handleFinalize = async () => {
    if (!periodId || !window.confirm('Finalize this period? Records will be locked.')) return;
    setFinalizing(true);
    try {
      await payslipsApi.finalize(periodId);
      toast.success('Period finalized');
      qc.invalidateQueries({ queryKey: ['payslip-periods'] });
      qc.invalidateQueries({ queryKey: ['payslip-periods', periodId] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    } catch {
      toast.error('Finalize failed');
    } finally {
      setFinalizing(false);
    }
  };

  const handlePreview = async (employeeId: string) => {
    if (!periodId) return;
    try {
      const blob = await payslipsApi.previewPdf(periodId, employeeId);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      toast.error('PDF preview failed');
    }
  };

  if (periodLoading || recordsLoading) return <p className="text-on-surface-variant">Loading...</p>;
  if (!period) return <p className="text-on-surface-variant">Period not found</p>;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">{monthLabel(period.year, period.month)}</h1>
          <p className="page-subtitle">
            <span className={`badge ${statusBadge(period.status)}`}>{period.status}</span>
            <span className="ml-2">{period.recordCount} records</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {period.status === 'DRAFT' && (
            <button type="button" className="btn-primary btn-sm" onClick={handleFinalize} disabled={finalizing}>
              Finalize period
            </button>
          )}
          {(period.status === 'FINALIZED' || period.status === 'SENT') && (
            <Link to="/admin/send" className="btn-primary btn-sm">Start bulk send</Link>
          )}
          <Link to="/admin/payslips" className="btn-secondary btn-sm">Back to periods</Link>
        </div>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Employee</th>
                <th>Gross</th>
                <th>Net</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(records ?? []).map((r) => (
                <tr key={r.id}>
                  <td className="font-semibold">{r.employeeCode}</td>
                  <td>{r.employeeName}</td>
                  <td>{formatCurrency(r.grossPay)}</td>
                  <td className="font-semibold">{formatCurrency(r.netPay)}</td>
                  <td>
                    <button
                      type="button"
                      className="text-primary text-sm font-semibold"
                      onClick={() => handlePreview(r.employeeId)}
                    >
                      Preview PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
