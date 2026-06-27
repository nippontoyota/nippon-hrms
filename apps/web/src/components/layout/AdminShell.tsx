import { useState } from 'react';
import { Navigate, Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { SquaresFour, Users, Money, House, SignOut, ListDashes, List, Sun, Moon } from '@phosphor-icons/react';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';

const sideNav = [
  { to: '/admin', icon: SquaresFour, label: 'HR Overview', end: true },
  { to: '/admin/employees', icon: Users, label: 'Employee Directory' },
  { to: '/admin/salary-directory', icon: ListDashes, label: 'Salary Directory' },
  { to: '/admin/salary', icon: Money, label: 'Process Payroll' },
];

export default function AdminShell() {
  const { clearAuth, isAuthenticated } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

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
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen flex font-body transition-colors">
      {/* Sidebar */}
      <aside className={`hidden lg:flex flex-col h-screen fixed left-0 top-0 bg-white dark:bg-slate-800 z-40 border-r border-slate-300 dark:border-slate-700 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-56'}`}>
        <div className="h-16 flex items-center justify-center border-b border-slate-300 dark:border-slate-700 overflow-hidden px-2">
          <img src="/nippon-logo.png" alt="Toyota Logo" className={`object-contain opacity-80 transition-all duration-300 ${isCollapsed ? 'h-5' : 'h-8'}`} />
        </div>

        <nav className="flex-1 overflow-y-auto custom-scrollbar py-4 space-y-2 overflow-x-hidden">
          {sideNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `mx-3 px-3 py-2.5 flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} transition-colors group font-semibold text-[13px] rounded-md ${
                  isActive
                    ? 'bg-[#eb0a1e] text-white'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white'
                }`
              }
              style={{ borderRadius: '0.375rem' }}
              title={isCollapsed ? item.label : undefined}
            >
              {({ isActive }) => (
                <>
                  <item.icon size={20} weight={isActive ? "fill" : "regular"} className="shrink-0" />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-h-screen min-w-0 transition-all duration-300 ease-in-out ${isCollapsed ? 'lg:ml-20' : 'lg:ml-56'}`}>
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white dark:bg-slate-800 h-16 flex justify-between items-center px-6 lg:px-8 border-b border-slate-300 dark:border-slate-700 transition-colors">
          <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 font-medium">
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)} 
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors hidden lg:block cursor-pointer"
            >
              <List size={20} weight="bold" className="text-slate-700 dark:text-slate-300" />
            </button>
            <div className="flex items-center gap-2">
              <House size={16} weight="regular" />
              <span>/</span>
              <span className="text-slate-900 dark:text-white">{currentLabel}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <Sun size={20} weight="bold" /> : <Moon size={20} weight="bold" />}
            </button>
            <button onClick={handleLogout} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-[#eb0a1e] dark:hover:text-[#eb0a1e] transition-colors font-semibold text-sm cursor-pointer">
              <SignOut size={18} weight="bold" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 lg:p-8 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
