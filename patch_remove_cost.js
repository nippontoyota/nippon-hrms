const fs = require('fs');
let file = '/Users/shivasajay/Desktop/nippon-hrms/apps/maintenance/components/tickets/ticket-table.tsx';
let code = fs.readFileSync(file, 'utf8');

// Mobile summary: remove the totalCost span. Note the original has flex justify-between, maybe keep it left aligned or keep it block.
const mobileCostMatch = '<span className="font-bold tabular-nums text-slate-900">{ticket.totalCost === null ? \'Not recorded\' : formatInr(ticket.totalCost)}</span>';
code = code.replace(mobileCostMatch, '');

// Desktop Header:
const desktopHeaderMatch = '<th scope="col" className="px-4 py-3 text-right">Cost</th>';
code = code.replace(desktopHeaderMatch, '');

// Desktop Body row:
const desktopBodyMatch = '<td className="px-4 py-4 text-right text-sm"><span className="block whitespace-nowrap font-semibold tabular-nums text-slate-900">{ticket.totalCost === null ? \'Not recorded\' : formatInr(ticket.totalCost)}</span></td>';
code = code.replace(desktopBodyMatch, '');

fs.writeFileSync(file, code);
