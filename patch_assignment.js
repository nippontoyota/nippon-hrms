const fs = require('fs');
let file = '/Users/shivasajay/Desktop/nippon-hrms/apps/maintenance/components/tickets/employee-assignment.tsx';
let code = fs.readFileSync(file, 'utf8');

// Change WhatsApp button bg color
code = code.replace(
  'className="inline-flex h-9 items-center justify-center bg-[#25D366] px-4 text-xs font-bold text-white transition hover:bg-[#20bd5a] disabled:opacity-50"',
  'className="inline-flex h-9 items-center justify-center bg-emerald-600 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"'
);

// Disable unassign if notificationStatus is set
code = code.replace(
  '<button\n              onClick={() => handleAssign({ id: \'\', name: \'\', mobile_number: \'\' })}\n              disabled={disabled || isPending}\n              className="text-xs font-bold uppercase tracking-wider text-red-600 hover:underline disabled:opacity-50"\n            >',
  '<button\n              onClick={() => handleAssign({ id: \'\', name: \'\', mobile_number: \'\' })}\n              disabled={disabled || isPending || !!notificationStatus}\n              className="text-xs font-bold uppercase tracking-wider text-red-600 hover:underline disabled:opacity-50"\n            >'
);

fs.writeFileSync(file, code);
