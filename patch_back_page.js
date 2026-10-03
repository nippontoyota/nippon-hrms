const fs = require('fs');
let file = '/Users/shivasajay/Desktop/nippon-hrms/apps/maintenance/app/(dashboard)/tickets/[id]/page.tsx';
let code = fs.readFileSync(file, 'utf8');

const target = '<Link href="/tickets" className="inline-flex h-9 items-center justify-center gap-2 bg-red-600 px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-white shadow-sm transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-sm">';
const replacement = '<Link href="/tickets" className="hidden md:inline-flex h-9 items-center justify-center gap-2 bg-red-600 px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-white shadow-sm transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-sm">';

code = code.replace(target, replacement);
fs.writeFileSync(file, code);
