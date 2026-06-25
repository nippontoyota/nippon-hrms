import { Phone, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const conversations = [
  {
    id: 'WA001',
    employee: 'Arjun Sharma',
    phone: '+91 98765 43210',
    lastMessage: 'What is my leave balance for this month?',
    time: '10:24 AM',
    status: 'Open',
    unread: 2,
  },
  {
    id: 'WA002',
    employee: 'Priya Mehta',
    phone: '+91 87654 32109',
    lastMessage: 'Salary slip for May has been received, thank you!',
    time: 'Yesterday',
    status: 'Resolved',
    unread: 0,
  },
  {
    id: 'WA003',
    employee: 'Ravi Krishnan',
    phone: '+91 76543 21098',
    lastMessage: 'I need to apply for 3 days casual leave from June 30.',
    time: 'Yesterday',
    status: 'Open',
    unread: 1,
  },
  {
    id: 'WA004',
    employee: 'Sunita Patel',
    phone: '+91 65432 10987',
    lastMessage: 'Please confirm my maternity leave approval.',
    time: '2 days ago',
    status: 'Pending',
    unread: 0,
  },
];

const statusIcon: Record<string, React.ReactNode> = {
  Open:     <AlertCircle size={14} color="var(--warning)" />,
  Resolved: <CheckCircle size={14} color="var(--success)" />,
  Pending:  <Clock       size={14} color="var(--info)"    />,
};

const statusBadge: Record<string, string> = {
  Open:     'badge-warning',
  Resolved: 'badge-success',
  Pending:  'badge-info',
};

export default function WhatsAppPage() {
  return (
    <div className="fade-up">
      <div className="page-header">
        <div className="page-header-info">
          <h1 className="page-title">WhatsApp Conversations</h1>
          <p className="page-subtitle">Inbound employee queries via DoubleTick · WhatsApp Business</p>
        </div>
        <span className="badge badge-success">● Webhook Active</span>
      </div>

      {/* Summary */}
      <div className="kpi-grid mb-6" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {[
          { label: 'Open',     value: '23', icon: AlertCircle, color: 'var(--warning)', bg: 'rgba(245,158,11,0.12)' },
          { label: 'Resolved', value: '66', icon: CheckCircle, color: 'var(--success)', bg: 'rgba(34,197,94,0.12)'  },
          { label: 'Pending',  value: '8',  icon: Clock,       color: 'var(--info)',    bg: 'rgba(59,130,246,0.12)' },
        ].map((s) => (
          <div key={s.label} className="kpi-card">
            <div className="kpi-icon" style={{ background: s.bg }}>
              <s.icon size={18} color={s.color} />
            </div>
            <div>
              <div className="kpi-value">{s.value}</div>
              <div className="kpi-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Conversation list */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {conversations.map((c, i) => (
          <div
            key={c.id}
            id={`conv-${c.id}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '16px 20px',
              borderBottom: i < conversations.length - 1 ? '1px solid var(--border)' : 'none',
              cursor: 'pointer',
              transition: 'background 200ms',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-3)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div className="avatar" style={{ width: 40, height: 40 }}>
              {c.employee.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                  {c.employee}
                </span>
                <span className="text-sm text-muted">{c.time}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Phone size={11} color="var(--text-muted)" />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{c.phone}</span>
              </div>
              <p className="text-sm" style={{ marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {c.lastMessage}
              </p>
            </div>
            <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
              {c.unread > 0 && (
                <span
                  style={{
                    background: 'var(--brand-primary)',
                    color: '#fff',
                    borderRadius: '99px',
                    padding: '1px 7px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                  }}
                >
                  {c.unread}
                </span>
              )}
              <div className="flex items-center gap-1">
                {statusIcon[c.status]}
                <span className={`badge ${statusBadge[c.status]}`}>{c.status}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-sm text-muted mt-4" style={{ textAlign: 'center' }}>
        Powered by <strong style={{ color: 'var(--text-secondary)' }}>DoubleTick</strong> · WhatsApp Business API
      </p>
    </div>
  );
}
