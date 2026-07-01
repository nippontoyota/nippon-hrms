import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useCreateEmployee, useEmployee, useEmployees, useUpdateEmployee } from '@/api/hooks';
import type { EmployeeInput } from '@/api/types';

const defaultValues: EmployeeInput = {
  employeeId: '',
  name: '',
  department: '',
  mobileNo: '',
  level: '',
  doj: '',
  branch: '',
  designation: '',
  status: 'Active',
  managerId: '',
};

export default function EmployeeFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { data: employee, isLoading } = useEmployee(id);
  const { data: managerOptions } = useEmployees({ limit: 200 });
  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee(id ?? '');

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<EmployeeInput>({
    defaultValues,
  });

  useEffect(() => {
    if (employee) {
      reset({
        employeeId: employee.employeeId,
        name: employee.name,
        department: employee.department,
        mobileNo: employee.mobileNo,
        level: employee.level,
        doj: employee.doj,
        branch: employee.branch,
        designation: employee.designation,
        status: employee.status,
        managerId: employee.managerId ?? '',
      });
    }
  }, [employee, reset]);

  const onSubmit = async (data: EmployeeInput) => {
    try {
      if (isEdit) {
        await updateMutation.mutateAsync(data);
        toast.success('Employee updated');
      } else {
        await createMutation.mutateAsync(data);
        toast.success('Employee created');
      }
      navigate('/admin/employees');
    } catch {
      toast.error('Save failed');
    }
  };

  if (isEdit && isLoading) return <p className="text-on-surface-variant">Loading…</p>;

  const managers = (managerOptions?.items ?? []).filter(e => e.id !== id);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-headline font-bold tracking-tighter text-on-surface uppercase">
          {isEdit ? 'Edit Employee' : 'Add Employee'}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-6">
        <div>
          <p className="text-[10px] font-label uppercase tracking-widest text-primary mb-3">Identity</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">EMP ID</label>
              <input className="input" {...register('employeeId', { required: true })} disabled={isEdit} />
            </div>
            <div>
              <label className="label">Full name</label>
              <input className="input" {...register('name', { required: true })} />
            </div>
            <div>
              <label className="label">Department</label>
              <input className="input" {...register('department', { required: true })} />
            </div>
            <div>
              <label className="label">Branch</label>
              <input className="input" {...register('branch', { required: true })} />
            </div>
            <div>
              <label className="label">Designation</label>
              <input className="input" {...register('designation', { required: true })} />
            </div>
            <div>
              <label className="label">Level</label>
              <input className="input" {...register('level')} />
            </div>
            <div>
              <label className="label">DOJ</label>
              <input type="date" className="input" {...register('doj', { required: true })} />
            </div>
            <div>
              <label className="label">Mobile Number</label>
              <input className="input" {...register('mobileNo', { required: true })} />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" {...register('status')}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <p className="text-[10px] font-label uppercase tracking-widest text-primary mb-3">Reporting Manager</p>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="label">Select Manager</label>
              <select className="input" {...register('managerId')}>
                <option value="">-- None --</option>
                {managers.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.employeeId})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {isEdit && employee?.ctcStructure && (
          <div>
            <p className="text-[10px] font-label uppercase tracking-widest text-primary mb-3">CTC Structure (from upload)</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              {Object.entries(employee.ctcStructure).map(([k, v]) => (
                <div key={k} className="bg-surface-container rounded-lg p-2">
                  <p className="text-[10px] text-on-surface-variant uppercase">{k}</p>
                  <p className="font-semibold">{v ?? '—'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate('/admin/employees')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
