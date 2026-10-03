const fs = require('fs');
const file = '/Users/shivasajay/Desktop/nippon-hrms/apps/maintenance/components/tickets/employee-assignment.tsx';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('MessageCircle')) {
  code = code.replace("import { useRouter }", "import { useRouter }\nimport { MessageCircle } from 'lucide-react'");
}

const oldBlock = `<div className="flex flex-col gap-2 rounded-md border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-800">Assigned to: {currentAssignee.name}</p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleNotify}
              disabled={disabled || isPending || notificationStatus === 'Sent!'}
              className="inline-flex h-8 items-center justify-center rounded bg-green-600 px-4 text-xs font-bold text-white transition hover:bg-green-700 disabled:opacity-50"
            >
              {notificationStatus || 'Send WhatsApp'}
            </button>
            <button
              onClick={() => handleAssign({ id: '', name: '', mobile_number: '' })}
              disabled={disabled || isPending}
              className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
            >
              Unassign
            </button>
          </div>
        </div>`;

const newBlock = `<div className="flex flex-col gap-4 border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Assigned to</p>
            <p className="mt-1 text-sm font-bold text-slate-900">{currentAssignee.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleNotify}
              disabled={disabled || isPending || notificationStatus === 'Sent!'}
              className="inline-flex h-9 items-center justify-center bg-[#25D366] px-4 text-xs font-bold text-white transition hover:bg-[#20bd5a] disabled:opacity-50"
            >
              <MessageCircle className="mr-2 h-3.5 w-3.5" />
              {notificationStatus || 'Send WhatsApp'}
            </button>
            <button
              onClick={() => handleAssign({ id: '', name: '', mobile_number: '' })}
              disabled={disabled || isPending}
              className="text-xs font-bold uppercase tracking-wider text-red-600 hover:underline disabled:opacity-50"
            >
              Unassign
            </button>
          </div>
        </div>`;

code = code.replace(oldBlock, newBlock);

const oldInput = `className="h-10 w-full border border-slate-300 px-3 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 disabled:bg-slate-100"`;
const newInput = `className="h-10 w-full border border-slate-300 px-3 text-sm font-semibold outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 disabled:bg-slate-100"`;
code = code.replace(oldInput, newInput);

fs.writeFileSync(file, code);
