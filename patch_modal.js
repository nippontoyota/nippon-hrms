const fs = require('fs');
let file = '/Users/shivasajay/Desktop/nippon-hrms/apps/maintenance/components/tickets/ticket-controls.tsx';
let code = fs.readFileSync(file, 'utf8');

// Replace CloseTicketButton
const closeRegex = /export function CloseTicketButton[\s\S]*?(?=export function ReopenTicketButton)/;
const newClose = `export function CloseTicketButton({ ticketId, disabled }: { ticketId: string; disabled?: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  const close = () => {
    setShowConfirm(false);
    startTransition(async () => {
      try {
        const result = await closeTicket({ ticketId });
        if (!result.success) setError(result.error);
        else router.refresh();
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Unable to close the ticket.');
      }
    });
  };

  return (
    <>
      <div className="space-y-2">
        <button type="button" disabled={disabled || isPending} onClick={() => setShowConfirm(true)} className="h-9 shrink-0 bg-green-600 px-4 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50">
          {isPending ? 'Closing…' : disabled ? 'Ticket closed' : 'Close ticket'}
        </button>
        {error && <p role="alert" className="text-xs font-semibold text-red-700">{error}</p>}
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-900">Close this ticket?</h3>
            <p className="mt-2 text-sm text-slate-600">You can still view it later, but new costs and assignment changes will be locked.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button disabled={isPending} onClick={() => setShowConfirm(false)} className="rounded-md px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100">Cancel</button>
              <button disabled={isPending} onClick={close} className="rounded-md bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700">Yes, close ticket</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

`;
code = code.replace(closeRegex, newClose);

// Replace ReopenTicketButton
const reopenRegex = /export function ReopenTicketButton[\s\S]*?}(?=\s*$)/;
const newReopen = `export function ReopenTicketButton({ ticketId, canReopen }: { ticketId: string; canReopen: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  const reopen = () => {
    setShowConfirm(false);
    startTransition(async () => {
      try {
        const result = await reopenTicket({ ticketId });
        if (!result.success) setError(result.error);
        else router.refresh();
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Unable to reopen the ticket.');
      }
    });
  };

  if (!canReopen) return null;

  return (
    <>
      <div className="space-y-2">
        <button type="button" disabled={isPending} onClick={() => setShowConfirm(true)} className="h-9 shrink-0 border border-slate-300 bg-white px-4 text-xs font-bold uppercase tracking-wider text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
          {isPending ? 'Reopening…' : 'Reopen ticket'}
        </button>
        {error && <p role="alert" className="text-xs font-semibold text-red-700">{error}</p>}
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-900">Reopen this ticket?</h3>
            <p className="mt-2 text-sm text-slate-600">It will move back into the open queue and allow new changes.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button disabled={isPending} onClick={() => setShowConfirm(false)} className="rounded-md px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100">Cancel</button>
              <button disabled={isPending} onClick={reopen} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-900 hover:bg-slate-50">Yes, reopen</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}`;
code = code.replace(reopenRegex, newReopen);

fs.writeFileSync(file, code);
