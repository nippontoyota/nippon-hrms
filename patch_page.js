const fs = require('fs');
const file = '/Users/shivasajay/Desktop/nippon-hrms/apps/maintenance/app/(dashboard)/tickets/[id]/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Reduce the width of the sidebar from 360px to 300px
code = code.replace(
  'lg:grid-cols-[minmax(0,1fr)_360px]',
  'lg:grid-cols-[minmax(0,1fr)_300px]'
);

// 2. Let the ticket box ui have a light bg shade
// Replace `bg-white` in the main left-side sections with `bg-[#fafafa]` or `bg-slate-50`
// Section 1: Issue details
code = code.replace(
  '<section className="min-w-0 border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex min-w-0 items-start justify-between gap-4"><div className="min-w-0"><h2 className="text-lg font-bold text-slate-950">Issue details</h2>',
  '<section className="min-w-0 border border-slate-200 bg-[#fafafa] p-5 shadow-sm sm:p-6"><div className="flex min-w-0 items-start justify-between gap-4"><div className="min-w-0"><h2 className="text-lg font-bold text-slate-950">Issue details</h2>'
);

// Section 2: Total Cost
code = code.replace(
  '<section className="min-w-0 border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex min-w-0 items-end justify-between gap-3"><div className="min-w-0"><h2 className="text-lg font-bold text-slate-950">Total Cost</h2>',
  '<section className="min-w-0 border border-slate-200 bg-[#fafafa] p-5 shadow-sm sm:p-6"><div className="flex min-w-0 items-end justify-between gap-3"><div className="min-w-0"><h2 className="text-lg font-bold text-slate-950">Total Cost</h2>'
);

// Make inner boxes slightly white if outer is #fafafa
code = code.replace(
  '<div className="min-w-0 border border-slate-200 bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-700">Reporter</p>',
  '<div className="min-w-0 border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-700">Reporter</p>'
);
code = code.replace(
  '<div className="min-w-0 border border-slate-200 bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-700">Location</p>',
  '<div className="min-w-0 border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-700">Location</p>'
);
code = code.replace(
  '<p className="mt-2 break-words whitespace-pre-wrap border border-slate-200 p-4 text-sm leading-6 text-slate-800">{ticket.description}</p>',
  '<p className="mt-2 break-words whitespace-pre-wrap border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-800 shadow-sm">{ticket.description}</p>'
);

fs.writeFileSync(file, code);
