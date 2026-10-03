const fs = require('fs');
let file = '/Users/shivasajay/Desktop/nippon-hrms/apps/maintenance/app/(dashboard)/tickets/[id]/page.tsx';
let code = fs.readFileSync(file, 'utf8');

const sectionMatch = '<section className="relative min-w-0 border-[3px] border-dashed border-red-400 bg-red-50/40 p-5 shadow-sm sm:p-6 rounded-2xl overflow-hidden">';
// Remove overflow-hidden so the negative positioned cutouts can show!
const newSection = `<section className="relative min-w-0 border-[3px] border-dashed border-red-400 bg-[#fff5f5] p-5 shadow-sm sm:p-8 rounded-2xl">
        <div className="absolute top-[45%] -left-5 h-8 w-8 -translate-y-1/2 rounded-full bg-[#f4f6fa] shadow-[inset_-3px_0_0_rgba(248,113,113,0.5)] border-r border-red-200"></div>
        <div className="absolute top-[45%] -right-5 h-8 w-8 -translate-y-1/2 rounded-full bg-[#f4f6fa] shadow-[inset_3px_0_0_rgba(248,113,113,0.5)] border-l border-red-200"></div>
`;

code = code.replace(sectionMatch, newSection);
fs.writeFileSync(file, code);
