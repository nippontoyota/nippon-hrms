const fs = require('fs');
let file = '/Users/shivasajay/Desktop/nippon-hrms/apps/maintenance/app/(dashboard)/tickets/[id]/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Remove the close ticket section from the sidebar
code = code.replace(
  '<section className="border border-slate-200 bg-white p-5 shadow-sm">{ticket.status === \'CLOSED\' ? <><h2 className="text-lg font-bold text-slate-950">Reopen ticket</h2><p className="mt-1 text-sm text-slate-700">Only an admin can reopen a closed ticket.</p><div className="mt-5"><ReopenTicketButton ticketId={ticket.id} canReopen={session.role === \'ADMIN\'} /></div></> : <><h2 className="text-lg font-bold text-slate-950">Close ticket</h2><p className="mt-1 text-sm text-slate-700">Close only when the work is complete. Closed tickets remain searchable.</p><div className="mt-5"><CloseTicketButton ticketId={ticket.id} /></div></>}</section>',
  ''
);

// 2. Insert the Close/Reopen button into the top header next to the status badge
const headerStart = '<div className="shrink-0"><span className={`border px-3 py-2 text-xs font-bold uppercase tracking-wide ${getStatusColor(status)}`}>{status}</span></div>';
const headerNew = '<div className="shrink-0 flex items-center gap-3"><span className={`border px-3 py-2 text-xs font-bold uppercase tracking-wide ${getStatusColor(status)}`}>{status}</span>{ticket.status === \'CLOSED\' ? <ReopenTicketButton ticketId={ticket.id} canReopen={session.role === \'ADMIN\'} /> : <CloseTicketButton ticketId={ticket.id} />}</div>';
code = code.replace(headerStart, headerNew);

fs.writeFileSync(file, code);

