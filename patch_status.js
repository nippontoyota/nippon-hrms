const fs = require('fs');
const file = '/Users/shivasajay/Desktop/nippon-hrms/apps/maintenance/app/(dashboard)/tickets/[id]/page.tsx';
let code = fs.readFileSync(file, 'utf8');

const getStatusColor = `function getStatusColor(status: string) {
  switch (status) {
    case 'NEW': return 'border-blue-200 bg-blue-50 text-blue-700'
    case 'CLOSED': return 'border-slate-200 bg-slate-100 text-slate-700'
    case 'IN PROGRESS': return 'border-orange-200 bg-orange-50 text-orange-700'
    case 'REJECTED': return 'border-red-200 bg-red-50 text-red-700'
    case 'APPROVED': return 'border-emerald-200 bg-emerald-50 text-emerald-700'
    case 'UNDER REVIEW': return 'border-purple-200 bg-purple-50 text-purple-700'
    default: return 'border-slate-300 bg-slate-50 text-slate-700'
  }
}
`

if (!code.includes('getStatusColor')) {
  // Inject helper right after imports
  code = code.replace("import { notFound } from 'next/navigation'", "import { notFound } from 'next/navigation'\n\n" + getStatusColor);
}

// Replace the status tag styling
code = code.replace(
  '<span className="border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-700">{status}</span>',
  '<span className={`border px-3 py-2 text-xs font-bold uppercase tracking-wide ${getStatusColor(status)}`}>{status}</span>'
);

fs.writeFileSync(file, code);
