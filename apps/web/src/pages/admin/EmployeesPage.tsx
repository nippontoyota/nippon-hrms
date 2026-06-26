import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import BulkUploadWizard from '@/components/BulkUploadWizard';
import { employeesApi, useEmployees } from '@/api/hooks';
import { MagnifyingGlass, MicrosoftExcelLogo, Plus, Check, WarningCircle, PencilSimple, Trash } from '@phosphor-icons/react';

export default function EmployeesPage() {
  const { data: employees, isLoading } = useEmployees();
  const [search, setSearch] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const qc = useQueryClient();

  const filtered = (employees ?? []).filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.employeeId.toLowerCase().includes(search.toLowerCase()) ||
      e.mobileNo.includes(search)
  );

  return (
    <div className="space-y-4 max-w-full">
      {/* Top action bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-[300px]">
          <div className="relative w-64">
            <MagnifyingGlass className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              className="w-full bg-white rounded-none pl-10 pr-4 py-2 text-sm border border-slate-300 focus:outline-none focus:border-[#eb0a1e]"
              placeholder="Search employees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-success btn-sm !px-4 !py-2 bg-green-700 hover:bg-green-800 text-white border-green-800" onClick={() => setShowUpload(!showUpload)}>
            <MicrosoftExcelLogo size={16} weight="bold" /> Import from Excel
          </button>
          <Link to="/admin/employees/new" className="btn-primary btn-sm !px-4 !py-2">
            <Plus size={16} weight="bold" /> Add Employee
          </Link>
        </div>
      </div>

      {showUpload && (
        <div className="mb-6">
          <BulkUploadWizard
            title="Upload Employee Master"
            onCommit={(file) => employeesApi.commitBulkUpload(file)}
            onComplete={() => {
              qc.invalidateQueries({ queryKey: ['employees'] });
              qc.invalidateQueries({ queryKey: ['dashboard'] });
              setShowUpload(false);
            }}
            onCancel={() => setShowUpload(false)}
          />
        </div>
      )}

      <div className="mt-6 border-t border-l border-slate-300">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-4 bg-white border-b border-r border-slate-300">
            <div className="spinner-dashed"></div>
            <p className="text-slate-500 font-mono text-[10px] uppercase tracking-widest">Fetching records...</p>
          </div>
        ) : (
          <div className="table-wrapper overflow-x-auto w-full">
            <table className="table-dense whitespace-nowrap">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-slate-100 border-r border-slate-300 w-8 text-center"><input type="checkbox" className="rounded-none border-slate-400 text-slate-900 focus:ring-0" /></th>
                  <th className="sticky left-8 z-10 bg-slate-100 border-r border-slate-300">EMP ID</th>
                  <th className="sticky left-[104px] z-10 bg-slate-100 border-r border-slate-300">Name</th>
                  <th>Department</th>
                  <th>Mobile Number</th>
                  <th>Level</th>
                  <th>DOJ</th>
                  <th>No: of Yrs</th>
                  <th>Branch</th>
                  <th>Designation</th>
                  <th className="text-right">Basic</th>
                  <th className="text-right">DA</th>
                  <th className="text-right">Revised Basic+DA</th>
                  <th className="text-right">HRA</th>
                  <th className="text-right">Travel</th>
                  <th className="text-right">Hostel</th>
                  <th className="text-right">Children</th>
                  <th className="text-right font-bold">Total Salary</th>
                  <th className="text-right">Mobile</th>
                  <th className="text-right">Convy</th>
                  <th className="text-right">Wash Allo</th>
                  <th className="text-right">Bran. Allo</th>
                  <th className="text-right">Spl All</th>
                  <th className="text-right">Training</th>
                  <th className="text-right font-bold">Total Allowances</th>
                  <th className="text-right font-black text-[#eb0a1e]">Total salary With Allowances</th>
                  <th>Bank</th>
                  <th>A/c No.</th>
                  <th>Bank Branch</th>
                  <th>IFSC Code</th>
                  <th>Zone</th>
                  <th className="sticky right-0 z-10 bg-slate-100 border-l border-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="sticky left-0 z-10 bg-white border-r border-slate-300 text-center"><input type="checkbox" className="rounded-none border-slate-400 text-slate-900 focus:ring-0 cursor-cell" /></td>
                    <td className="sticky left-8 z-10 bg-white border-r border-slate-300 font-mono font-bold text-slate-900">{e.employeeId}</td>
                    <td className="sticky left-[104px] z-10 bg-white border-r border-slate-300 font-semibold text-slate-900">{e.name}</td>
                    <td>{e.department}</td>
                    <td className="font-mono">{e.mobileNo}</td>
                    <td className="text-center">{e.level}</td>
                    <td>{e.doj}</td>
                    <td className="text-center">{e.yearsExperience}</td>
                    <td>{e.branch}</td>
                    <td>{e.designation}</td>
                    <td className="text-right font-mono">{e.basic?.toFixed(2) || '0.00'}</td>
                    <td className="text-right font-mono">{e.da?.toFixed(2) || '0.00'}</td>
                    <td className="text-right font-mono">{e.revisedBasicDa?.toFixed(2) || '0.00'}</td>
                    <td className="text-right font-mono">{e.hra?.toFixed(2) || '0.00'}</td>
                    <td className="text-right font-mono">{e.travel?.toFixed(2) || '0.00'}</td>
                    <td className="text-right font-mono">{e.hostel?.toFixed(2) || '0.00'}</td>
                    <td className="text-right font-mono">{e.children?.toFixed(2) || '0.00'}</td>
                    <td className="text-right font-mono font-bold bg-slate-50">{e.totalSalary?.toFixed(2) || '0.00'}</td>
                    <td className="text-right font-mono">{e.mobile?.toFixed(2) || '0.00'}</td>
                    <td className="text-right font-mono">{e.conveyance?.toFixed(2) || '0.00'}</td>
                    <td className="text-right font-mono">{e.washAllowance?.toFixed(2) || '0.00'}</td>
                    <td className="text-right font-mono">{e.branchAllowance?.toFixed(2) || '0.00'}</td>
                    <td className="text-right font-mono">{e.specialAllowance?.toFixed(2) || '0.00'}</td>
                    <td className="text-right font-mono">{e.training?.toFixed(2) || '0.00'}</td>
                    <td className="text-right font-mono font-bold bg-slate-50">{e.totalAllowances?.toFixed(2) || '0.00'}</td>
                    <td className="text-right font-mono font-black text-[#eb0a1e] bg-red-50">{e.totalSalaryWithAllowances?.toFixed(2) || '0.00'}</td>
                    <td>{e.bankName}</td>
                    <td className="font-mono">{e.accountNumber}</td>
                    <td>{e.bankBranch}</td>
                    <td className="font-mono">{e.ifscCode}</td>
                    <td>{e.zone}</td>
                    <td className="sticky right-0 z-10 bg-white border-l border-slate-300 text-center space-x-2">
                      <Link to={`/admin/employees/${e.id}/edit`} className="text-slate-400 hover:text-slate-600 inline-flex cursor-pointer">
                        <PencilSimple size={16} weight="duotone" />
                      </Link>
                      <button className="text-slate-400 hover:text-red-600 inline-flex cursor-pointer">
                        <Trash size={16} weight="duotone" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={32} className="text-center p-4 text-slate-500 font-mono">NO RECORDS FOUND</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
