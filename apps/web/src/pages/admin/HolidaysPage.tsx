import { useState } from 'react';
import toast from 'react-hot-toast';
import { holidaysApi } from '@/api/endpoints';

export default function HolidaysPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    try {
      const result = await holidaysApi.upload(file);
      if (result.errors && result.errors.length > 0) {
        toast.error(`Uploaded with ${result.errors.length} errors`);
      } else {
        toast.success(`Successfully uploaded ${result.successCount} holidays!`);
      }
      setFile(null);
    } catch {
      toast.error('Upload failed. Ensure you are using the correct Excel format.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-headline font-bold tracking-tighter text-on-surface uppercase">Holidays</h1>
        <p className="text-sm text-on-surface-variant mt-1">Upload org-wide holiday calendar Excel file.</p>
      </div>

      <div className="card space-y-4">
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="label">Upload Excel (.xlsx, .xls)</label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="input mt-1"
              required
            />
          </div>

          <button
            type="submit"
            disabled={!file || uploading}
            className="btn-primary"
          >
            {uploading ? 'Processing...' : 'Upload Holidays'}
          </button>
        </form>
      </div>
    </div>
  );
}
