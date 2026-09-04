import { AuthLoginPage } from '@/components/auth-login-page'

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  return <AuthLoginPage kind="admin" error={error} />
}
