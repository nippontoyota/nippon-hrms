const fs = require('fs');
let file = '/Users/shivasajay/Desktop/nippon-hrms/apps/maintenance/components/tickets/ticket-table.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Update TicketSummary signature
code = code.replace(
  'function TicketSummary({ ticket }: { ticket: QueueTicket }) {',
  'function TicketSummary({ ticket, isAdmin, onDelete }: { ticket: QueueTicket, isAdmin?: boolean, onDelete?: (e: React.MouseEvent, id: string) => void }) {'
);

// 2. Put delete button next to status label in TicketSummary
const statusHtml = '<span className={`inline-flex whitespace-nowrap border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${statusStyles[ticket.status] ?? \'border-slate-200 bg-slate-50 text-slate-700\'}`}>{statusLabel}</span>';
const newStatusHtml = '<div className="flex items-center gap-2">' + statusHtml + '{isAdmin && onDelete && <button type="button" onClick={(e) => onDelete(e, ticket.id)} className="text-slate-400 hover:text-red-600 focus:outline-none"><Trash2 className="h-4 w-4" /></button>}</div>';

code = code.replace(statusHtml, newStatusHtml);

// 3. Update the mobile loop to use the new props and remove the absolute button
const oldMobileDiv = '<div key={ticket.id} {...rowProps(ticket)} className="relative cursor-pointer border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-500">{isAdmin && <button type="button" onClick={(e) => handleDelete(e, ticket.id)} className="absolute bottom-4 right-4 text-slate-400 hover:text-red-600 focus:outline-none"><Trash2 className="h-4 w-4" /></button>}<TicketSummary ticket={ticket} /></div>';
const newMobileDiv = '<div key={ticket.id} {...rowProps(ticket)} className="relative cursor-pointer border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-500"><TicketSummary ticket={ticket} isAdmin={isAdmin} onDelete={handleDelete} /></div>';

code = code.replace(oldMobileDiv, newMobileDiv);

fs.writeFileSync(file, code);
