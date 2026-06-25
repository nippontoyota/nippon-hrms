import { useRef } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { payslipsApi, usePayslipPeriods } from '@/api/hooks';
import type { PeriodStatus } from '@/api/types';

function statusBadge(status: PeriodStatus) {
  if (status === 'DRAFT') return 'badge-warning';
  if (status === 'FINALIZED') return 'badge-info';
  return 'badge-success';
}

function monthLabel(year: number, month: number) {
  return new Date(year, month - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PayslipsPage() {
  const { data: periods, isLoading } = usePayslipPeriods();
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const handleImport = async (file: File) => {
    try {
      const result = await payslipsApi.import(file);
      toast.success(`Imported ${result.successCount} records`);
      if (result.errorCount > 0) toast.error(`${result.errorCount} rows failed`);
      qc.invalidateQueries({ queryKey: ['payslip-periods'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    } catch {
      toast.error('Import failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Payslips</h1>
          <p className="page-subtitle">Import monthly salary data and manage pay periods</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={async () => downloadBlob(await payslipsApi.downloadTemplate(), 'payslip_template.csv')}
          >
            Download template
          </button>
          <button type="button" className="btn-primary btn-sm" onClick={() => fileRef.current?.click()}>
            Import Excel
          </button>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImport(file);
          e.target.value = '';
        }}
      />

      <div className="card">
        {isLoading ? (
          <p className="text-on-surface-variant">Loading...</p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Status</th>
                  <th>Records</th>
                  <th>Finalized</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(periods ?? []).map((p) => (
                  <tr key={p.id}>
                    <td className="font-semibold">{monthLabel(p.year, p.month)}</td>
                    <td><span className={`badge ${statusBadge(p.status)}`}>{p.status}</span></td>
                    <td>{p.recordCount}</td>
                    <td>{p.finalizedAt ? new Date(p.finalizedAt).toLocaleDateString('en-IN') : '—'}</td>
                    <td>
                      <Link to={`/admin/payslips/${p.id}`} className="text-primary text-sm font-semibold">
                        View details
                      </Link>
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
