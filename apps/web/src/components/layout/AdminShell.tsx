import { useState, useEffect } from 'react';
import { Navigate, Outlet, NavLink, useNavigate } from 'react-router-dom';
import { SquaresFour, Users, IdentificationCard, Money, SignOut, ListDashes, List, Sun, Moon, CalendarCheck } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { refreshAccessToken } from '@/lib/authRefresh';

const sideNav = [
  { to: '/admin', icon: SquaresFour, label: 'HR Overview', end: true },
  { to: '/admin/employees', icon: Users, label: 'Employee Directory' },
  { to: '/admin/epf', icon: IdentificationCard, label: 'EPF Records' },
  { to: '/admin/leaves', icon: CalendarCheck, label: 'Leave Requests' },
  { to: '/admin/salary-directory', icon: ListDashes, label: 'Salary Directory' },
  { to: '/admin/salary', icon: Money, label: 'Process Payroll' },
];

export default function AdminShell() {
  const { clearAuth, isAuthenticated, accessToken } = useAuthStore();
  const isDark = useThemeStore((s) => s.isDark);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    const timer = setInterval(() => {
      refreshAccessToken().catch(() => {});
    }, 10 * 60 * 1000);
    return () => clearInterval(timer);
  }, [accessToken]);

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen flex font-body transition-colors">
      {/* Sidebar */}
      <motion.aside 
        animate={{ width: isCollapsed ? 80 : 224 }}
        transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
        className="hidden lg:flex flex-col h-screen fixed left-0 top-0 bg-white dark:bg-slate-800 z-40 border-r border-slate-300 dark:border-slate-700"
      >
        <div className="h-16 flex items-center justify-center border-b border-slate-300 dark:border-slate-700 px-2 shrink-0">
          <img src="/nippon-logo.png" alt="Toyota Logo" className={`object-contain opacity-80 transition-all duration-300 ${isCollapsed ? 'h-5' : 'h-8'}`} />
        </div>

        <nav className="flex-1 py-4 space-y-2">
          {sideNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `mx-3 px-3 py-2.5 flex items-center relative ${isCollapsed ? 'justify-center' : 'gap-3'} transition-colors group font-semibold text-[13px] rounded-md ${
                  isActive
                    ? 'text-white'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white'
                }`
              }
              style={{ borderRadius: '0.375rem' }}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute inset-0 bg-[#eb0a1e] rounded-md"
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                    />
                  )}
                  <item.icon size={20} weight={isActive ? "fill" : "regular"} className="shrink-0 relative z-10" />
                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.span 
                        initial={{ opacity: 0, width: 0 }} 
                        animate={{ opacity: 1, width: 'auto' }} 
                        exit={{ opacity: 0, width: 0 }}
                        className="truncate whitespace-nowrap relative z-10"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>

                  {/* Modern Tooltip for Collapsed State */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-4 px-3 py-1.5 bg-slate-800 dark:bg-slate-700 text-white text-xs font-semibold rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 translate-x-[-4px] group-hover:translate-x-0 pointer-events-none border border-slate-700 dark:border-slate-600">
                      {item.label}
                      <div className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-2 bg-slate-800 dark:bg-slate-700 rotate-45 border-l border-b border-slate-700 dark:border-slate-600"></div>
                    </div>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-300 dark:border-slate-700 flex flex-col gap-1 relative z-50">
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)} 
            className={`group relative flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors font-semibold text-[13px]`}
          >
            <List size={20} weight="bold" className="shrink-0" />
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="truncate whitespace-nowrap">
                  Collapse Sidebar
                </motion.span>
              )}
            </AnimatePresence>
            {isCollapsed && (
              <div className="absolute left-full ml-4 px-3 py-1.5 bg-slate-800 dark:bg-slate-700 text-white text-xs font-semibold rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 translate-x-[-4px] group-hover:translate-x-0 pointer-events-none border border-slate-700 dark:border-slate-600">
                Expand Sidebar
                <div className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-2 bg-slate-800 dark:bg-slate-700 rotate-45 border-l border-b border-slate-700 dark:border-slate-600"></div>
              </div>
            )}
          </button>
          <button
            onClick={() => toggleTheme()}
            className={`group relative flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors font-semibold text-[13px]`}
          >
            {isDark ? <Sun size={20} weight="bold" className="shrink-0" /> : <Moon size={20} weight="bold" className="shrink-0" />}
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="truncate whitespace-nowrap">
                  {isDark ? "Light Mode" : "Dark Mode"}
                </motion.span>
              )}
            </AnimatePresence>
            {isCollapsed && (
              <div className="absolute left-full ml-4 px-3 py-1.5 bg-slate-800 dark:bg-slate-700 text-white text-xs font-semibold rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 translate-x-[-4px] group-hover:translate-x-0 pointer-events-none border border-slate-700 dark:border-slate-600">
                {isDark ? "Light Mode" : "Dark Mode"}
                <div className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-2 bg-slate-800 dark:bg-slate-700 rotate-45 border-l border-b border-slate-700 dark:border-slate-600"></div>
              </div>
            )}
          </button>
          <button 
            onClick={handleLogout} 
            className={`group relative flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 text-slate-500 hover:text-[#eb0a1e] dark:text-slate-400 dark:hover:text-[#eb0a1e] transition-colors font-semibold text-[13px] rounded-md hover:bg-red-50 dark:hover:bg-red-950/30`}
          >
            <SignOut size={20} weight="bold" className="shrink-0" />
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="truncate whitespace-nowrap">
                  Logout
                </motion.span>
              )}
            </AnimatePresence>
            {isCollapsed && (
              <div className="absolute left-full ml-4 px-3 py-1.5 bg-rose-600 text-white text-xs font-semibold rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 translate-x-[-4px] group-hover:translate-x-0 pointer-events-none border border-rose-700">
                Logout
                <div className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-2 bg-rose-600 rotate-45 border-l border-b border-rose-700"></div>
              </div>
            )}
          </button>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <motion.div 
        animate={{ marginLeft: isCollapsed ? 80 : 224 }}
        transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
        className="flex-1 flex flex-col min-h-screen min-w-0"
      >


        {/* Page Content */}
        <main className="flex-1 p-6 lg:p-8 min-w-0">
          <Outlet />
        </main>
      </motion.div>
    </div>
  );
}
