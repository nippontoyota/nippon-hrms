import { Navigate, Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

const sideNav = [
  { to: '/admin', icon: 'dashboard', label: 'Dashboard', end: true },
  { to: '/admin/employees', icon: 'groups', label: 'Employees' },
  { to: '/admin/payslips', icon: 'payments', label: 'Payslips' },
  { to: '/admin/send', icon: 'send', label: 'Send' },
  { to: '/admin/holidays', icon: 'event', label: 'Holidays' },
  { to: '/admin/tickets', icon: 'build', label: 'Tickets' },
  { to: '/admin/audit', icon: 'history', label: 'Audit' },
];

export default function AdminShell() {
  const { user, clearAuth, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <div className="bg-background min-h-screen flex">
      <aside className="hidden lg:flex flex-col h-screen w-64 fixed left-0 top-0 bg-white z-40 py-6 border-r border-slate-200 shadow-sm">
        <div className="px-6 mb-8">
          <h2 className="text-primary font-headline font-black tracking-widest text-xs uppercase">Payslip Portal</h2>
          <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-tighter">HR Admin</p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar">
          {sideNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `px-6 py-3 flex items-center gap-3 transition-all duration-300 group font-body font-semibold text-xs uppercase tracking-tight ${
                  isActive
                    ? 'bg-primary/10 text-primary border-r-4 border-primary'
                    : 'text-on-surface-variant hover:bg-slate-50 hover:text-primary'
                }`
              }
            >
              <span className="material-symbols-outlined text-xl group-hover:scale-110 transition-transform">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-6 border-t border-slate-200 space-y-2">
          <div className="px-2 py-2 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-sm">person</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-on-surface truncate">{user?.name}</p>
              <p className="text-[10px] text-on-surface-variant font-label uppercase">{user?.role}</p>
            </div>
          </div>
          <button type="button" onClick={handleLogout} className="w-full btn-secondary btn-sm">
            <span className="material-symbols-outlined text-base">logout</span>
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl flex justify-between items-center w-full px-6 py-3 border-b border-slate-200">
          <img src="/nippon-logo.png" alt="Nippon Toyota" className="h-8 object-contain" />
          <span className="badge badge-success">Live</span>
        </header>
        <main className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
