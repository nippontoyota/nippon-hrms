import { useState } from 'react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { holidaysApi, useHolidays } from '@/api/hooks';

export default function HolidaysPage() {
  const { data: holidays, isLoading } = useHolidays();
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const qc = useQueryClient();

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !date) return;
    try {
      await holidaysApi.create({ name, date, description: description || undefined });
      toast.success('Holiday added');
      setName('');
      setDate('');
      setDescription('');
      qc.invalidateQueries({ queryKey: ['holidays'] });
      qc.invalidateQueries({ queryKey: ['audit'] });
    } catch {
      toast.error('Failed to add holiday');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this holiday?')) return;
    try {
      await holidaysApi.remove(id);
      toast.success('Holiday deleted');
      qc.invalidateQueries({ queryKey: ['holidays'] });
      qc.invalidateQueries({ queryKey: ['audit'] });
    } catch {
      toast.error('Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Holidays</h1>
          <p className="page-subtitle">Company holiday calendar shown in WhatsApp bot</p>
        </div>
      </div>

      <form onSubmit={handleAdd} className="card grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div>
          <label className="label">Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="label">Date</label>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div>
          <label className="label">Description</label>
          <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <button type="submit" className="btn-primary btn-sm">Add holiday</button>
      </form>

      <div className="card">
        {isLoading ? (
          <p className="text-on-surface-variant">Loading...</p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Name</th>
                  <th>Description</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(holidays ?? []).map((h) => (
                  <tr key={h.id}>
                    <td>{new Date(h.date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</td>
                    <td className="font-semibold">{h.name}</td>
                    <td>{h.description ?? '—'}</td>
                    <td>
                      <button type="button" className="text-error text-sm font-semibold" onClick={() => handleDelete(h.id)}>
                        Delete
                      </button>
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
