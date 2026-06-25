import api from '@/lib/axios';
import type {
  AuditEntry,
  DashboardStats,
  Employee,
  EmployeeInput,
  Holiday,
  ImportResult,
  LoginResponse,
  MaintenanceTicket,
  PayslipPeriod,
  PayslipRecord,
  SendJob,
  TicketStatus,
} from './types';

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { email, password }).then((r) => r.data),
};

export const dashboardApi = {
  get: () => api.get<DashboardStats>('/dashboard').then((r) => r.data),
};

export const employeesApi = {
  list: () => api.get<Employee[]>('/employees').then((r) => r.data),
  get: (id: string) => api.get<Employee>(`/employees/${id}`).then((r) => r.data),
  create: (data: EmployeeInput) => api.post<Employee>('/employees', data).then((r) => r.data),
  update: (id: string, data: EmployeeInput) => api.put<Employee>(`/employees/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/employees/${id}`),
  import: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<ImportResult>('/employees/import', form).then((r) => r.data);
  },
  downloadTemplate: () =>
    api.get('/employees/import/template', { responseType: 'blob' }).then((r) => r.data as Blob),
};

export const payslipsApi = {
  listPeriods: () => api.get<PayslipPeriod[]>('/payslips/periods').then((r) => r.data),
  getPeriod: (id: string) => api.get<PayslipPeriod>(`/payslips/periods/${id}`).then((r) => r.data),
  getRecords: (periodId: string) =>
    api.get<PayslipRecord[]>(`/payslips/periods/${periodId}/records`).then((r) => r.data),
  import: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<ImportResult>('/payslips/import', form).then((r) => r.data);
  },
  downloadTemplate: () =>
    api.get('/payslips/import/template', { responseType: 'blob' }).then((r) => r.data as Blob),
  finalize: (periodId: string) =>
    api.post<PayslipPeriod>(`/payslips/periods/${periodId}/finalize`).then((r) => r.data),
  previewPdf: (periodId: string, employeeId: string) =>
    api
      .get(`/payslips/periods/${periodId}/preview/${employeeId}`, { responseType: 'blob' })
      .then((r) => r.data as Blob),
  startSend: (periodId: string) =>
    api.post<{ jobId: string }>(`/payslips/periods/${periodId}/send`).then((r) => r.data),
};

export const sendJobsApi = {
  get: (jobId: string) => api.get<SendJob>(`/send-jobs/${jobId}`).then((r) => r.data),
  retryFailed: (jobId: string) =>
    api.post<SendJob>(`/send-jobs/${jobId}/retry-failed`).then((r) => r.data),
};

export const holidaysApi = {
  list: () => api.get<Holiday[]>('/holidays').then((r) => r.data),
  create: (data: Omit<Holiday, 'id'>) => api.post<Holiday>('/holidays', data).then((r) => r.data),
  remove: (id: string) => api.delete(`/holidays/${id}`),
};

export const ticketsApi = {
  list: () => api.get<MaintenanceTicket[]>('/tickets').then((r) => r.data),
  updateStatus: (id: string, status: TicketStatus) =>
    api.patch<MaintenanceTicket>(`/tickets/${id}`, { status }).then((r) => r.data),
};

export const auditApi = {
  list: () => api.get<AuditEntry[]>('/audit').then((r) => r.data),
};
