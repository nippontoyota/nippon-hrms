import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { CaretDown, MagnifyingGlass, X } from '@phosphor-icons/react';
import { useCreateEmployee, useEmployee, useEmployees, useUpdateEmployee } from '@/api/hooks';
import type { Employee, EmployeeInput } from '@/api/types';

interface ManagerSelectProps {
  managers: Employee[];
  value: string;
  onChange: (id: string) => void;
}

function ManagerSelect({ managers, value, onChange }: ManagerSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = managers.find(m => m.id === value);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return managers;
    return managers.filter(
      m =>
        m.name.toLowerCase().includes(q) ||
        m.employeeId.toLowerCase().includes(q),
    );
  }, [managers, query]);

  const select = (id: string) => {
    onChange(id);
    setOpen(false);
    setQuery('');
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className="input flex items-center justify-between gap-2 text-left"
        onClick={() => setOpen(o => !o)}
      >
        <span className={selected ? 'text-slate-900' : 'text-slate-400'}>
          {selected ? `${selected.name} (${selected.employeeId})` : '-- None --'}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          {selected && (
            <X
              size={14}
              className="text-slate-400 hover:text-slate-700"
              onClick={(e) => {
                e.stopPropagation();
                select('');
              }}
            />
          )}
          <CaretDown size={14} className="text-slate-400" />
        </span>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-slate-300 shadow-lg">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200">
            <MagnifyingGlass size={14} className="text-slate-400 shrink-0" />
            <input
              autoFocus
              className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              placeholder="Search by name or EMP ID…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <ul className="max-h-60 overflow-y-auto py-1">
            <li>
              <button
                type="button"
                className="w-full px-3 py-1.5 text-left text-sm text-slate-500 hover:bg-slate-100"
                onClick={() => select('')}
              >
                -- None --
              </button>
            </li>
            {filtered.map(m => (
              <li key={m.id}>
                <button
                  type="button"
                  className={`w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100 ${
                    m.id === value ? 'bg-slate-50 font-semibold text-[#eb0a1e]' : 'text-slate-900'
                  }`}
                  onClick={() => select(m.id)}
                >
                  {m.name} <span className="text-slate-400">({m.employeeId})</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-slate-400">No matches</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

const defaultValues: EmployeeInput = {
  employeeId: '',
  name: '',
  department: '',
  mobileNo: '',
  level: '',
  doj: '',
  birthday: '',
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

  const { register, handleSubmit, reset, setValue, watch, formState: { isSubmitting } } = useForm<EmployeeInput>({
    defaultValues,
  });

  useEffect(() => {
    register('managerId');
  }, [register]);

  const managerId = watch('managerId') ?? '';

  useEffect(() => {
    if (employee) {
      reset({
        employeeId: employee.employeeId,
        name: employee.name,
        department: employee.department,
        mobileNo: employee.mobileNo,
        level: employee.level,
        doj: employee.doj,
        birthday: employee.birthday ?? '',
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
              <label className="label">Date of Birth</label>
              <input type="date" className="input" {...register('birthday')} />
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
              <ManagerSelect
                managers={managers}
                value={managerId}
                onChange={(val) => setValue('managerId', val, { shouldDirty: true })}
              />
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
