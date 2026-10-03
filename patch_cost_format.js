const fs = require('fs');
let file = '/Users/shivasajay/Desktop/nippon-hrms/apps/maintenance/components/tickets/total-cost-form.tsx';
let code = fs.readFileSync(file, 'utf8');

// The original formatValue adds .00:
// return Number(raw).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

code = code.replace(
  "return Number(raw).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })",
  "return Number(raw).toLocaleString('en-IN', { maximumFractionDigits: 0 })"
);

// Also remove placeholder="0.00" and use placeholder="0"
code = code.replace(
  'placeholder="0.00"',
  'placeholder="0"'
);

fs.writeFileSync(file, code);
