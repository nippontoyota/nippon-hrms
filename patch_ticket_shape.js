const fs = require('fs');
let file = '/Users/shivasajay/Desktop/nippon-hrms/apps/maintenance/app/(dashboard)/tickets/[id]/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// The original section start:
// <section className="min-w-0 border-2 border-dotted border-red-200 bg-red-50/50 p-5 shadow-sm sm:p-6">
const oldSection = '<section className="min-w-0 border-2 border-dotted border-red-200 bg-red-50/50 p-5 shadow-sm sm:p-6">';
const newSection = '<section className="relative min-w-0 border-[3px] border-dashed border-red-400 bg-red-50/40 p-5 shadow-sm sm:p-6 rounded-2xl overflow-hidden">';

code = code.replace(oldSection, newSection);

fs.writeFileSync(file, code);
