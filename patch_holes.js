const fs = require('fs');
let ticketPageFile = '/Users/shivasajay/Desktop/nippon-hrms/apps/maintenance/app/(dashboard)/tickets/[id]/page.tsx';
let ticketPageCode = fs.readFileSync(ticketPageFile, 'utf8');

// Replace bg-[#f4f6fa] in the holes with bg-white
ticketPageCode = ticketPageCode.replace(/bg-\[#f4f6fa\]/g, 'bg-white');

fs.writeFileSync(ticketPageFile, ticketPageCode);
