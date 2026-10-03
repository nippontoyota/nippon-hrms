const fs = require('fs');
const file = '/Users/shivasajay/Desktop/nippon-hrms/apps/maintenance/lib/maintenance-auth.ts';
let code = fs.readFileSync(file, 'utf8');

// Add import for branchDefinitionForCode if not exists
if (!code.includes('branchDefinitionForCode')) {
  code = code.replace(
    "import { loginKey, sessionTtlSeconds, verifySecret } from '@/lib/password'",
    "import { loginKey, sessionTtlSeconds, verifySecret } from '@/lib/password'\nimport { branchDefinitionForCode } from '@/lib/maintenance-branches'"
  );
}

const oldLogic = `  const account = isAdminLogin
    ? await prisma.maintenanceAccount.findFirst({ where: { email: normalized.toLowerCase(), is_active: true }, select: { id: true, role: true, branch_id: true, secret_hash: true } })
    : await prisma.maintenanceAccount.findFirst({ where: { login_key: loginKey(branchCode), role: 'BRANCH', is_active: true }, select: { id: true, role: true, branch_id: true, secret_hash: true } })
  if (!account || !(await verifySecret(isAdminLogin ? secret : branchCode, account.secret_hash))) return null
  await createMaintenanceSession(account)
  return { role: account.role, branchId: account.branch_id }`;

const newLogic = `  let account: { id: string, role: 'ADMIN' | 'BRANCH', branch_id: string | null, secret_hash: string } | null = null

  if (isAdminLogin) {
    account = await prisma.maintenanceAccount.findFirst({ where: { email: normalized.toLowerCase(), is_active: true }, select: { id: true, role: true, branch_id: true, secret_hash: true } })
  } else {
    const def = branchDefinitionForCode(branchCode)
    if (def) {
      const branch = await prisma.maintenanceBranch.findFirst({ where: { name: def.name } })
      if (branch) {
        account = await prisma.maintenanceAccount.findFirst({ where: { branch_id: branch.id, role: 'BRANCH', is_active: true }, select: { id: true, role: true, branch_id: true, secret_hash: true } })
      }
    }
  }

  if (!account || !(await verifySecret(isAdminLogin ? secret : branchCode, account.secret_hash))) return null
  await createMaintenanceSession(account)
  return { role: account.role, branchId: account.branch_id }`;

code = code.replace(oldLogic, newLogic);
fs.writeFileSync(file, code);
