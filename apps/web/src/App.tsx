import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import queryClient from '@/lib/queryClient';
import AdminShell from '@/components/layout/AdminShell';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/admin/DashboardPage';
import EmployeesPage from '@/pages/admin/EmployeesPage';
import EmployeeFormPage from '@/pages/admin/EmployeeFormPage';
import SalaryPage from '@/pages/admin/SalaryPage';
import SalaryDirectoryPage from '@/pages/admin/SalaryDirectoryPage';
import SalaryPeriodPage from '@/pages/admin/SalaryPeriodPage';
import DispatchJobPage from '@/pages/admin/DispatchJobPage';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
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
              background: '#ffffff',
              color: '#0f172a',
              borderColor: '#e2e8f0',
            },
            success: {
              style: {
                background: '#f0fdf4',
                color: '#14532d',
                borderColor: '#bbf7d0',
              },
              iconTheme: {
                primary: '#16a34a',
                secondary: '#f0fdf4',
              },
            },
            error: {
              style: {
                background: '#fff5f5',
                color: '#7f1d1d',
                borderColor: '#fecaca',
              },
              iconTheme: {
                primary: '#dc2626',
                secondary: '#fff5f5',
              },
            },
            loading: {
              style: {
                background: '#f8fafc',
                color: '#1e293b',
                borderColor: '#e2e8f0',
              },
              iconTheme: {
                primary: '#64748b',
                secondary: '#f8fafc',
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
            <Route path="salary" element={<SalaryPage />} />
            <Route path="salary-directory" element={<SalaryDirectoryPage />} />
            <Route path="salary/:periodId" element={<SalaryPeriodPage />} />
            <Route path="salary/dispatch/:jobId" element={<DispatchJobPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
