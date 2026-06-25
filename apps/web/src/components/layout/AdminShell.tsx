import { Navigate, Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

const sideNav = [
  { to: '/admin', icon: 'dashboard', label: 'Dashboard', end: true },
  { to: '/admin/employees', icon: 'groups', label: 'Employees' },
  { to: '/admin/salary', icon: 'payments', label: 'Payroll' },
  { to: '/admin/attendance', icon: 'calendar_month', label: 'Attendance' },
  { to: '/admin/holidays', icon: 'event', label: 'Holidays' },
  { to: '/admin/logs/dispatch', icon: 'send', label: 'Dispatch Log' },
  { to: '/admin/logs/leave', icon: 'event_available', label: 'Leave Requests' },
  { to: '/admin/logs/feedback', icon: 'reviews', label: 'Feedback' },
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
          <h2 className="text-primary font-headline font-black tracking-widest text-xs uppercase">Nippon HR Connect</h2>
          <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-tighter">Admin Portal</p>
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
            <div>
              <p className="text-xs font-bold text-on-surface">{user?.name}</p>
              <p className="text-[10px] text-on-surface-variant font-label uppercase">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full text-on-surface-variant py-2 flex items-center gap-3 hover:text-tertiary transition-colors text-xs uppercase font-bold tracking-wider px-2"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl flex justify-between items-center w-full px-6 py-3 border-b border-slate-200">
          <div className="flex items-center gap-8">
            <img src="/nippon-logo.png" alt="Nippon Toyota" className="h-8 object-contain" />
            <nav className="hidden lg:flex items-center gap-6 font-headline tracking-tighter uppercase text-sm">
              {sideNav.slice(0, 4).map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    isActive
                      ? 'text-primary border-b-2 border-primary pb-1'
                      : 'text-on-surface-variant font-medium hover:text-primary transition-colors'
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-xs font-label text-on-surface-variant">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="uppercase tracking-widest hidden md:block">{user?.name}</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
