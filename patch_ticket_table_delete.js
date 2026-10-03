const fs = require('fs');
let file = '/Users/shivasajay/Desktop/nippon-hrms/apps/maintenance/components/tickets/ticket-table.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Add import for deleteTicket and Trash icon
if (!code.includes('Trash')) {
  code = code.replace(/UserRound } from 'lucide-react'/, 'UserRound, Trash2 } from \'lucide-react\'');
}
if (!code.includes('deleteTicket')) {
  code = code.replace(
    'import { normalizeMaintenanceBranchName } from \'@/lib/maintenance-branches\'',
    'import { normalizeMaintenanceBranchName } from \'@/lib/maintenance-branches\'\nimport { deleteTicket } from \'@/app/actions/maintenance\''
  );
}

// 2. Add isAdmin prop to TicketTable
code = code.replace(
  'export function TicketTable({ tickets, sort, direction, params }: { tickets: QueueTicket[]; sort: string; direction: string; params: string }) {',
  'export function TicketTable({ tickets, sort, direction, params, isAdmin }: { tickets: QueueTicket[]; sort: string; direction: string; params: string; isAdmin?: boolean }) {'
);

// 3. Add handle delete logic inside TicketTable
code = code.replace(
  'const openTicket = (ticketId: string) => router.push(`/tickets/${ticketId}`)',
  'const openTicket = (ticketId: string) => router.push(`/tickets/${ticketId}`)\n  const handleDelete = async (event: React.MouseEvent, ticketId: string) => {\n    event.stopPropagation();\n    if (window.confirm("Permanently delete this ticket and all its history?")) {\n      const result = await deleteTicket(ticketId);\n      if (!result.success) alert(result.error);\n    }\n  }'
);

// 4. Desktop Header: Add empty th at the end if isAdmin
const desktopHeaderEnd = '<th scope="col" className="px-4 py-3"><SortLink label="Status" sort="status" activeSort={sort} direction={direction} params={params} /></th></tr>';
code = code.replace(
  desktopHeaderEnd,
  '<th scope="col" className="px-4 py-3"><SortLink label="Status" sort="status" activeSort={sort} direction={direction} params={params} /></th>{isAdmin && <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>}</tr>'
);

// 5. Desktop Body: Add td with trash icon at the end if isAdmin
const desktopBodyEnd = '<td className="px-4 py-4"><span className={`inline-flex whitespace-nowrap border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${statusStyles[ticket.status] ?? \'border-slate-200 bg-slate-50 text-slate-700\'}`}>{statusLabel}</span></td></tr>';
code = code.replace(
  desktopBodyEnd,
  '<td className="px-4 py-4"><span className={`inline-flex whitespace-nowrap border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${statusStyles[ticket.status] ?? \'border-slate-200 bg-slate-50 text-slate-700\'}`}>{statusLabel}</span></td>{isAdmin && <td className="px-4 py-4 text-right"><button type="button" onClick={(e) => handleDelete(e, ticket.id)} className="text-slate-400 hover:text-red-600 focus:outline-none"><Trash2 className="h-4 w-4" /></button></td>}</tr>'
);

// 6. Mobile summary: add absolute delete button in the top right corner
const mobileSummaryEnd = '<div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600"><span className="flex items-start gap-1.5"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-600" />{ticket.location.name}</span><span className="flex items-start gap-1.5"><UserRound className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-600" />{ticket.reporter_name || \'Name not provided\'}</span><span className="flex items-start gap-1.5"><Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-600" />{ticket.source_phone || \'Phone not provided\'}</span><span className="font-semibold text-slate-700">{ticket.assigneeName ?? \'Unassigned\'}</span></div>';
// Actually, it's easier to add it to the wrapper in TicketTable.
// mobile wrapper: `<div key={ticket.id} {...rowProps(ticket)} className="cursor-pointer border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-500"><TicketSummary ticket={ticket} /></div>`
code = code.replace(
  '<div key={ticket.id} {...rowProps(ticket)} className="cursor-pointer border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-500"><TicketSummary ticket={ticket} /></div>',
  '<div key={ticket.id} {...rowProps(ticket)} className="relative cursor-pointer border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-500">{isAdmin && <button type="button" onClick={(e) => handleDelete(e, ticket.id)} className="absolute bottom-4 right-4 text-slate-400 hover:text-red-600 focus:outline-none"><Trash2 className="h-4 w-4" /></button>}<TicketSummary ticket={ticket} /></div>'
);

fs.writeFileSync(file, code);
