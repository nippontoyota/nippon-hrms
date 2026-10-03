const fs = require('fs');
let file = '/Users/shivasajay/Desktop/nippon-hrms/apps/maintenance/components/tickets/total-cost-form.tsx';
let code = fs.readFileSync(file, 'utf8');

// Replace the root wrapper of the Cost form with a nice white card
code = code.replace(
  '<div className="flex flex-col gap-1 px-1">',
  '<div className="flex flex-col gap-2 rounded-sm border border-slate-200 bg-white p-5 shadow-sm">'
);

code = code.replace(
  '<label className="text-sm font-bold uppercase tracking-wider text-slate-500">Total Cost</label>',
  '<label className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-700">Cost</label>'
);

fs.writeFileSync(file, code);
