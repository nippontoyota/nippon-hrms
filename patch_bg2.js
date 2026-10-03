const fs = require('fs');

const branchesFile = '/Users/shivasajay/Desktop/nippon-hrms/apps/maintenance/app/(dashboard)/admin/branches/page.tsx';
let branchesCode = fs.readFileSync(branchesFile, 'utf8');
branchesCode = branchesCode.replace('bg-[#f4f6fa]', 'bg-white');
fs.writeFileSync(branchesFile, branchesCode);

const transfersFile = '/Users/shivasajay/Desktop/nippon-hrms/apps/maintenance/app/(dashboard)/transfers/page.tsx';
let transfersCode = fs.readFileSync(transfersFile, 'utf8');
transfersCode = transfersCode.replace('bg-[#f4f6fa]', 'bg-white');
fs.writeFileSync(transfersFile, transfersCode);

