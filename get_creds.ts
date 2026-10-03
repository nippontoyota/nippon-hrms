import { PrismaClient } from './packages/database/node_modules/@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const branches = await prisma.maintenanceBranch.findMany({
    include: { account: true }
  });
  console.log("Branches and their credentials:");
  branches.forEach(b => {
    console.log(\`Branch Name: \${b.name}\`);
    console.log(\`Account ID: \${b.account?.id}\`);
    console.log(\`Login Key: \${b.account?.login_key}\`);
    console.log("---");
  });
}
main().catch(console.error).finally(() => prisma.$disconnect());
