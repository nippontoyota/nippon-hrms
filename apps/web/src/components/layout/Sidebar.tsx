import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  MessageCircle,
  CalendarCheck,
  Banknote,
  Settings,
  LogOut,
  Building2,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

const navSections = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    label: 'HR Management',
    items: [
      { to: '/employees',  icon: Users,           label: 'Employees'  },
      { to: '/leaves',     icon: CalendarCheck,   label: 'Leaves'     },
      { to: '/payroll',    icon: Banknote,        label: 'Payroll'    },
    ],
  },
  {
    label: 'WhatsApp',
    items: [
      { to: '/whatsapp',   icon: MessageCircle,   label: 'Conversations' },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/settings',   icon: Settings,        label: 'Settings'   },
    ],
  },
];

export default function Sidebar() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const initials = user?.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? 'U';

  return (
    <aside className="app-sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-badge">
          <Building2 size={18} />
        </div>
        <div className="sidebar-logo-text">
          <span>Nippon Toyota</span>
          <span>HR Platform</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="nav-section-label">{section.label}</p>
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                id={`nav-${item.label.toLowerCase()}`}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <item.icon size={16} />
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer user */}
      <div className="sidebar-footer">
        <div className="sidebar-user" onClick={handleLogout} id="sidebar-logout">
          <div className="avatar">{initials}</div>
          <div className="avatar-info">
            <div className="avatar-name">{user?.name ?? 'Admin'}</div>
            <div className="avatar-role">{user?.role ?? 'HR Admin'}</div>
          </div>
          <LogOut size={14} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
        </div>
      </div>
    </aside>
  );
}
