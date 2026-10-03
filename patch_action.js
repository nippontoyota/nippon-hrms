const fs = require('fs');
let file = '/Users/shivasajay/Desktop/nippon-hrms/apps/maintenance/app/actions/maintenance.ts';
let code = fs.readFileSync(file, 'utf8');

const newAction = `
export async function deleteTicket(ticketId: string) {
  const session = await requireMaintenanceSession();
  if (session.role !== 'ADMIN') {
    return { success: false, error: 'Only admins can delete tickets.' };
  }

  try {
    await prisma.ticket.delete({
      where: { id: ticketId }
    });
    revalidatePath('/tickets');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to delete ticket.' };
  }
}
`;

code += '\n' + newAction;
fs.writeFileSync(file, code);
