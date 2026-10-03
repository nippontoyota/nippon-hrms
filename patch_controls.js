const fs = require('fs');
let file = '/Users/shivasajay/Desktop/nippon-hrms/apps/maintenance/components/tickets/ticket-controls.tsx';
let code = fs.readFileSync(file, 'utf8');

// Change CloseTicketButton
const oldClose = 'className="h-11 w-full bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45"';
const newClose = 'className="h-9 shrink-0 bg-green-600 px-4 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"';
code = code.replace(oldClose, newClose);

// Change ReopenTicketButton
const oldReopen = 'className="h-11 w-full border-2 border-slate-950 bg-white px-4 text-sm font-bold text-slate-950 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-45"';
const newReopen = 'className="h-9 shrink-0 border border-slate-300 bg-white px-4 text-xs font-bold uppercase tracking-wider text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"';
code = code.replace(oldReopen, newReopen);

// In ReopenTicketButton, remove the paragraph "Contact your admin to reopen this ticket."
code = code.replace('if (!canReopen) return <p className="text-sm text-slate-700">Contact your admin to reopen this ticket.</p>', 'if (!canReopen) return null');

fs.writeFileSync(file, code);
