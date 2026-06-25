import { Link } from 'react-router-dom';
import { useAudit, useDashboard } from '@/api/hooks';
import type { PeriodStatus } from '@/api/types';

function statusBadge(status: PeriodStatus) {
  if (status === 'DRAFT') return 'badge-warning';
  if (status === 'FINALIZED') return 'badge-info';
  return 'badge-success';
}

function monthLabel(year: number, month: number) {
  return new Date(year, month - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useDashboard();
  const { data: audit } = useAudit();

  if (isLoading) return <p className="text-on-surface-variant">Loading dashboard...</p>;

  const kpis = [
    { icon: 'groups', label: 'Active Employees', value: stats?.employeeCount ?? 0, color: 'text-primary' },
    { icon: 'build', label: 'Open Tickets', value: stats?.openTickets ?? 0, color: 'text-tertiary' },
    { icon: 'send', label: 'Pending Send Jobs', value: stats?.pendingSendJobs ?? 0, color: 'text-warning' },
    {
      icon: 'payments',
      label: 'Latest Period',
      value: stats?.latestPeriod ? monthLabel(stats.latestPeriod.year, stats.latestPeriod.month) : '—',
      badge: stats?.latestPeriod?.status,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Overview of HR operations and payslip delivery</p>
        </div>
      </div>

      <div className="kpi-grid">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="kpi-card">
            <div className="flex items-center justify-between">
              <span className={`material-symbols-outlined text-2xl ${kpi.color ?? 'text-primary'}`}>{kpi.icon}</span>
              {kpi.badge && <span className={`badge ${statusBadge(kpi.badge)}`}>{kpi.badge}</span>}
            </div>
            <div className="kpi-value">{kpi.value}</div>
            <div className="kpi-label">{kpi.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <h2 className="font-headline font-bold text-lg mb-4">Quick actions</h2>
          <div className="flex flex-wrap gap-3">
            <Link to="/admin/employees" className="btn-secondary btn-sm">Manage employees</Link>
            <Link to="/admin/payslips" className="btn-secondary btn-sm">Import payslips</Link>
            <Link to="/admin/send" className="btn-primary btn-sm">Bulk send</Link>
            <Link to="/admin/tickets" className="btn-secondary btn-sm">View tickets</Link>
          </div>
        </div>

        <div className="card">
          <h2 className="font-headline font-bold text-lg mb-4">Recent activity</h2>
          <ul className="space-y-3">
            {(audit ?? []).slice(0, 5).map((entry) => (
              <li key={entry.id} className="text-sm border-b border-outline/30 pb-3 last:border-0">
                <p className="font-medium text-on-surface">{entry.details}</p>
                <p className="text-xs text-on-surface-variant mt-1">
                  {new Date(entry.timestamp).toLocaleString('en-IN')} · {entry.actor}
                </p>
              </li>
            ))}
          </ul>
          <Link to="/admin/audit" className="text-sm text-primary font-semibold mt-4 inline-block">View all audit logs →</Link>
        </div>
      </div>
    </div>
  );
}
