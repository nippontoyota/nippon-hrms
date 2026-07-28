import { useState } from 'react';
import toast from 'react-hot-toast';
import { WarningCircle, CheckCircle, Trash, X } from '@phosphor-icons/react';
import FileUploadZone from './FileUploadZone';
import { employeesApi } from '@/api/endpoints';
import type { Employee } from '@/api/types';

type Step = 'upload' | 'preview' | 'done';

interface BulkDeleteWizardProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

export default function BulkDeleteWizard({ onComplete, onCancel }: BulkDeleteWizardProps) {
  const [step, setStep] = useState<Step>('upload');
  const [loading, setLoading] = useState(false);
  const [matched, setMatched] = useState<Employee[]>([]);
  const [unmatched, setUnmatched] = useState<string[]>([]);

  const handleFileUpload = async (file: File) => {
    setLoading(true);
    try {
      const res = await employeesApi.previewBulkDelete(file);
      setMatched(res.matched || []);
      setUnmatched(res.unmatched || []);
      setStep('preview');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to parse file for deletion.');
      setStep('upload');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (matched.length === 0) return;
    setLoading(true);
    try {
      const ids = matched.map((m) => m.id);
      await employeesApi.bulkDelete({ ids });
      toast.success(`Successfully deleted ${matched.length} employees`);
      setStep('done');
      onComplete?.();
    } catch (err: any) {
      toast.error('Failed to bulk delete employees.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg max-w-3xl w-full mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">Bulk Delete via Excel</h2>
        {onCancel && (
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {step === 'upload' && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-600">
            Upload an Excel or CSV file containing an <strong>Employee ID</strong> (or Emp ID) column.
            The system will find all matching employees and ask for your confirmation before deleting them.
          </p>
          <div className="mt-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-8 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
                <p className="text-sm text-slate-600">Analyzing file...</p>
              </div>
            ) : (
              <FileUploadZone onFile={handleFileUpload} accept=".csv,.xlsx" />
            )}
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="flex flex-col gap-6">
          <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
            <div className="flex items-start gap-3">
              <WarningCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-amber-800">
                  Review Deletion Preview
                </h3>
                <p className="text-sm text-amber-700 mt-1">
                  We found <strong>{matched.length}</strong> matching employees based on the uploaded file.
                  {unmatched.length > 0 && ` However, ${unmatched.length} IDs could not be found.`}
                </p>
              </div>
            </div>
          </div>

          {unmatched.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-slate-700 mb-2">Unmatched IDs (Not Found)</h4>
              <div className="bg-slate-50 border border-slate-200 rounded-md p-3 max-h-32 overflow-y-auto">
                <p className="text-xs text-slate-600 flex flex-wrap gap-2">
                  {unmatched.map((id) => (
                    <span key={id} className="bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">{id}</span>
                  ))}
                </p>
              </div>
            </div>
          )}

          <div>
            <h4 className="text-sm font-medium text-slate-700 mb-2">Matched Employees (Will Be Deleted)</h4>
            <div className="border border-slate-200 rounded-md overflow-hidden max-h-64 overflow-y-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Emp ID</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Department</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {matched.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-sm text-slate-500">
                        No matches found.
                      </td>
                    </tr>
                  ) : (
                    matched.map((emp) => (
                      <tr key={emp.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 text-sm text-slate-900">{emp.employeeId}</td>
                        <td className="px-4 py-2 text-sm font-medium text-slate-900">{emp.name}</td>
                        <td className="px-4 py-2 text-sm text-slate-500">{emp.department || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => setStep('upload')}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50"
            >
              Upload Different File
            </button>
            <button
              onClick={confirmDelete}
              disabled={loading || matched.length === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Trash className="w-4 h-4" weight="bold" />
              )}
              Confirm Deletion of {matched.length} Employees
            </button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="flex flex-col items-center justify-center p-8 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
          <h3 className="text-lg font-medium text-green-900">Deletion Successful</h3>
          <p className="text-sm text-green-700 mt-1 text-center">
            Successfully deleted {matched.length} employees from the system.
          </p>
          <div className="mt-6">
            <button
              onClick={() => onComplete?.()}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
            >
              Return to Directory
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
