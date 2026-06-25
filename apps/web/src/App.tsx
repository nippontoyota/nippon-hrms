import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import queryClient from '@/lib/queryClient';
import AppShell     from '@/components/layout/AppShell';
import LoginPage    from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import EmployeesPage from '@/pages/EmployeesPage';
import LeavesPage   from '@/pages/LeavesPage';
import PayrollPage  from '@/pages/PayrollPage';
import WhatsAppPage from '@/pages/WhatsAppPage';
import SettingsPage from '@/pages/SettingsPage';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected — wrapped by AppShell (auth guard) */}
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard"  element={<DashboardPage />} />
            <Route path="/employees"  element={<EmployeesPage />} />
            <Route path="/leaves"     element={<LeavesPage />}    />
            <Route path="/payroll"    element={<PayrollPage />}   />
            <Route path="/whatsapp"   element={<WhatsAppPage />}  />
            <Route path="/settings"   element={<SettingsPage />}  />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
