import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '@/api/endpoints';
import { useAuthStore } from '@/stores/authStore';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@nippon.local');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { token, user } = await authApi.login(email, password);
      setAuth(user, token);
      toast.success(`Welcome, ${user.name}`);
      navigate('/admin');
    } catch {
      toast.error('Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 overflow-hidden bg-background">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-primary/5 -skew-x-12 transform translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-1/4 h-1/2 bg-tertiary/5 -skew-x-12 transform -translate-x-1/2" />
      </div>

      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden rounded-xl bg-white shadow-2xl border border-outline/40">
        <div className="lg:col-span-7 p-12 md:p-16 flex flex-col justify-center bg-surface-variant">
          <img src="/nippon-logo.png" alt="Nippon Toyota" className="h-10 w-fit mb-12 object-contain" />
          <h2 className="font-headline text-4xl md:text-5xl font-bold tracking-tighter text-on-surface">
            PAYSLIP
            <br />
            <span className="text-primary-container">PORTAL</span>
          </h2>
          <p className="mt-6 text-on-surface-variant font-body max-w-md leading-relaxed">
            HR admin for employee management, monthly payslip imports, PDF preview, and bulk WhatsApp delivery.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            {['Employee management', 'Payslip import', 'WhatsApp bulk send'].map((f) => (
              <span key={f} className="badge badge-info">{f}</span>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 bg-white p-8 md:p-16 flex items-center">
          <form onSubmit={handleSubmit} className="w-full max-w-sm mx-auto space-y-6">
            <div>
              <h3 className="font-headline text-2xl font-bold text-on-surface">Sign in</h3>
              <p className="text-sm text-on-surface-variant mt-1">HR admin access only</p>
            </div>

            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>

            <p className="text-xs text-on-surface-variant text-center">
              Demo: admin@nippon.local / admin123
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
