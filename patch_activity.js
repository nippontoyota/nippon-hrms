const fs = require('fs');
let file = '/Users/shivasajay/Desktop/nippon-hrms/apps/maintenance/app/(dashboard)/tickets/[id]/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Extract the Activity section
const activityStart = '<section className="border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-slate-950">Activity</h2>';
const activityIndex = code.indexOf(activityStart);
const asideEndIndex = code.indexOf('</aside>', activityIndex);
const activitySection = code.substring(activityIndex, asideEndIndex); // Everything from Activity to the end of the aside

// We need to carefully remove it from the aside
code = code.replace(activitySection, '');

// 2. Insert it at the end of the left column
const leftColumnEnd = '<div className="mt-5 min-w-0"><TotalCostForm ticketId={ticket.id} initialAmount={total.toString()} disabled={ticket.status === \'CLOSED\'} /></div>\n    </div>';
const newLeftColumnEnd = '<div className="mt-5 min-w-0"><TotalCostForm ticketId={ticket.id} initialAmount={total.toString()} disabled={ticket.status === \'CLOSED\'} /></div>\n      ' + activitySection + '\n    </div>';

code = code.replace(leftColumnEnd, newLeftColumnEnd);

fs.writeFileSync(file, code);
