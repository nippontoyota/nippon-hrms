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
        className="hidden lg:flex flex-col h-screen fixed left-0 top-0 bg-white dark:bg-slate-800 z-40 border-r border-slate-300 dark:border-slate-700 overflow-hidden"
      >
        <div className="h-16 flex items-center justify-center border-b border-slate-300 dark:border-slate-700 px-2 shrink-0">
          <img src="/nippon-logo.png" alt="Toyota Logo" className={`object-contain opacity-80 transition-all duration-300 ${isCollapsed ? 'h-5' : 'h-8'}`} />
        </div>

        <nav className="flex-1 overflow-y-auto custom-scrollbar py-4 space-y-2 overflow-x-hidden">
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
              title={item.label}
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
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-300 dark:border-slate-700 flex flex-col gap-1">
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)} 
            className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors font-semibold text-[13px]`}
            title="Collapse Sidebar"
          >
            <List size={20} weight="bold" className="shrink-0" />
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="truncate whitespace-nowrap">
                  Collapse Sidebar
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          <button
            onClick={() => toggleTheme()}
            className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors font-semibold text-[13px]`}
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? <Sun size={20} weight="bold" className="shrink-0" /> : <Moon size={20} weight="bold" className="shrink-0" />}
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="truncate whitespace-nowrap">
                  {isDark ? "Light Mode" : "Dark Mode"}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          <button 
            onClick={handleLogout} 
            className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 text-slate-500 hover:text-[#eb0a1e] dark:text-slate-400 dark:hover:text-[#eb0a1e] transition-colors font-semibold text-[13px] rounded-md hover:bg-red-50 dark:hover:bg-red-950/30`}
            title="Logout"
          >
            <SignOut size={20} weight="bold" className="shrink-0" />
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="truncate whitespace-nowrap">
                  Logout
                </motion.span>
              )}
            </AnimatePresence>
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
