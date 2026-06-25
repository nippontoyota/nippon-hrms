import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useCreateEmployee, useEmployee, useUpdateEmployee } from '@/api/hooks';
import type { EmployeeInput } from '@/api/types';

const defaultValues: EmployeeInput = {
  employeeCode: '',
  name: '',
  department: '',
  designation: '',
  whatsappPhone: '',
  bankAccount: '',
  bankIfsc: '',
  active: true,
};

export default function EmployeeFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { data: employee, isLoading } = useEmployee(id);
  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee(id ?? '');

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<EmployeeInput>({
    defaultValues,
  });

  useEffect(() => {
    if (employee) {
      reset({
        employeeCode: employee.employeeCode,
        name: employee.name,
        department: employee.department,
        designation: employee.designation,
        whatsappPhone: employee.whatsappPhone,
        bankAccount: employee.bankAccount ?? '',
        bankIfsc: employee.bankIfsc ?? '',
        active: employee.active,
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

  if (isEdit && isLoading) return <p className="text-on-surface-variant">Loading...</p>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">{isEdit ? 'Edit employee' : 'Add employee'}</h1>
          <p className="page-subtitle">Employee master data for payslip and WhatsApp delivery</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Employee code</label>
            <input className="input" {...register('employeeCode', { required: true })} />
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
            <label className="label">Designation</label>
            <input className="input" {...register('designation', { required: true })} />
          </div>
          <div className="md:col-span-2">
            <label className="label">WhatsApp phone (E.164)</label>
            <input className="input" placeholder="+919876543210" {...register('whatsappPhone', { required: true })} />
          </div>
          <div>
            <label className="label">Bank account</label>
            <input className="input" {...register('bankAccount')} />
          </div>
          <div>
            <label className="label">IFSC</label>
            <input className="input" {...register('bankIfsc')} />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm font-body">
          <input type="checkbox" className="rounded" {...register('active')} />
          Active employee
        </label>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isEdit ? 'Save changes' : 'Create employee'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate('/admin/employees')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
