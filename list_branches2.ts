import { PrismaClient } from './packages/database/node_modules/@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();
async function main() {
  const accounts = await prisma.maintenanceAccount.findMany({
    include: { branch: true }
  });
  accounts.forEach(a => {
    console.log(\`Branch: \${a.branch?.name} -> Code: \${a.identifier}\`);
  });
}
main().catch(console.error).finally(() => prisma.$disconnect());
