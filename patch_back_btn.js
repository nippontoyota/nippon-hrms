const fs = require('fs');
let file = '/Users/shivasajay/Desktop/nippon-hrms/apps/maintenance/app/(dashboard)/tickets/[id]/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// The original link
const oldLink = '<Link href="/tickets" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-700 hover:text-red-600"><ArrowLeft className="h-3.5 w-3.5" /> Back to queue</Link>';

// The new red box button link
const newLink = '<Link href="/tickets" className="inline-flex h-9 items-center justify-center gap-2 bg-red-600 px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-white shadow-sm transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-sm"><ArrowLeft className="h-3.5 w-3.5" /> Back to queue</Link>';

code = code.replace(oldLink, newLink);

fs.writeFileSync(file, code);
