const fs = require('fs');
let file = '/Users/shivasajay/Desktop/nippon-hrms/apps/maintenance/app/(dashboard)/tickets/[id]/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// Replace bg-[#fff5f5] with bg-red-100
code = code.replace(
  'border-[3px] border-dashed border-red-400 bg-[#fff5f5]',
  'border-[3px] border-dashed border-red-400 bg-red-100/50'
);

fs.writeFileSync(file, code);
