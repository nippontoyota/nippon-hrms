import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  attendanceApi,
  dashboardApi,
  employeesApi,
  holidaysApi,
  logsApi,
  salaryApi,
} from './endpoints';
import type { EmployeeInput } from './types';

export function useDashboard() {
  return useQuery({ queryKey: ['dashboard'], queryFn: dashboardApi.get });
}

export function useEmployees() {
  return useQuery({ queryKey: ['employees'], queryFn: employeesApi.list });
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
    mutationFn: (data: EmployeeInput) => employeesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      qc.invalidateQueries({ queryKey: ['employees', id] });
    },
  });
}

export function useSalaryPeriods() {
  return useQuery({ queryKey: ['salary-periods'], queryFn: salaryApi.listPeriods });
}

export function useSalaryPeriod(id: string | undefined) {
  return useQuery({
    queryKey: ['salary-periods', id],
    queryFn: () => salaryApi.getPeriod(id!),
    enabled: !!id,
  });
}

export function useSalaryRecords(periodId: string | undefined) {
  return useQuery({
    queryKey: ['salary-records', periodId],
    queryFn: () => salaryApi.getRecords(periodId!),
    enabled: !!periodId,
  });
}

export function useDispatchJob(jobId: string | undefined) {
  return useQuery({
    queryKey: ['dispatch-jobs', jobId],
    queryFn: () => salaryApi.getDispatchJob(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'COMPLETED' || status === 'FAILED' ? false : 3000;
    },
  });
}

export function useAttendancePeriods() {
  return useQuery({ queryKey: ['attendance-periods'], queryFn: attendanceApi.listPeriods });
}

export function useHolidays() {
  return useQuery({ queryKey: ['holidays'], queryFn: holidaysApi.list });
}

export function useDispatchLogs(params?: { month?: number; year?: number; status?: string }) {
  return useQuery({
    queryKey: ['logs', 'dispatch', params],
    queryFn: () => logsApi.dispatch(params),
  });
}

export function useLeaveLogs() {
  return useQuery({ queryKey: ['logs', 'leave'], queryFn: logsApi.leave });
}

export function useFeedbackLogs() {
  return useQuery({ queryKey: ['logs', 'feedback'], queryFn: logsApi.feedback });
}

export { employeesApi, salaryApi, holidaysApi, attendanceApi, logsApi };
