const fs = require('fs');
let file = '/Users/shivasajay/Desktop/nippon-hrms/apps/maintenance/app/(dashboard)/tickets/[id]/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Remove the clock icon and change the section style
const oldSectionStart = '<section className="min-w-0 border border-slate-200 bg-slate-100 p-5 shadow-sm sm:p-6"><div className="flex min-w-0 items-start justify-between gap-4"><div className="min-w-0"><h2 className="text-lg font-bold text-slate-950">Issue details</h2><p className="mt-1 text-sm text-slate-700">Everything submitted through WhatsApp stays attached to this ticket.</p></div><Clock3 className="h-5 w-5 shrink-0 text-slate-600" /></div>';
const newSectionStart = '<section className="min-w-0 border-2 border-dotted border-red-200 bg-red-50/50 p-5 shadow-sm sm:p-6"><div className="flex min-w-0 items-start justify-between gap-4"><div className="min-w-0"><h2 className="text-lg font-bold text-slate-950">Issue details</h2><p className="mt-1 text-sm text-slate-700">Everything submitted through WhatsApp stays attached to this ticket.</p></div></div>';

code = code.replace(oldSectionStart, newSectionStart);

// Remove Clock3 from imports if present
code = code.replace(/Clock3,?\s*/, '');

fs.writeFileSync(file, code);
