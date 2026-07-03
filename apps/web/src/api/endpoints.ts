import api from '@/lib/axios';
import type {
  DashboardStats,
  DispatchJob,
  DispatchJobItem,
  Employee,
  EpfRecord,
  PayrollRecord,
  ImportJob,
  ImportEntityType,
  ImportMode,
  PaginatedResult,
  PaginatedConflicts,
  LeaveRequest,
  LeaveBalance,
  Holiday,
} from './types';

export const employeesApi = {
  list: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get<PaginatedResult<Employee>>('/employees', { params }).then((r) => r.data),
  get: (id: string) => api.get<Employee>(`/employees/${id}`).then((r) => r.data),
  create: (employee: Partial<Employee>) => api.post('/employees', employee).then((r) => r.data),
  update: (id: string, employee: Partial<Employee>) =>
    api.patch(`/employees/${id}`, employee).then((r) => r.data),
  delete: (id: string) => api.delete(`/employees/${id}`).then((r) => r.data),
  downloadTemplate: () =>
    fetch('/templates/employee_template.xlsx').then((r) => r.blob()),
  downloadTemplateCsv: () =>
    api.get('/employees/template', { responseType: 'blob' }).then((r) => r.data),
  exportExcel: () =>
    api.get('/employees/export', { responseType: 'blob' }).then((r) => r.data),
};

export const epfApi = {
  list: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get<PaginatedResult<EpfRecord>>('/epf', { params }).then((r) => r.data),
  get: (id: string) => api.get<EpfRecord>(`/epf/${id}`).then((r) => r.data),
  update: (id: string, record: Partial<EpfRecord>) =>
    api.patch(`/epf/${id}`, record).then((r) => r.data),
  delete: (id: string) => api.delete(`/epf/${id}`).then((r) => r.data),
  exportExcel: () =>
    api.get('/epf/export', { responseType: 'blob' }).then((r) => r.data),
  downloadTemplateCsv: () =>
    api.get('/epf/template', { responseType: 'blob' }).then((r) => r.data),
};

export const salaryApi = {
  list: (month: number, year: number, params?: { page?: number; limit?: number; search?: string }) =>
    api.get<PaginatedResult<PayrollRecord>>(`/payroll/list?month=${month}&year=${year}`, { params }).then((r) => r.data),
  dispatch: (month: number, year: number) =>
    api.post<{ jobId: string }>('/payroll/dispatch', { month, year }).then((r) => r.data),
  getLatestDispatchJob: (month: number, year: number) =>
    api.get<DispatchJob | null>(`/payroll/dispatch/latest?month=${month}&year=${year}`).then((r) => r.data),
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

export const holidaysApi = {
  list: (year?: number, month?: number) => api.get<Holiday[]>('/holidays', { params: { year, month } }).then((r) => r.data),
  create: (data: { date: string; name: string }) => api.post<Holiday>('/holidays', data).then((r) => r.data),
  bulkUpload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/holidays/upload', form, { timeout: 60_000 }).then((r) => r.data);
  },
  delete: (id: string) => api.delete(`/holidays/${id}`).then((r) => r.data),
};
export const importsApi = {
  start: (file: File, entityType: ImportEntityType, mode: ImportMode, month?: number, year?: number) => {
    const form = new FormData();
    form.append('file', file);
    form.append('entityType', entityType);
    form.append('mode', mode);
    if (month != null) form.append('month', String(month));
    if (year != null) form.append('year', String(year));
    return api.post<ImportJob>('/imports', form, { timeout: 300_000 }).then((r) => r.data);
  },
  getJob: (jobId: string) => api.get<ImportJob>(`/imports/${jobId}`).then((r) => r.data),
  latestConflictsJob: (entityType: ImportEntityType) =>
    api.get<ImportJob | null>('/imports/latest-conflicts', { params: { entityType } }).then((r) => r.data),
  listConflicts: (jobId: string, params?: { page?: number; limit?: number; search?: string }) =>
    api.get<PaginatedConflicts>(`/imports/${jobId}/conflicts`, { params }).then((r) => r.data),
  resolveConflicts: (jobId: string, conflictIds: string[], resolution: 'keep_existing' | 'use_imported') =>
    api.post(`/imports/${jobId}/conflicts/resolve`, { conflictIds, resolution }).then((r) => r.data),
  resolveAllConflicts: (jobId: string, resolution: 'keep_existing' | 'use_imported') =>
    api.post(`/imports/${jobId}/conflicts/resolve-all`, { resolution }).then((r) => r.data),
};

export const dashboardApi = {
  get: async () => {
    try {
      const employees = await employeesApi.list({ page: 1, limit: 1 });
      return {
        employeeCount: employees.total,
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
