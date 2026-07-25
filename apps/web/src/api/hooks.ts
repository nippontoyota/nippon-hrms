import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  dashboardApi,
  employeesApi,
  epfApi,
  salaryApi,
  leaveApi,
  importsApi,
  holidaysApi,
} from './endpoints';
import type { Employee } from './types';

export function useDashboard() {
  return useQuery({ queryKey: ['dashboard'], queryFn: dashboardApi.get });
}

export function useEmployees(params?: { page?: number; limit?: number; search?: string }) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 50;
  const search = params?.search ?? '';
  return useQuery({
    queryKey: ['employees', page, limit, search],
    queryFn: () => employeesApi.list({ page, limit, search }),
  });
}

export function useEmployee(id: string | undefined) {
  return useQuery({
    queryKey: ['employees', id],
    queryFn: () => employeesApi.get(id!),
    enabled: !!id,
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: employeesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateEmployee(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Employee>) => employeesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      qc.invalidateQueries({ queryKey: ['employees', id] });
    },
  });
}

export function useDeleteEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: employeesApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useEpfRecords(params?: { page?: number; limit?: number; search?: string }) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 50;
  const search = params?.search ?? '';
  return useQuery({
    queryKey: ['epf', page, limit, search],
    queryFn: () => epfApi.list({ page, limit, search }),
    retry: 1,
  });
}

export function useDeleteEpfRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: epfApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['epf'] });
    },
  });
}

export function useBulkDeleteEpfRecords() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => epfApi.bulkDelete(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['epf'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeletePayroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => salaryApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll'] });
    },
  });
}

export function useBulkDeletePayroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ month, year }: { month: number; year: number }) => salaryApi.bulkDelete(month, year),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useSendablePeriods(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['payroll', 'sendable-periods', employeeId],
    queryFn: () => salaryApi.listSendablePeriods(employeeId!),
    enabled: !!employeeId,
  });
}

export function usePayrollRecords(month: number, year: number, params?: { page?: number; limit?: number; search?: string }) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 50;
  const search = params?.search ?? '';
  return useQuery({
    queryKey: ['payroll', month, year, page, limit, search],
    queryFn: () => salaryApi.list(month, year, { page, limit, search }),
  });
}

export function useImportJob(jobId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['import-job', jobId],
    queryFn: () => importsApi.getJob(jobId!),
    enabled: !!jobId && enabled,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status || status === 'COMPLETED' || status === 'FAILED') return false;
      return 2000;
    },
  });
}

export function useLatestConflictsJob(entityType: 'employees' | 'epf' | 'payroll') {
  return useQuery({
    queryKey: ['import-conflicts-job', entityType],
    queryFn: () => importsApi.latestConflictsJob(entityType),
  });
}

export function useImportConflicts(jobId: string | undefined, page = 1, search = '') {
  return useQuery({
    queryKey: ['import-conflicts', jobId, page, search],
    queryFn: () => importsApi.listConflicts(jobId!, { page, limit: 20, search }),
    enabled: !!jobId,
  });
}

export { importsApi };

export function useLeaves() {
  return useQuery({ queryKey: ['leaves'], queryFn: leaveApi.list });
}

export function useUpdateLeaveStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, rejectionReason }: { id: string; status: 'approved' | 'rejected'; rejectionReason?: string }) =>
      leaveApi.updateStatus(id, status, rejectionReason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leaves'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useHolidays(year?: number, month?: number) {
  return useQuery({
    queryKey: ['holidays', year, month],
    queryFn: () => holidaysApi.list(year, month),
  });
}

export function useCreateHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: holidaysApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['holidays'] }),
  });
}

export function useBulkUploadHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: holidaysApi.bulkUpload,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['holidays'] }),
  });
}

export function useDeleteHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: holidaysApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['holidays'] }),
  });
}

export function useLeaveBalance(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['leave-balance', employeeId],
    queryFn: () => leaveApi.getBalance(employeeId!),
    enabled: !!employeeId,
  });
}

export { employeesApi, epfApi, salaryApi, leaveApi };
