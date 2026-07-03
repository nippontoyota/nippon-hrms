import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import queryClient from '@/lib/queryClient';
import { Suspense, lazy } from 'react';
import AdminShell from '@/components/layout/AdminShell';
import { useThemeStore } from '@/stores/themeStore';

const LoginPage = lazy(() => import('@/pages/LoginPage'));
const DashboardPage = lazy(() => import('@/pages/admin/DashboardPage'));
const EmployeesPage = lazy(() => import('@/pages/admin/EmployeesPage'));
const EpfPage = lazy(() => import('@/pages/admin/EpfPage'));
const EmployeeFormPage = lazy(() => import('@/pages/admin/EmployeeFormPage'));
const SalaryPage = lazy(() => import('@/pages/admin/SalaryPage'));
const SalaryDirectoryPage = lazy(() => import('@/pages/admin/SalaryDirectoryPage'));
const LeaveDirectoryPage = lazy(() => import('@/pages/admin/LeaveDirectoryPage'));
const SalaryPeriodPage = lazy(() => import('@/pages/admin/SalaryPeriodPage'));
const DispatchJobPage = lazy(() => import('@/pages/admin/DispatchJobPage'));
const SettingsPage = lazy(() => import('@/pages/admin/SettingsPage'));
const HolidaysPage = lazy(() => import('@/pages/admin/HolidaysPage'));
const ReferralDirectoryPage = lazy(() => import('@/pages/admin/ReferralDirectoryPage'));
const ReferralPage = lazy(() => import('@/pages/careers/ReferralPage'));

export default function App() {
  const isDark = useThemeStore((s) => s.isDark);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <div className={isDark ? 'dark' : ''}>
      <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Toaster
          position="bottom-right"
          gutter={8}
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: '0px',
              padding: '12px 16px',
              fontSize: '13px',
              fontFamily: 'Geist, system-ui, sans-serif',
              fontWeight: '500',
              letterSpacing: '0.01em',
              boxShadow: '0 4px 16px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)',
              maxWidth: '380px',
              border: '1px solid',
              background: isDark ? '#1e293b' : '#ffffff',
              color: isDark ? '#f8fafc' : '#0f172a',
              borderColor: isDark ? '#334155' : '#e2e8f0',
            },
            success: {
              style: {
                background: isDark ? '#064e3b' : '#f0fdf4',
                color: isDark ? '#ecfdf5' : '#14532d',
                borderColor: isDark ? '#065f46' : '#bbf7d0',
              },
              iconTheme: {
                primary: '#16a34a',
                secondary: isDark ? '#064e3b' : '#f0fdf4',
              },
            },
            error: {
              style: {
                background: isDark ? '#7f1d1d' : '#fff5f5',
                color: isDark ? '#fef2f2' : '#7f1d1d',
                borderColor: isDark ? '#991b1b' : '#fecaca',
              },
              iconTheme: {
                primary: '#dc2626',
                secondary: isDark ? '#7f1d1d' : '#fff5f5',
              },
            },
            loading: {
              style: {
                background: isDark ? '#0f172a' : '#f8fafc',
                color: isDark ? '#f8fafc' : '#1e293b',
                borderColor: isDark ? '#1e293b' : '#e2e8f0',
              },
              iconTheme: {
                primary: '#64748b',
                secondary: isDark ? '#0f172a' : '#f8fafc',
              },
            },
          }}
        />
        <Suspense fallback={<div className="flex h-screen items-center justify-center dark:bg-slate-900"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/careers/refer" element={<ReferralPage />} />
            <Route path="/admin" element={<AdminShell />}>
              <Route index element={<DashboardPage />} />
              <Route path="employees" element={<EmployeesPage />} />
              <Route path="employees/new" element={<EmployeeFormPage />} />
              <Route path="employees/:id/edit" element={<EmployeeFormPage />} />
              <Route path="epf" element={<EpfPage />} />
              <Route path="leaves" element={<LeaveDirectoryPage />} />
              <Route path="referrals" element={<ReferralDirectoryPage />} />
              <Route path="holidays" element={<HolidaysPage />} />
              <Route path="salary" element={<SalaryPage />} />
              <Route path="salary-directory" element={<SalaryDirectoryPage />} />
              <Route path="salary/:periodId" element={<SalaryPeriodPage />} />
              <Route path="salary/dispatch/:jobId" element={<DispatchJobPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
    </div>
  );
}
