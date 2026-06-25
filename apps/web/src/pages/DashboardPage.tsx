import {
  Users, CalendarCheck, MessageCircle, Banknote,
  TrendingUp, TrendingDown, Clock, CheckCircle,
} from 'lucide-react';

const kpis = [
  {
    icon: Users,
    label: 'Total Employees',
    value: '248',
    delta: '+4',
    trend: 'up' as const,
    color: '#3B82F6',
    bg: 'rgba(59,130,246,0.12)',
  },
  {
    icon: CalendarCheck,
    label: 'Pending Leaves',
    value: '12',
    delta: '-2',
    trend: 'down' as const,
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.12)',
  },
  {
    icon: MessageCircle,
    label: 'WA Conversations',
    value: '89',
    delta: '+14',
    trend: 'up' as const,
    color: '#22C55E',
    bg: 'rgba(34,197,94,0.12)',
  },
  {
    icon: Banknote,
    label: 'Payroll Due',
    value: '₹42.3L',
    delta: 'Jun 2026',
    trend: null,
    color: '#E50000',
    bg: 'rgba(229,0,0,0.12)',
  },
];

const recentActivity = [
  { icon: CheckCircle, text: "Arjun Sharma\u2019s leave request approved", time: '2m ago',   color: 'var(--success)' },
  { icon: Clock,       text: 'Payroll processing started for June',   time: '1h ago',   color: 'var(--info)'    },
  { icon: MessageCircle,text:'WhatsApp: 3 new employee queries',      time: '3h ago',   color: 'var(--success)' },
  { icon: Users,       text: 'New employee Priya Mehta onboarded',    time: 'Yesterday',color: 'var(--info)'    },
];

export default function DashboardPage() {
  return (
    <div className="fade-up">
      <div className="page-header">
        <div className="page-header-info">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back — here's what's happening today</p>
        </div>
        <span className="badge badge-success">● Live</span>
      </div>

      {/* KPI Grid */}
      <div className="kpi-grid mb-6">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="kpi-card">
            <div className="kpi-icon" style={{ background: kpi.bg }}>
              <kpi.icon size={18} color={kpi.color} />
            </div>
            <div>
              <div className="kpi-value">{kpi.value}</div>
              <div className="kpi-label">{kpi.label}</div>
            </div>
            {kpi.trend && (
              <div className={`kpi-delta ${kpi.trend}`}>
                {kpi.trend === 'up'
                  ? <TrendingUp size={12} />
                  : <TrendingDown size={12} />}
                {kpi.delta} this week
              </div>
            )}
            {!kpi.trend && (
              <div className="kpi-delta" style={{ color: 'var(--text-muted)' }}>
                {kpi.delta}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bottom grid */}
      <div className="grid-cols-2">
        {/* Recent activity */}
        <div className="card">
          <h3 style={{ marginBottom: '16px' }}>Recent Activity</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {recentActivity.map((a, i) => (
              <div key={i} className="flex items-center gap-3">
                <div
                  style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: 'var(--surface-3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <a.icon size={14} color={a.color} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p
                    className="text-sm"
                    style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                  >
                    {a.text}
                  </p>
                  <p className="text-sm text-muted">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* WhatsApp summary */}
        <div className="card">
          <h3 style={{ marginBottom: '16px' }}>WhatsApp Channel</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { label: 'Open conversations',  value: '23', badge: 'badge-warning' },
              { label: 'Resolved today',      value: '66', badge: 'badge-success' },
              { label: 'Avg response time',   value: '4m', badge: 'badge-info'    },
              { label: 'Unread messages',     value: '8',  badge: 'badge-error'   },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
                <span className={`badge ${row.badge}`}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
