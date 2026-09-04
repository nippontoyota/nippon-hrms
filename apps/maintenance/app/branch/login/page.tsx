import { AuthLoginPage } from '@/components/auth-login-page'

export default async function BranchLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  return <AuthLoginPage kind="branch" error={error} />
}
