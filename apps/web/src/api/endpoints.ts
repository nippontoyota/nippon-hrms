import api from '@/lib/axios';
import type {
  DashboardStats,
  DispatchJob,
  DispatchJobItem,
  Employee,
  EpfRecord,
  PayrollRecord,
  ImportResult,
  LeaveRequest,
  LeaveBalance,
} from './types';

export const employeesApi = {
  list: () => api.get<Employee[]>('/employees').then((r) => r.data),
  get: (id: string) => api.get<Employee>(`/employees/${id}`).then((r) => r.data),
  create: (employee: Partial<Employee>) => api.post('/employees', employee).then((r) => r.data),
  update: (id: string, employee: Partial<Employee>) =>
    api.patch(`/employees/${id}`, employee).then((r) => r.data),
  delete: (id: string) => api.delete(`/employees/${id}`).then((r) => r.data),
  commitBulkUpload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<ImportResult>('/employees/upload', form).then((r) => r.data);
  },
  downloadTemplate: () =>
    fetch('/templates/employee_template.xlsx').then((r) => r.blob()),
  downloadTemplateCsv: () =>
    api.get('/employees/template', { responseType: 'blob' }).then((r) => r.data),
  exportExcel: () =>
    api.get('/employees/export', { responseType: 'blob' }).then((r) => r.data),
};

export const epfApi = {
  list: () => api.get<EpfRecord[]>('/epf').then((r) => r.data),
  get: (id: string) => api.get<EpfRecord>(`/epf/${id}`).then((r) => r.data),
  update: (id: string, record: Partial<EpfRecord>) =>
    api.patch(`/epf/${id}`, record).then((r) => r.data),
  delete: (id: string) => api.delete(`/epf/${id}`).then((r) => r.data),
  commitBulkUpload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<ImportResult>('/epf/upload', form).then((r) => r.data);
  },
  exportExcel: () =>
    api.get('/epf/export', { responseType: 'blob' }).then((r) => r.data),
  downloadTemplateCsv: () =>
    api.get('/epf/template', { responseType: 'blob' }).then((r) => r.data),
};

export const salaryApi = {
  list: (month: number, year: number) =>
    api.get<PayrollRecord[]>(`/payroll/list?month=${month}&year=${year}`).then((r) => r.data),
  commitBulkUpload: (file: File, month: number, year: number) => {
    const form = new FormData();
    form.append('file', file);
    form.append('month', String(month));
    form.append('year', String(year));
    return api.post<ImportResult>('/payroll/upload', form).then((r) => r.data);
  },
  previewBulkUpload: (file: File, month: number, year: number) => {
    const form = new FormData();
    form.append('file', file);
    form.append('month', String(month));
    form.append('year', String(year));
    return api.post<{ records: PayrollRecord[]; errors: any[] }>('/payroll/upload-preview', form).then((r) => r.data);
  },
  dispatch: (month: number, year: number) =>
    api.post<{ jobId: string }>('/payroll/dispatch', { month, year }).then((r) => r.data),
  getDispatchJob: (jobId: string) =>
    api.get<DispatchJob>(`/payroll/dispatch/${jobId}`).then((r) => r.data),
  getDispatchJobItems: (jobId: string, params?: { status?: string; page?: number; limit?: number }) =>
    api.get<{ items: DispatchJobItem[]; total: number; page: number; limit: number }>(
      `/payroll/dispatch/${jobId}/items`,
      { params },
    ).then((r) => r.data),
  retryFailedDispatch: (jobId: string) =>
    api.post<DispatchJob>(`/payroll/dispatch/${jobId}/retry-failed`).then((r) => r.data),
  sendPayslip: (employeeId: string, month: number, year: number) =>
    api.post('/payroll/send', { employeeId, month, year }, { timeout: 60_000 }).then((r) => r.data),
  previewPayslip: (employeeId: string, month: number, year: number) =>
    api.get('/payroll/preview', { params: { employeeId, month, year }, responseType: 'blob' }).then((r) => r.data),
  validatePayroll: (month: number, year: number) =>
    api.post<{ errors: { employeeId: string; employeeName: string; reason: string }[] }>('/payroll/validate', { month, year }).then((r) => r.data),
  delete: (id: string) => api.delete(`/payroll/${id}`).then((r) => r.data),
  exportExcel: (month: number, year: number) => api.get(`/payroll/export?month=${month}&year=${year}`, { responseType: 'blob' }).then((r) => r.data),
  downloadTemplateCsv: (month: number, year: number) => api.get(`/payroll/template?month=${month}&year=${year}`, { responseType: 'blob' }).then((r) => r.data),
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

export const leaveApi = {
  list: () => api.get<LeaveRequest[]>('/leaves').then((r) => r.data),
  getBalance: (employeeId: string) => api.get<LeaveBalance>(`/leaves/balances?employeeId=${employeeId}`).then((r) => r.data),
  updateStatus: (id: string, status: 'approved' | 'rejected', rejectionReason?: string) =>
    api.patch(`/leaves/${id}`, {
      status,
      ...(rejectionReason ? { rejectionReason } : {}),
    }).then((r) => r.data),
};
