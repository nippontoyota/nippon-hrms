import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import queryClient from '@/lib/queryClient';
import AdminShell from '@/components/layout/AdminShell';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/admin/DashboardPage';
import EmployeesPage from '@/pages/admin/EmployeesPage';
import EpfPage from '@/pages/admin/EpfPage';
import EmployeeFormPage from '@/pages/admin/EmployeeFormPage';
import SalaryPage from '@/pages/admin/SalaryPage';
import SalaryDirectoryPage from '@/pages/admin/SalaryDirectoryPage';
import LeaveDirectoryPage from '@/pages/admin/LeaveDirectoryPage';
import SalaryPeriodPage from '@/pages/admin/SalaryPeriodPage';
import DispatchJobPage from '@/pages/admin/DispatchJobPage';
import SettingsPage from '@/pages/admin/SettingsPage';
import { useThemeStore } from '@/stores/themeStore';

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
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin" element={<AdminShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="employees" element={<EmployeesPage />} />
            <Route path="employees/new" element={<EmployeeFormPage />} />
            <Route path="employees/:id/edit" element={<EmployeeFormPage />} />
            <Route path="epf" element={<EpfPage />} />
            <Route path="leaves" element={<LeaveDirectoryPage />} />
            <Route path="salary" element={<SalaryPage />} />
            <Route path="salary-directory" element={<SalaryDirectoryPage />} />
            <Route path="salary/:periodId" element={<SalaryPeriodPage />} />
            <Route path="salary/dispatch/:jobId" element={<DispatchJobPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
    </div>
  );
}
