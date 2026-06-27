import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  dashboardApi,
  employeesApi,
  epfApi,
  salaryApi,
} from './endpoints';
import type { Employee } from './types';

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

export function useEpfRecords() {
  return useQuery({
    queryKey: ['epf'],
    queryFn: epfApi.list,
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

export function useDeletePayroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => salaryApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll'] });
    },
  });
}

export function usePayrollRecords(month: number, year: number) {
  return useQuery({
    queryKey: ['payroll', month, year],
    queryFn: () => salaryApi.list(month, year),
  });
}

export { employeesApi, epfApi, salaryApi };
