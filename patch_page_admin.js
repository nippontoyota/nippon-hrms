const fs = require('fs');
let file = '/Users/shivasajay/Desktop/nippon-hrms/apps/maintenance/app/(dashboard)/tickets/page.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  '<TicketTable tickets={rows} sort={sort} direction={direction} params={params} />',
  '<TicketTable tickets={rows} sort={sort} direction={direction} params={params} isAdmin={session.role === \'ADMIN\'} />'
);

fs.writeFileSync(file, code);
