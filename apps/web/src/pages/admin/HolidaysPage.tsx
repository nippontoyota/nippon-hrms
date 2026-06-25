import { useState } from 'react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import FileUploadZone from '@/components/FileUploadZone';
import { holidaysApi, useHolidays } from '@/api/hooks';

export default function HolidaysPage() {
  const { data: holidays, isLoading } = useHolidays();
  const [year, setYear] = useState(new Date().getFullYear());
  const [uploading, setUploading] = useState(false);
  const qc = useQueryClient();

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      await holidaysApi.upload(file, year);
      toast.success(`Holiday calendar for ${year} uploaded`);
      qc.invalidateQueries({ queryKey: ['holidays'] });
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-headline font-bold tracking-tighter text-on-surface uppercase">Holidays</h1>
        <p className="text-sm text-on-surface-variant mt-1">Upload org-wide holiday calendar file per year</p>
      </div>

      <div className="card space-y-4 max-w-lg">
        <div>
          <label className="label">Calendar year</label>
          <select className="input" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <FileUploadZone
          accept=".pdf,.png,.jpg,.jpeg"
          label={uploading ? 'Uploading…' : `Upload PDF or image for ${year}`}
          onFile={handleUpload}
        />
      </div>

      <div className="card">
        {isLoading ? (
          <p className="text-on-surface-variant">Loading…</p>
        ) : (holidays ?? []).length === 0 ? (
          <p className="text-sm text-on-surface-variant">No holiday calendars uploaded yet.</p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th>File</th>
                  <th>Uploaded</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(holidays ?? []).map((h) => (
                  <tr key={h.id}>
                    <td className="font-semibold">{h.year}</td>
                    <td>{h.fileName}</td>
                    <td>{new Date(h.uploadedAt).toLocaleString('en-IN')}</td>
                    <td>
                      <a href={h.fileUrl} className="text-primary text-sm font-semibold" download={h.fileName}>
                        Download
                      </a>
                    </td>
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
