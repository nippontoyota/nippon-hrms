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
import SalaryPeriodPage from '@/pages/admin/SalaryPeriodPage';
import DispatchJobPage from '@/pages/admin/DispatchJobPage';
import AttendancePage from '@/pages/admin/AttendancePage';
import HolidaysPage from '@/pages/admin/HolidaysPage';
import DispatchLogPage from '@/pages/admin/DispatchLogPage';
import LeaveLogPage from '@/pages/admin/LeaveLogPage';
import FeedbackLogPage from '@/pages/admin/FeedbackLogPage';

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
            <Route path="salary" element={<SalaryPage />} />
            <Route path="salary/:periodId" element={<SalaryPeriodPage />} />
            <Route path="salary/dispatch/:jobId" element={<DispatchJobPage />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="holidays" element={<HolidaysPage />} />
            <Route path="logs/dispatch" element={<DispatchLogPage />} />
            <Route path="logs/leave" element={<LeaveLogPage />} />
            <Route path="logs/feedback" element={<FeedbackLogPage />} />
            {/* Legacy redirects */}
            <Route path="payslips" element={<Navigate to="/admin/salary" replace />} />
            <Route path="payslips/*" element={<Navigate to="/admin/salary" replace />} />
            <Route path="send" element={<Navigate to="/admin/salary" replace />} />
            <Route path="send/*" element={<Navigate to="/admin/salary" replace />} />
            <Route path="audit" element={<Navigate to="/admin/logs/dispatch" replace />} />
            <Route path="tickets" element={<Navigate to="/admin" replace />} />
          </Route>
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
