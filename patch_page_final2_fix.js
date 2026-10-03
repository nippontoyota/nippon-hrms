const fs = require('fs');
let file = '/Users/shivasajay/Desktop/nippon-hrms/apps/maintenance/app/(dashboard)/tickets/[id]/page.tsx';
let code = fs.readFileSync(file, 'utf8');

const mainStart = code.indexOf('<main');
const mainEnd = code.indexOf('</main>') + '</main>'.length;
const mainBlock = code.substring(mainStart, mainEnd);

const newMainBlock = `<main className="mx-auto grid min-w-0 max-w-7xl gap-5 px-5 py-5 xl:grid-cols-[300px_minmax(0,1fr)_300px] lg:grid-cols-[250px_minmax(0,1fr)_250px] sm:px-8">
      <aside className="min-w-0 space-y-5">
        <section className="border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-slate-950">Activity</h2><div className="mt-5 space-y-4">{ticket.activities.length === 0 && ticket.status_history.length === 0 && <p className="text-sm text-slate-700">No activity recorded yet.</p>}{[...ticket.activities.map((item) => ({ id: item.id, date: item.created_at, title: item.detail, actor: item.actor })), ...ticket.status_history.map((item) => ({ id: item.id, date: item.created_at, title: \`Status: \${item.status.replaceAll('_', ' ')}\`, actor: item.notes || 'System' }))].sort((a, b) => b.date.getTime() - a.date.getTime()).map((item) => {
          const isCuid = item.actor?.length === 25 && item.actor?.startsWith('c');
          const displayActor = isCuid ? 'Staff Member' : (item.actor || 'System');
          return <div key={item.id} className="border-l-2 border-red-200 pl-3"><p className="break-words text-sm font-semibold text-slate-800">{item.title}</p><p className="mt-1 break-words text-xs text-slate-700">{format(item.date, 'dd MMM, h:mm a')} · {displayActor}</p></div>
        })}</div></section>
      </aside>

      <div className="min-w-0 space-y-5">
        <section className="relative min-w-0 border-[3px] border-dashed border-red-400 bg-[#fff5f5] p-5 shadow-sm sm:p-8 rounded-2xl">
        <div className="absolute top-[45%] -left-5 h-8 w-8 -translate-y-1/2 rounded-full bg-[#f4f6fa] shadow-[inset_-3px_0_0_rgba(248,113,113,0.5)] border-r border-red-200"></div>
        <div className="absolute top-[45%] -right-5 h-8 w-8 -translate-y-1/2 rounded-full bg-[#f4f6fa] shadow-[inset_3px_0_0_rgba(248,113,113,0.5)] border-l border-red-200"></div>
<div className="flex min-w-0 items-start justify-between gap-4"><div className="min-w-0"><h2 className="text-lg font-bold text-slate-950">Ticket</h2><p className="mt-1 text-sm text-slate-700">Everything submitted through WhatsApp stays attached to this ticket.</p></div></div><hr className="my-6 border-[1.5px] border-dashed border-red-200" /><div className="grid min-w-0 gap-3 sm:grid-cols-2"><div className="min-w-0 border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-700">Reporter</p><p className="mt-2 flex min-w-0 items-center gap-2 break-words text-sm font-bold text-slate-900"><UserRound className="h-4 w-4 shrink-0 text-slate-600" />{ticket.reporter_name || 'Name not provided'}</p><p className="mt-1 flex min-w-0 items-center gap-2 break-words text-sm text-slate-600"><Phone className="h-3.5 w-3.5 shrink-0 text-slate-600" />{ticket.source_phone || 'Phone not provided'}</p></div><div className="min-w-0 border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-700">Location</p><p className="mt-2 flex min-w-0 items-center gap-2 break-words text-sm font-bold text-slate-900"><MapPin className="h-4 w-4 shrink-0 text-slate-600" />{ticket.location.name}</p><p className="mt-1 text-sm text-slate-600">{ticket.category.name}</p></div></div><div className="mt-5 min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-700">Description</p><p className="mt-2 break-words whitespace-pre-wrap border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-800 shadow-sm">{ticket.description}</p></div></section>
      </div>

      <aside className="min-w-0 space-y-5">
        <section className="border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-slate-950">Assign</h2><p className="mt-1 text-sm text-slate-700">Search and assign an employee.</p><div className="mt-5"><EmployeeAssignment ticketId={ticket.id} currentAssignee={ticket.assignee ? { id: ticket.assignee.normalized_name, name: ticket.assignee.name } : null} disabled={ticket.status === 'CLOSED'} /></div></section>
        
        <div className="min-w-0"><TotalCostForm ticketId={ticket.id} initialAmount={total.toString()} disabled={ticket.status === 'CLOSED'} /></div>
      </aside>
    </main>`;

code = code.replace(mainBlock, newMainBlock);
fs.writeFileSync(file, code);
