const { PrismaClient } = require('./apps/maintenance/node_modules/@prisma/client');
require('./apps/maintenance/node_modules/dotenv').config();

const prisma = new PrismaClient();
async function main() {
  const accounts = await prisma.maintenanceAccount.findMany({
    include: { branch: true }
  });
  accounts.forEach(a => {
    console.log(`Branch: ${a.branch ? a.branch.name : 'Unknown'} -> Code: ${a.identifier}`);
  });
}
main().catch(console.error).finally(() => prisma.$disconnect());
