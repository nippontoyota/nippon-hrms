import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '@/api/endpoints';
import { useAuthStore } from '@/stores/authStore';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@nippon.local');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { access_token, user } = await authApi.login(email, password);
      setAuth(user, access_token);
      toast.success(`Welcome, ${user.name}`);
      navigate('/admin');
    } catch {
      toast.error('Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/nippon-logo.png" alt="Nippon Toyota" className="h-10 mx-auto mb-4 object-contain" />
          <h1 className="text-2xl font-headline font-bold uppercase tracking-tighter text-on-surface">Nippon HR Connect</h1>
          <p className="text-sm text-on-surface-variant mt-1">Admin Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-xs text-center text-on-surface-variant mt-6">
          Demo: admin@nippon.local / admin123 · hr@nippon.local / hr123
        </p>
      </div>
    </div>
  );
}
