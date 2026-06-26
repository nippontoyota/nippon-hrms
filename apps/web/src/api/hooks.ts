import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  dashboardApi,
  employeesApi,
  holidaysApi,
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

export { employeesApi, salaryApi, holidaysApi };
