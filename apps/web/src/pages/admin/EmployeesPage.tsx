import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { employeesApi, useEmployees } from '@/api/hooks';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function EmployeesPage() {
  const { data: employees, isLoading } = useEmployees();
  const [search, setSearch] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const filtered = (employees ?? []).filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.employeeCode.toLowerCase().includes(search.toLowerCase()) ||
      e.department.toLowerCase().includes(search.toLowerCase()),
  );

  const handleImport = async (file: File) => {
    try {
      const result = await employeesApi.import(file);
      toast.success(`Imported ${result.successCount} employees`);
      if (result.errorCount > 0) toast.error(`${result.errorCount} rows failed`);
      qc.invalidateQueries({ queryKey: ['employees'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    } catch {
      toast.error('Import failed');
    }
  };

  const handleTemplate = async () => {
    const blob = await employeesApi.downloadTemplate();
    downloadBlob(blob, 'employee_template.csv');
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Employees</h1>
          <p className="page-subtitle">Manage employee master data and WhatsApp numbers</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary btn-sm" onClick={handleTemplate}>
            Download template
          </button>
          <button type="button" className="btn-secondary btn-sm" onClick={() => fileRef.current?.click()}>
            Import Excel
          </button>
          <Link to="/admin/employees/new" className="btn-primary btn-sm">Add employee</Link>
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
        <input
          className="input max-w-md mb-4"
          placeholder="Search by name, code, or department..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {isLoading ? (
          <p className="text-on-surface-variant">Loading...</p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Department</th>
                  <th>WhatsApp</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp) => (
                  <tr key={emp.id}>
                    <td className="font-semibold">{emp.employeeCode}</td>
                    <td>{emp.name}</td>
                    <td>{emp.department}</td>
                    <td className="font-mono text-sm">{emp.whatsappPhone}</td>
                    <td>
                      <span className={`badge ${emp.active ? 'badge-success' : 'badge-muted'}`}>
                        {emp.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <Link to={`/admin/employees/${emp.id}/edit`} className="text-primary text-sm font-semibold">
                        Edit
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
