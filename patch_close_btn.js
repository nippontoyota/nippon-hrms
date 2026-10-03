const fs = require('fs');
let file = '/Users/shivasajay/Desktop/nippon-hrms/apps/maintenance/components/tickets/ticket-controls.tsx';
let code = fs.readFileSync(file, 'utf8');

// The close button has bg-green-600, change to bg-emerald-600
code = code.replace(
  'bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700',
  'bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700'
);

code = code.replace(
  'className="h-9 shrink-0 bg-green-600 px-4 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"',
  'className="h-9 shrink-0 bg-emerald-600 px-4 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"'
);

fs.writeFileSync(file, code);
