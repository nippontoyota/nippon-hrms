const fs = require('fs');

const layoutFile = '/Users/shivasajay/Desktop/nippon-hrms/apps/maintenance/app/(dashboard)/layout.tsx';
let layoutCode = fs.readFileSync(layoutFile, 'utf8');
layoutCode = layoutCode.replace('bg-[#f4f6fa]', 'bg-white');
fs.writeFileSync(layoutFile, layoutCode);

const ticketPageFile = '/Users/shivasajay/Desktop/nippon-hrms/apps/maintenance/app/(dashboard)/tickets/[id]/page.tsx';
let ticketPageCode = fs.readFileSync(ticketPageFile, 'utf8');
ticketPageCode = ticketPageCode.replace('bg-[#f4f6fa]', 'bg-white');
fs.writeFileSync(ticketPageFile, ticketPageCode);

