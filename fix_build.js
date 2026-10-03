const fs = require('fs');
const file = '/Users/shivasajay/Desktop/nippon-hrms/apps/maintenance/app/actions/maintenance.ts';
let code = fs.readFileSync(file, 'utf8');

const target = `    await prisma.ticketActivity.create({
      data: {
        ticket_id: ticketId,
        actor: 'System',
        detail: \`WhatsApp notification sent to \${ticket.assignee.name}\`
      }
    })`

code = code.replace(target, '');
fs.writeFileSync(file, code);
