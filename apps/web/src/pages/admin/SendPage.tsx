import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { payslipsApi, usePayslipPeriods } from '@/api/hooks';

function monthLabel(year: number, month: number) {
  return new Date(year, month - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
}

export default function SendPage() {
  const { data: periods, isLoading } = usePayslipPeriods();
  const [selectedId, setSelectedId] = useState('');
  const [sending, setSending] = useState(false);
  const navigate = useNavigate();

  const finalized = (periods ?? []).filter((p) => p.status === 'FINALIZED' || p.status === 'SENT');

  const handleSend = async () => {
    if (!selectedId) {
      toast.error('Select a period');
      return;
    }
    setSending(true);
    try {
      const { jobId } = await payslipsApi.startSend(selectedId);
      toast.success('Bulk send started');
      navigate(`/admin/send/jobs/${jobId}`);
    } catch {
      toast.error('Failed to start send job');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">Bulk send</h1>
          <p className="page-subtitle">Send finalized payslips to employees via WhatsApp</p>
        </div>
      </div>

      <div className="card space-y-4">
        {isLoading ? (
          <p className="text-on-surface-variant">Loading periods...</p>
        ) : finalized.length === 0 ? (
          <p className="text-on-surface-variant">No finalized periods available. Finalize a period first.</p>
        ) : (
          <>
            <div>
              <label className="label">Select pay period</label>
              <select
                className="input"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                <option value="">Choose period...</option>
                {finalized.map((p) => (
                  <option key={p.id} value={p.id}>
                    {monthLabel(p.year, p.month)} ({p.status}) — {p.recordCount} employees
                  </option>
                ))}
              </select>
            </div>
            <button type="button" className="btn-primary" onClick={handleSend} disabled={sending || !selectedId}>
              {sending ? 'Starting...' : 'Start bulk send'}
            </button>
            <p className="text-xs text-on-surface-variant">
              Payslips are generated in memory and sent at ~5 per second. You can track progress on the job page.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
