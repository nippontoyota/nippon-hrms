import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Eye, EyeSlash, Spinner } from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) throw error;
      
      const session = data.session;
      if (!session) throw new Error('No session returned');

      setAuth(
        { 
          id: session.user.id, 
          name: session.user.email?.split('@')[0] || 'User', 
          email: session.user.email || '',
          role: 'HR_ADMIN' 
        }, 
        session.access_token
      );
      toast.success('Login successful');
      navigate('/admin');
    } catch (err: any) {
      toast.error(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left side: Large Logo */}
      <div className="hidden lg:flex w-1/2 bg-white items-center justify-center p-12 border-r border-slate-300">
        <div className="max-w-lg w-full text-center">
          <img 
            src="/nippon-logo.png" 
            alt="Nippon Toyota" 
            className="w-full max-w-sm mx-auto object-contain" 
          />
        </div>
      </div>

      {/* Right side: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="mb-10 text-center lg:text-left">
            {/* Mobile logo fallback */}
            <img src="/nippon-logo.png" alt="Nippon Toyota" className="h-10 mx-auto mb-8 object-contain lg:hidden" />
            
            <h1 className="text-4xl lg:text-5xl font-headline font-black text-slate-900 tracking-tighter mb-4 leading-tight">
              Nippon <span className="text-[#eb0a1e]">HR Connect</span>
            </h1>
            <div className="flex items-center justify-center lg:justify-start gap-4">
              <div className="h-[2px] w-12 bg-[#eb0a1e]"></div>
              <p className="text-sm lg:text-base font-bold text-slate-600 uppercase tracking-[0.25em]">Admin Portal</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
              <input
                type="email"
                className="w-full bg-white rounded-none px-4 py-3 text-sm text-slate-900 font-body placeholder:text-slate-400 transition-none focus:outline-none border border-slate-300 focus:border-[#eb0a1e]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@nippontoyota.com"
                required
              />
            </div>
            
            <div className="relative">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                className="w-full bg-white rounded-none pl-4 pr-12 py-3 text-sm text-slate-900 font-body placeholder:text-slate-400 transition-none focus:outline-none border border-slate-300 focus:border-[#eb0a1e]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-[38px] text-slate-400 hover:text-slate-600 transition-colors"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
              </button>
            </div>
            
            <button type="submit" className="w-full bg-[#e60000] hover:bg-red-700 text-white font-bold py-3 px-4 rounded-md transition-colors mt-2 flex items-center justify-center gap-2" disabled={loading}>
              {loading ? (
                <>
                  <Spinner className="animate-spin" size={18} weight="bold" />
                  Signing in…
                </>
              ) : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
