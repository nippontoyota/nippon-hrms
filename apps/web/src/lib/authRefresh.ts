export async function refreshAccessToken(): Promise<string | null> {
  const { supabase } = await import('@/lib/supabase');
  const { data, error } = await supabase.auth.refreshSession();
  if (error || !data.session?.access_token) {
    return null;
  }
  const token = data.session.access_token;
  localStorage.setItem('access_token', token);
  const { useAuthStore } = await import('@/stores/authStore');
  const user = useAuthStore.getState().user;
  if (user) {
    useAuthStore.getState().setAuth(user, token);
  }
  return token;
}
