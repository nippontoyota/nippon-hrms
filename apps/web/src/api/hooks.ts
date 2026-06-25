import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  auditApi,
  dashboardApi,
  employeesApi,
  holidaysApi,
  payslipsApi,
  sendJobsApi,
  ticketsApi,
} from './endpoints';
import type { EmployeeInput, TicketStatus } from './types';

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
      qc.invalidateQueries({ queryKey: ['audit'] });
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
      qc.invalidateQueries({ queryKey: ['audit'] });
    },
  });
}

export function usePayslipPeriods() {
  return useQuery({ queryKey: ['payslip-periods'], queryFn: payslipsApi.listPeriods });
}

export function usePayslipPeriod(id: string | undefined) {
  return useQuery({
    queryKey: ['payslip-periods', id],
    queryFn: () => payslipsApi.getPeriod(id!),
    enabled: !!id,
  });
}

export function usePayslipRecords(periodId: string | undefined) {
  return useQuery({
    queryKey: ['payslip-records', periodId],
    queryFn: () => payslipsApi.getRecords(periodId!),
    enabled: !!periodId,
  });
}

export function useSendJob(jobId: string | undefined) {
  return useQuery({
    queryKey: ['send-jobs', jobId],
    queryFn: () => sendJobsApi.get(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'COMPLETED' || status === 'FAILED' ? false : 3000;
    },
  });
}

export function useHolidays() {
  return useQuery({ queryKey: ['holidays'], queryFn: holidaysApi.list });
}

export function useTickets() {
  return useQuery({ queryKey: ['tickets'], queryFn: ticketsApi.list });
}

export function useAudit() {
  return useQuery({ queryKey: ['audit'], queryFn: auditApi.list });
}

export function useUpdateTicketStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TicketStatus }) =>
      ticketsApi.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tickets'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['audit'] });
    },
  });
}

export { payslipsApi, employeesApi, sendJobsApi, holidaysApi };
