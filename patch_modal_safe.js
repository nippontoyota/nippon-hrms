const fs = require('fs');
let file = '/Users/shivasajay/Desktop/nippon-hrms/apps/maintenance/components/tickets/ticket-controls.tsx';
let code = fs.readFileSync(file, 'utf8');

// Replace animate-in classes with standard opacity transitions (although animate-in is ignored if not installed)
code = code.replace(/animate-in fade-in duration-200/g, '');
code = code.replace(/animate-in zoom-in-95 duration-200/g, '');

fs.writeFileSync(file, code);
