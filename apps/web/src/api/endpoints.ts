import api from '@/lib/axios';
import type {
  AttendancePeriod,
  DashboardStats,
  DispatchJob,
  DispatchLogEntry,
  Employee,
  EmployeeInput,
  FeedbackResponse,
  HolidayFile,
  ImportPreviewResult,
  ImportResult,
  LeaveRequest,
  LoginResponse,
  SalaryPeriod,
  SalaryRecord,
} from './types';

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>('/admin/login', { email, password }).then((r) => r.data),
};

export const dashboardApi = {
  get: () => api.get<DashboardStats>('/admin/dashboard').then((r) => r.data),
};

export const employeesApi = {
  list: () => api.get<Employee[]>('/admin/employees').then((r) => r.data),
  get: (id: string) => api.get<Employee>(`/admin/employees/${id}`).then((r) => r.data),
  create: (data: EmployeeInput) => api.post<Employee>('/admin/employees', data).then((r) => r.data),
  update: (id: string, data: EmployeeInput) =>
    api.put<Employee>(`/admin/employees/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/admin/employees/${id}`),
  previewBulkUpload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<ImportPreviewResult>('/admin/employees/bulk-upload/preview', form).then((r) => r.data);
  },
  commitBulkUpload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<ImportResult>('/admin/employees/bulk-upload', form).then((r) => r.data);
  },
  downloadTemplate: () =>
    fetch('/templates/employee_template.xlsx').then((r) => r.blob()),
};

export const salaryApi = {
  listPeriods: () => api.get<SalaryPeriod[]>('/admin/salary/periods').then((r) => r.data),
  getPeriod: (id: string) => api.get<SalaryPeriod>(`/admin/salary/periods/${id}`).then((r) => r.data),
  getRecords: (periodId: string) =>
    api.get<SalaryRecord[]>(`/admin/salary/periods/${periodId}/records`).then((r) => r.data),
  previewBulkUpload: (file: File, month: number, year: number) => {
    const form = new FormData();
    form.append('file', file);
    form.append('month', String(month));
    form.append('year', String(year));
    return api.post<ImportPreviewResult>('/admin/salary/bulk-upload/preview', form).then((r) => r.data);
  },
  commitBulkUpload: (file: File, month: number, year: number) => {
    const form = new FormData();
    form.append('file', file);
    form.append('month', String(month));
    form.append('year', String(year));
    return api.post<ImportResult>('/admin/salary/bulk-upload', form).then((r) => r.data);
  },
  downloadTemplate: () => fetch('/templates/salary_template.xlsx').then((r) => r.blob()),
  previewPdf: (periodId: string, employeeId: string) =>
    api
      .get(`/admin/salary/periods/${periodId}/preview/${employeeId}`, { responseType: 'blob' })
      .then((r) => r.data as Blob),
  dispatch: (month: number, year: number) =>
    api.post<{ jobId: string }>('/admin/salary/dispatch', { month, year }).then((r) => r.data),
  getDispatchJob: (jobId: string) =>
    api.get<DispatchJob>(`/admin/salary/dispatch/${jobId}`).then((r) => r.data),
  retryFailed: (jobId: string) =>
    api.post<DispatchJob>(`/admin/salary/dispatch/${jobId}/retry-failed`).then((r) => r.data),
};

export const attendanceApi = {
  listPeriods: () => api.get<AttendancePeriod[]>('/admin/attendance/periods').then((r) => r.data),
  upload: (file: File, month: number, year: number) => {
    const form = new FormData();
    form.append('file', file);
    form.append('month', String(month));
    form.append('year', String(year));
    return api.post<ImportResult>('/admin/attendance/bulk-upload', form).then((r) => r.data);
  },
};

export const holidaysApi = {
  list: () => api.get<HolidayFile[]>('/admin/holidays').then((r) => r.data),
  upload: (file: File, year: number) => {
    const form = new FormData();
    form.append('file', file);
    form.append('year', String(year));
    return api.post<HolidayFile>('/admin/holidays/upload', form).then((r) => r.data);
  },
};

export const logsApi = {
  dispatch: (params?: { month?: number; year?: number; status?: string }) =>
    api.get<DispatchLogEntry[]>('/admin/logs/dispatch', { params }).then((r) => r.data),
  leave: () => api.get<LeaveRequest[]>('/admin/logs/leave').then((r) => r.data),
  feedback: () => api.get<FeedbackResponse[]>('/admin/logs/feedback').then((r) => r.data),
};
