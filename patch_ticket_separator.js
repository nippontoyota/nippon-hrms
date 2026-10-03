const fs = require('fs');
let file = '/Users/shivasajay/Desktop/nippon-hrms/apps/maintenance/app/(dashboard)/tickets/[id]/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// The header ends right before <div className="mt-6 grid min-w-0 gap-3 sm:grid-cols-2">
const splitTarget = 'stays attached to this ticket.</p></div></div><div className="mt-6 grid min-w-0 gap-3 sm:grid-cols-2">';
const replacement = 'stays attached to this ticket.</p></div></div><hr className="my-6 border-[1.5px] border-dashed border-red-200" /><div className="grid min-w-0 gap-3 sm:grid-cols-2">';

code = code.replace(splitTarget, replacement);
fs.writeFileSync(file, code);
