import { useState } from 'react';
import toast from 'react-hot-toast';
import BulkUploadWizard from '@/components/BulkUploadWizard';
import { salaryApi } from '@/api/endpoints';

export default function SalaryPage() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [dispatching, setDispatching] = useState(false);

  const handleDispatch = async () => {
    setDispatching(true);
    try {
      await salaryApi.dispatch(month, year);
      toast.success('Dispatch job started in the background');
    } catch {
      toast.error('Failed to start dispatch');
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold tracking-tighter text-on-surface uppercase">Payroll</h1>
          <p className="text-sm text-on-surface-variant mt-1">Upload salary data and dispatch payslips</p>
        </div>
      </div>

      <BulkUploadWizard
        title="Upload salary Excel"
        showMonthYear
        month={month}
        year={year}
        onMonthChange={setMonth}
        onYearChange={setYear}
        onCommit={(file) => salaryApi.commitBulkUpload(file, month, year)}
      />

      <div className="card space-y-4">
        <p className="font-headline font-bold uppercase text-sm tracking-tight text-on-surface">Dispatch Payslips</p>
        <p className="text-sm text-on-surface-variant">
          Generate PDF payslips and dispatch them to all employees via WhatsApp for {month}/{year}.
        </p>
        <button
          type="button"
          className="btn-primary"
          onClick={handleDispatch}
          disabled={dispatching}
        >
          {dispatching ? 'Dispatching…' : 'Trigger Dispatch'}
        </button>
      </div>
    </div>
  );
}
