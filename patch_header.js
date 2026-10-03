const fs = require('fs');
let file = '/Users/shivasajay/Desktop/nippon-hrms/apps/maintenance/components/layout/header.tsx';
let code = fs.readFileSync(file, 'utf8');

const target = '<div className="flex items-center gap-5">';
const replacement = '<div className="flex items-center gap-5">\n        {pathname.startsWith(\'/tickets/\') && pathname.length > 9 && (\n           <Link href="/tickets" className="md:hidden flex h-8 items-center justify-center rounded-sm bg-red-600 px-3 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-red-700">\n             Back to queue\n           </Link>\n        )}';

code = code.replace(target, replacement);
fs.writeFileSync(file, code);
