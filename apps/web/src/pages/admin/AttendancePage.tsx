import { useState } from 'react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import FileUploadZone from '@/components/FileUploadZone';
import MonthYearSelect from '@/components/MonthYearSelect';
import ImportResultPanel from '@/components/ImportResultPanel';
import { attendanceApi, useAttendancePeriods } from '@/api/hooks';
import type { ImportResult } from '@/api/types';
import { monthLabel } from '@/lib/format';

export default function AttendancePage() {
  const { data: periods, isLoading } = useAttendancePeriods();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const qc = useQueryClient();

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const res = await attendanceApi.upload(file, month, year);
      setResult(res);
      toast.success(`Uploaded ${res.successCount} attendance records`);
      qc.invalidateQueries({ queryKey: ['attendance-periods'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-headline font-bold tracking-tighter text-on-surface uppercase">Attendance</h1>
        <p className="text-sm text-on-surface-variant mt-1">Upload monthly attendance summaries</p>
      </div>

      <div className="card space-y-4">
        <MonthYearSelect month={month} year={year} onMonthChange={setMonth} onYearChange={setYear} />
        <FileUploadZone
          label={uploading ? 'Uploading…' : 'Upload attendance Excel for selected period'}
          onFile={handleUpload}
        />
        {result && <ImportResultPanel result={result} onDismiss={() => setResult(null)} />}
      </div>

      <div className="card">
        <p className="text-[10px] font-label uppercase tracking-widest text-primary mb-4">Uploaded periods</p>
        {isLoading ? (
          <p className="text-on-surface-variant">Loading…</p>
        ) : (periods ?? []).length === 0 ? (
          <p className="text-sm text-on-surface-variant">No attendance data uploaded yet.</p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Records</th>
                  <th>Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {(periods ?? []).map((p) => (
                  <tr key={p.id}>
                    <td className="font-semibold">{monthLabel(p.year, p.month)}</td>
                    <td>{p.recordCount}</td>
                    <td>{new Date(p.uploadedAt).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
