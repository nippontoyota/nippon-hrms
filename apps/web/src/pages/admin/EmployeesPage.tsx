import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import BulkUploadWizard from '@/components/BulkUploadWizard';
import { employeesApi, useEmployees } from '@/api/hooks';
import { downloadBlob, employeeStatusBadge } from '@/lib/format';

export default function EmployeesPage() {
  const { data: employees, isLoading } = useEmployees();
  const [search, setSearch] = useState('');
  const qc = useQueryClient();

  const filtered = (employees ?? []).filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.employeeId.toLowerCase().includes(search.toLowerCase()) ||
      e.branch.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold tracking-tighter text-on-surface uppercase">Employees</h1>
          <p className="text-sm text-on-surface-variant mt-1">{filtered.length} employees</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={async () => downloadBlob(await employeesApi.downloadTemplate(), 'employee_template.xlsx')}
          >
            Download template
          </button>
          <Link to="/admin/employees/new" className="btn-primary btn-sm">Add employee</Link>
        </div>
      </div>

      <BulkUploadWizard
        title="Bulk upload employees"
        onPreview={(file) => employeesApi.previewBulkUpload(file)}
        onCommit={(file) => employeesApi.commitBulkUpload(file)}
        onComplete={() => {
          qc.invalidateQueries({ queryKey: ['employees'] });
          qc.invalidateQueries({ queryKey: ['dashboard'] });
        }}
        previewColumns={['EMP ID', 'Name', 'Department', 'Status']}
      />

      <input
        className="input max-w-sm"
        placeholder="Search by name, ID, branch…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="card !p-0 overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-on-surface-variant">Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Emp ID</th>
                  <th>Name</th>
                  <th>Branch</th>
                  <th>Department</th>
                  <th>Mobile</th>
                  <th>Status</th>
                  <th>Reporting Manager</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id}>
                    <td className="font-semibold">{e.employeeId}</td>
                    <td>{e.name}</td>
                    <td>{e.branch}</td>
                    <td>{e.department}</td>
                    <td>{e.mobileNo}</td>
                    <td><span className={`badge ${employeeStatusBadge(e.status)}`}>{e.status}</span></td>
                    <td>{e.reportingManagerName || '—'}</td>
                    <td>
                      <Link to={`/admin/employees/${e.id}/edit`} className="text-primary text-sm font-semibold">Edit</Link>
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
