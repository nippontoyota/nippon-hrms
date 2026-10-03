const fs = require('fs');
let file = '/Users/shivasajay/Desktop/nippon-hrms/apps/maintenance/components/tickets/total-cost-form.tsx';
let code = fs.readFileSync(file, 'utf8');

// The original root div:
// <div className="flex flex-col gap-2 rounded-sm border border-slate-200 bg-white p-5 shadow-sm">
const oldRoot = '<div className="flex flex-col gap-2 rounded-sm border border-slate-200 bg-white p-5 shadow-sm">';
const newRoot = '<div className="flex flex-col gap-2 px-1">'; // removing card styling, just gap-2 and minimal padding
code = code.replace(oldRoot, newRoot);

// The original heading:
// <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-700">Cost</label>
const oldHeading = '<label className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-700">Cost</label>';
const newHeading = '<label className="text-lg font-bold text-slate-950">Total Cost</label>';
code = code.replace(oldHeading, newHeading);

fs.writeFileSync(file, code);
