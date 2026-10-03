const fs = require('fs');
const file = '/Users/shivasajay/Desktop/nippon-hrms/apps/maintenance/components/tickets/employee-assignment.tsx';
let code = fs.readFileSync(file, 'utf8');
code = code.replace("import { MessageCircle } from 'lucide-react' from 'next/navigation'", "import { useRouter } from 'next/navigation'\nimport { MessageCircle } from 'lucide-react'");
fs.writeFileSync(file, code);
