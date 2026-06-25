import { UserPlus } from 'lucide-react';

const employees = [
  { id: 'EMP001', name: 'Arjun Sharma',    dept: 'Engineering',    role: 'Senior Engineer',  status: 'Active',   joined: 'Jan 2022' },
  { id: 'EMP002', name: 'Priya Mehta',     dept: 'HR',             role: 'HR Specialist',    status: 'Active',   joined: 'Mar 2024' },
  { id: 'EMP003', name: 'Ravi Krishnan',   dept: 'Sales',          role: 'Sales Manager',    status: 'Active',   joined: 'Jun 2021' },
  { id: 'EMP004', name: 'Sunita Patel',    dept: 'Finance',        role: 'Accountant',       status: 'On Leave', joined: 'Nov 2020' },
  { id: 'EMP005', name: 'Mohammed Farhan', dept: 'Operations',     role: 'Ops Analyst',      status: 'Active',   joined: 'Aug 2023' },
  { id: 'EMP006', name: 'Deepa Nair',      dept: 'Engineering',    role: 'QA Engineer',      status: 'Inactive', joined: 'Feb 2019' },
];

const statusBadge: Record<string, string> = {
  Active:   'badge-success',
  'On Leave': 'badge-warning',
  Inactive: 'badge-muted',
};

export default function EmployeesPage() {
  return (
    <div className="fade-up">
      <div className="page-header">
        <div className="page-header-info">
          <h1 className="page-title">Employees</h1>
          <p className="page-subtitle">Manage your workforce directory</p>
        </div>
        <button id="btn-add-employee" className="btn btn-primary">
          <UserPlus size={15} /> Add Employee
        </button>
      </div>

      {/* Stats row */}
      <div className="kpi-grid mb-6" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {[
          { label: 'Total',    value: '248', badge: 'badge-info'    },
          { label: 'Active',   value: '231', badge: 'badge-success' },
          { label: 'On Leave', value: '12',  badge: 'badge-warning' },
        ].map((s) => (
          <div key={s.label} className="kpi-card" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="kpi-label">{s.label}</span>
            <span className={`badge ${s.badge}`} style={{ fontSize: '1rem', padding: '4px 14px' }}>{s.value}</span>
          </div>
        ))}
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Employee ID</th>
              <th>Name</th>
              <th>Department</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id}>
                <td><code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{emp.id}</code></td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="avatar" style={{ width: 28, height: 28, fontSize: '0.65rem' }}>
                      {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    {emp.name}
                  </div>
                </td>
                <td>{emp.dept}</td>
                <td>{emp.role}</td>
                <td><span className={`badge ${statusBadge[emp.status]}`}>{emp.status}</span></td>
                <td>{emp.joined}</td>
                <td>
                  <div className="flex gap-2">
                    <button className="btn btn-ghost btn-sm" id={`btn-view-${emp.id}`}>View</button>
                    <button className="btn btn-secondary btn-sm" id={`btn-edit-${emp.id}`}>Edit</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
