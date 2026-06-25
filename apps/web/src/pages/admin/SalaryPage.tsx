import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import BulkUploadWizard from '@/components/BulkUploadWizard';
import { salaryApi, useSalaryPeriods } from '@/api/hooks';
import { downloadBlob, monthLabel, periodStatusBadge } from '@/lib/format';

export default function SalaryPage() {
  const { data: periods, isLoading } = useSalaryPeriods();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const qc = useQueryClient();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold tracking-tighter text-on-surface uppercase">Payroll</h1>
          <p className="text-sm text-on-surface-variant mt-1">Upload salary data and dispatch payslips</p>
        </div>
        <button
          type="button"
          className="btn-secondary btn-sm"
          onClick={async () => downloadBlob(await salaryApi.downloadTemplate(), 'salary_template.xlsx')}
        >
          Download template
        </button>
      </div>

      <BulkUploadWizard
        title="Upload salary Excel"
        showMonthYear
        month={month}
        year={year}
        onMonthChange={setMonth}
        onYearChange={setYear}
        onPreview={(file) => salaryApi.previewBulkUpload(file, month, year)}
        onCommit={(file) => salaryApi.commitBulkUpload(file, month, year)}
        onComplete={() => qc.invalidateQueries({ queryKey: ['salary-periods'] })}
        previewColumns={['EMP ID', 'Name', 'Actual Final Amount']}
      />

      <div className="card">
        <p className="text-[10px] font-label uppercase tracking-widest text-primary mb-4">Uploaded periods</p>
        {isLoading ? (
          <p className="text-on-surface-variant">Loading…</p>
        ) : (periods ?? []).length === 0 ? (
          <p className="text-sm text-on-surface-variant">No salary periods uploaded yet.</p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Records</th>
                  <th>Unmatched</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(periods ?? []).map((p) => (
                  <tr key={p.id}>
                    <td className="font-semibold">{monthLabel(p.year, p.month)}</td>
                    <td>{p.recordCount}</td>
                    <td>{p.unmatchedCount > 0 ? <span className="text-tertiary">{p.unmatchedCount}</span> : '0'}</td>
                    <td><span className={`badge ${periodStatusBadge(p.status)}`}>{p.status}</span></td>
                    <td>
                      <Link to={`/admin/salary/${p.id}`} className="text-primary text-sm font-semibold">Open →</Link>
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
