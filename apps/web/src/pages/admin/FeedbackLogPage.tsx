import LogTable from '@/components/LogTable';
import { useFeedbackLogs } from '@/api/hooks';
import type { FeedbackResponse } from '@/api/types';

export default function FeedbackLogPage() {
  const { data: logs, isLoading } = useFeedbackLogs();

  const columns = [
    { key: 'employeeId', label: 'EMP ID' },
    { key: 'employeeName', label: 'Employee' },
    {
      key: 'rating',
      label: 'Rating',
      render: (row: FeedbackResponse) => `${row.rating} / 5`,
    },
    { key: 'comment', label: 'Comment' },
    {
      key: 'submittedAt',
      label: 'Submitted',
      render: (row: FeedbackResponse) => new Date(row.submittedAt).toLocaleString('en-IN'),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-headline font-bold tracking-tighter text-on-surface uppercase">Feedback</h1>
        <p className="text-sm text-on-surface-variant mt-1">Employee feedback collected via WhatsApp</p>
      </div>

      {isLoading ? (
        <p className="text-on-surface-variant">Loading…</p>
      ) : (
        <LogTable
          data={(logs ?? []) as unknown as Record<string, unknown>[]}
          columns={columns as never}
          searchKeys={['employeeId', 'employeeName']}
          exportFilename="feedback.csv"
        />
      )}
    </div>
  );
}
