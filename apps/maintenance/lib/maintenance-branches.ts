export type MaintenanceBranchDefinition = {
  name: string
  code: string
  aliases: readonly string[]
}

export const MAINTENANCE_BRANCHES: readonly MaintenanceBranchDefinition[] = [
  { name: 'Irinjalakuda', code: 'IR01A', aliases: ['Irinjalakuda'] },
  { name: 'Kalamaserry', code: 'CO01B', aliases: ['Kalamaserry', 'Kalamaserry_SM'] },
  { name: 'Kayamkulam', code: 'KY01A', aliases: ['Kayamkulam', 'Kayamkulam_SM'] },
  { name: 'Kazhakoottam', code: 'TR01A', aliases: ['Kazhakoottam', 'Kazhakoottam_SM'] },
  { name: 'Kollam', code: 'KL01A', aliases: ['Kollam'] },
  { name: 'Kottayam', code: 'KT01A', aliases: ['Kottayam'] },
  { name: 'Muvattupuzha', code: 'MV01A', aliases: ['Muvattupuzha'] },
  { name: 'Nettor', code: 'CO01A', aliases: ['Nettor', 'Nettor_SM', 'Nettoo', 'Nettoo_SM'] },
  { name: 'Pathanamthitta', code: 'PH01A', aliases: ['Pathanamthitta'] },
  { name: 'Thiruvalla', code: 'TL01A', aliases: ['Thiruvalla'] },
  { name: 'Thrissur', code: 'TI01A', aliases: ['Thrissur', 'Thrissur_SM', 'Trichur', 'Trichur_SM'] },
] as const

const canonicalNames = new Set(MAINTENANCE_BRANCHES.map((branch) => branch.name))
const aliases = new Map(MAINTENANCE_BRANCHES.flatMap((branch) => branch.aliases.map((alias) => [alias.toLocaleLowerCase(), branch.name] as const)))

export function normalizeMaintenanceBranchName(value: string) {
  const trimmed = value.trim()
  return aliases.get(trimmed.toLocaleLowerCase()) ?? trimmed
}

export function isCanonicalMaintenanceBranchName(value: string) {
  return canonicalNames.has(normalizeMaintenanceBranchName(value))
}

export function branchDefinitionForCode(code: string) {
  const normalized = code.trim().toUpperCase()
  return MAINTENANCE_BRANCHES.find((branch) => branch.code === normalized)
}

if (new Set(MAINTENANCE_BRANCHES.map((branch) => branch.name)).size !== 11 || new Set(MAINTENANCE_BRANCHES.map((branch) => branch.code)).size !== 11) {
  throw new Error('Maintenance branch catalog must contain exactly 11 unique branches and codes')
}
