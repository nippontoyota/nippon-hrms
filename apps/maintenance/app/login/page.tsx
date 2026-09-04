import { redirect } from 'next/navigation'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  redirect(`/admin/login${error ? `?error=${encodeURIComponent(error)}` : ''}`)
}
