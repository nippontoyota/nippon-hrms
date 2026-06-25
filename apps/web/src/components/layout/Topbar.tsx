import { Bell, Search } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const pageTitles: Record<string, string> = {
  '/dashboard':  'Dashboard',
  '/employees':  'Employees',
  '/leaves':     'Leave Management',
  '/payroll':    'Payroll',
  '/whatsapp':   'WhatsApp Conversations',
  '/settings':   'Settings',
};

export default function Topbar() {
  const { pathname } = useLocation();
  const title = pageTitles[pathname] ?? 'HRMS';

  return (
    <header className="app-topbar">
      <span className="topbar-title">{title}</span>
      <div className="topbar-right">
        <button className="icon-btn" id="topbar-search" aria-label="Search">
          <Search size={16} />
        </button>
        <button className="icon-btn" id="topbar-notifications" aria-label="Notifications">
          <Bell size={16} />
        </button>
      </div>
    </header>
  );
}
