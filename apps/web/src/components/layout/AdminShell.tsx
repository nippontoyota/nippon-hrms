import { Navigate, Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { SquaresFour, Users, Money, House, SignOut, ListDashes } from '@phosphor-icons/react';
import { useAuthStore } from '@/stores/authStore';

const sideNav = [
  { to: '/admin', icon: SquaresFour, label: 'HR Overview', end: true },
  { to: '/admin/employees', icon: Users, label: 'Employee Directory' },
  { to: '/admin/salary-directory', icon: ListDashes, label: 'Salary Directory' },
  { to: '/admin/salary', icon: Money, label: 'Process Payroll' },
];

export default function AdminShell() {
  const { clearAuth, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const currentLabel = sideNav.find(item => 
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
  )?.label || 'Page';

  return (
    <div className="bg-slate-50 min-h-screen flex font-body">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col h-screen w-56 fixed left-0 top-0 bg-white z-40 border-r border-slate-300">
        <div className="h-16 flex items-center justify-center border-b border-slate-300">
          <img src="/nippon-logo.png" alt="Toyota Logo" className="h-8 object-contain opacity-80" />
        </div>

        <nav className="flex-1 overflow-y-auto custom-scrollbar py-4 space-y-1">
          {sideNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `mx-3 px-3 py-2 flex items-center gap-3 transition-none group font-semibold text-[13px] ${
                  isActive
                    ? 'bg-[#eb0a1e] text-white'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={20} weight={isActive ? "fill" : "regular"} />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-56 flex flex-col min-h-screen min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white h-16 flex justify-between items-center px-8 border-b border-slate-300">
          <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
            <House size={16} weight="regular" />
            <span>/</span>
            <span className="text-slate-900">{currentLabel}</span>
          </div>
          <div className="flex items-center">
            <button onClick={handleLogout} className="flex items-center gap-2 text-slate-500 hover:text-[#eb0a1e] transition-colors font-semibold text-sm">
              <SignOut size={18} weight="bold" />
              <span>Logout</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
