import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import queryClient from '@/lib/queryClient';
import AdminShell from '@/components/layout/AdminShell';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/admin/DashboardPage';
import EmployeesPage from '@/pages/admin/EmployeesPage';
import EmployeeFormPage from '@/pages/admin/EmployeeFormPage';
import PayslipsPage from '@/pages/admin/PayslipsPage';
import PayslipPeriodPage from '@/pages/admin/PayslipPeriodPage';
import SendPage from '@/pages/admin/SendPage';
import SendJobPage from '@/pages/admin/SendJobPage';
import HolidaysPage from '@/pages/admin/HolidaysPage';
import TicketsPage from '@/pages/admin/TicketsPage';
import AuditPage from '@/pages/admin/AuditPage';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin" element={<AdminShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="employees" element={<EmployeesPage />} />
            <Route path="employees/new" element={<EmployeeFormPage />} />
            <Route path="employees/:id/edit" element={<EmployeeFormPage />} />
            <Route path="payslips" element={<PayslipsPage />} />
            <Route path="payslips/:periodId" element={<PayslipPeriodPage />} />
            <Route path="send" element={<SendPage />} />
            <Route path="send/jobs/:jobId" element={<SendJobPage />} />
            <Route path="holidays" element={<HolidaysPage />} />
            <Route path="tickets" element={<TicketsPage />} />
            <Route path="audit" element={<AuditPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
