import { Link } from 'react-router-dom';
import { useDashboard, useLeaveLogs } from '@/api/hooks';
import { monthLabel, periodStatusBadge } from '@/lib/format';

function KPI({ label, value, icon, color }: { label: string; value: string | number; icon: string; color: string }) {
  return (
    <div className="card relative overflow-hidden group !p-5" style={{ borderLeft: `3px solid ${color}` }}>
      <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">{label}</p>
      <p className="font-headline text-3xl font-extrabold text-on-surface">{value}</p>
      <div className="absolute right-4 bottom-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <span className="material-symbols-outlined" style={{ fontSize: '48px', color }}>{icon}</span>
      </div>
    </div>
  );
}

const quickLinks = [
  { to: '/admin/employees', icon: 'groups', label: 'Employees', desc: 'Manage employee master and bulk upload' },
  { to: '/admin/salary', icon: 'payments', label: 'Payroll', desc: 'Upload salary data and dispatch payslips' },
  { to: '/admin/attendance', icon: 'calendar_month', label: 'Attendance', desc: 'Upload monthly attendance summaries' },
  { to: '/admin/holidays', icon: 'event', label: 'Holidays', desc: 'Upload annual holiday calendar file' },
];

export default function DashboardPage() {
  const { data: stats, isLoading } = useDashboard();
  const { data: leaveLogs } = useLeaveLogs();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-headline font-bold tracking-tighter text-on-surface uppercase mb-1">Dashboard</h1>
        <p className="text-on-surface-variant font-body text-sm">Nippon HR Connect — admin overview</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card animate-pulse h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPI label="Active Employees" value={stats?.employeeCount ?? 0} icon="groups" color="#2e5bff" />
          <KPI label="Pending Leave" value={stats?.pendingLeaveRequests ?? 0} icon="event_available" color="#d71a18" />
          <KPI label="Pending Dispatch" value={stats?.pendingDispatchJobs ?? 0} icon="send" color="#d97706" />
          <KPI label="Attendance Periods" value={stats?.attendancePeriods ?? 0} icon="calendar_month" color="#16a34a" />
        </div>
      )}

      {stats?.latestPeriod && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-on-surface-variant">Latest payroll period:</span>
          <span className={`badge ${periodStatusBadge(stats.latestPeriod.status)}`}>{stats.latestPeriod.status}</span>
          <Link to={`/admin/salary/${stats.latestPeriod.id}`} className="text-primary font-semibold text-sm ml-2">
            {monthLabel(stats.latestPeriod.year, stats.latestPeriod.month)} →
          </Link>
        </div>
      )}

      <div>
        <h2 className="text-[10px] font-label uppercase tracking-[0.3em] text-primary mb-4">Quick Access</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickLinks.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="card hover:shadow-md transition-all group relative overflow-hidden !p-5"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined">{item.icon}</span>
              </div>
              <p className="font-headline font-bold text-on-surface tracking-tight uppercase text-sm mb-1">{item.label}</p>
              <p className="text-xs text-on-surface-variant font-body leading-relaxed">{item.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <p className="text-[10px] font-label uppercase tracking-widest text-primary mb-4">Recent Dispatch Jobs</p>
          {(stats?.recentDispatchJobs ?? []).length === 0 ? (
            <p className="text-sm text-on-surface-variant">No dispatch jobs yet.</p>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Progress</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {(stats?.recentDispatchJobs ?? []).map((job) => (
                    <tr key={job.id}>
                      <td className="font-semibold">{job.periodLabel}</td>
                      <td>{job.sent}/{job.total} {job.skipped > 0 && <span className="text-xs text-on-surface-variant">({job.skipped} skipped)</span>}</td>
                      <td><span className="badge badge-muted">{job.status}</span></td>
                      <td>
                        <Link to={`/admin/salary/dispatch/${job.id}`} className="text-primary text-sm font-semibold">View</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <p className="text-[10px] font-label uppercase tracking-widest text-primary mb-4">Recent Leave Requests</p>
          <ul className="space-y-3">
            {(leaveLogs ?? []).slice(0, 6).map((entry) => (
              <li key={entry.id} className="text-sm border-b border-outline/30 pb-3 last:border-0">
                <p className="font-medium text-on-surface">{entry.employeeName} — {entry.leaveType}</p>
                <p className="text-xs text-on-surface-variant mt-1">
                  {entry.fromDate} to {entry.toDate} · {entry.status}
                </p>
              </li>
            ))}
          </ul>
          <Link to="/admin/logs/leave" className="text-sm text-primary font-semibold mt-4 inline-block">View all →</Link>
        </div>
      </div>
    </div>
  );
}
