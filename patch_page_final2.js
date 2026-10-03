const fs = require('fs');
let file = '/Users/shivasajay/Desktop/nippon-hrms/apps/maintenance/app/(dashboard)/tickets/[id]/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Revert Assign card to white
code = code.replace(
  '<section className="border border-yellow-200 bg-yellow-50 p-5 shadow-sm"><h2 className="text-lg font-bold text-slate-950">Assign</h2>',
  '<section className="border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-slate-950">Assign</h2>'
);

// 2. Move TotalCostForm to the right column below Assign
const costFormHtml = '<div className="mt-5 min-w-0"><TotalCostForm ticketId={ticket.id} initialAmount={total.toString()} disabled={ticket.status === \'CLOSED\'} /></div>';

// Remove it from the center column
code = code.replace(costFormHtml + '\n      </div>', '      </div>');

// Add it to the right column
const assignAsideEnd = '</section>\n      </aside>';
code = code.replace(
  assignAsideEnd,
  '</section>\n        ' + costFormHtml + '\n      </aside>'
);

fs.writeFileSync(file, code);
