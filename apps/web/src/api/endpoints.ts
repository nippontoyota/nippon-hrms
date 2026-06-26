import api from '@/lib/axios';
import type {
  DashboardStats,
  Employee,
  EmployeeInput,
  ImportResult,
} from './types';

export const employeesApi = {
  list: () => api.get<Employee[]>('/employees').then((r) => r.data),
  get: (id: string) => api.get<Employee>(`/employees/${id}`).then((r) => r.data),
  create: (data: EmployeeInput) => api.post<Employee>('/employees', data).then((r) => r.data),
  update: (id: string, data: EmployeeInput) =>
    api.patch<Employee>(`/employees/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/employees/${id}`),
  commitBulkUpload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<ImportResult>('/employees/upload', form).then((r) => r.data);
  },
  downloadTemplate: () =>
    fetch('/templates/employee_template.xlsx').then((r) => r.blob()),
};

export const salaryApi = {
  commitBulkUpload: (file: File, month: number, year: number) => {
    const form = new FormData();
    form.append('file', file);
    form.append('month', String(month));
    form.append('year', String(year));
    return api.post<ImportResult>('/payroll/upload', form).then((r) => r.data);
  },
  dispatch: (month: number, year: number) =>
    api.post<{ jobId: string }>('/payroll/dispatch', { month, year }).then((r) => r.data),
};

export const holidaysApi = {
  upload: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post<ImportResult>("/holidays/upload", form).then((r) => r.data);
  },
};

export const dashboardApi = {
  get: async () => {
    try {
      const employees = await employeesApi.list();
      return {
        employeeCount: employees.length,
        pendingLeaveRequests: 0,
        pendingDispatchJobs: 0,
        attendancePeriods: 0,
      } as DashboardStats;
    } catch {
      return {
        employeeCount: 0,
        pendingLeaveRequests: 0,
        pendingDispatchJobs: 0,
        attendancePeriods: 0,
      } as DashboardStats;
    }
  }
};
