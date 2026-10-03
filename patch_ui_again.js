const fs = require('fs');
let file = '/Users/shivasajay/Desktop/nippon-hrms/apps/maintenance/app/(dashboard)/tickets/[id]/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Remove Owning branch card
const owningBranchPattern = /<section className="border border-red-200 bg-red-50 p-4"><p className="text-\[10px\] font-bold uppercase tracking-\[0\.14em\] text-red-600">Owning branch<\/p><p className="mt-1 text-base font-bold text-\[#111827\]">\{ticket\.branch \? normalizeMaintenanceBranchName\(ticket\.branch\.name\) : 'Unassigned branch'\}<\/p><\/section>/g;
code = code.replace(owningBranchPattern, '');

// 2. Ticket card bg a little more evident (change bg-[#fafafa] to bg-slate-100)
code = code.replace(/bg-\[#fafafa\]/g, 'bg-slate-100');

// 3. Ownership card bg light yellow (change `bg-white` to `bg-yellow-50` and border)
const ownershipCard = '<section className="border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-slate-950">Ownership</h2>';
const newOwnershipCard = '<section className="border border-yellow-200 bg-yellow-50 p-5 shadow-sm"><h2 className="text-lg font-bold text-slate-950">Ownership</h2>';
code = code.replace(ownershipCard, newOwnershipCard);

fs.writeFileSync(file, code);

// 4. Employee Assignment dropdown curved corners (change rounded to rounded-none)
let file2 = '/Users/shivasajay/Desktop/nippon-hrms/apps/maintenance/components/tickets/employee-assignment.tsx';
let code2 = fs.readFileSync(file2, 'utf8');
code2 = code2.replace(/className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-300 bg-white py-1 shadow-lg"/g, 'className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-none border border-slate-300 bg-white py-1 shadow-lg"');
fs.writeFileSync(file2, code2);
