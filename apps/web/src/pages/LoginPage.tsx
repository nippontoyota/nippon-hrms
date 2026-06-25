import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Building2, MessageSquare, Shield, Zap } from 'lucide-react';
import api from '@/lib/axios';
import { useAuthStore } from '@/stores/authStore';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
type FormValues = z.infer<typeof schema>;

const features = [
  { icon: MessageSquare, label: 'WhatsApp Employee Self-Service' },
  { icon: Shield,        label: 'Role-Based Access Control'      },
  { icon: Zap,          label: 'Real-Time HR Workflows'          },
];

export default function LoginPage() {
  const navigate   = useNavigate();
  const { setAuth } = useAuthStore();

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: (data: FormValues) =>
      api.post<{ user: Parameters<typeof setAuth>[0]; access_token: string }>(
        '/auth/login', data
      ),
    onSuccess: ({ data }) => {
      setAuth(data.user, data.access_token);
      navigate('/dashboard');
    },
  });

  const onSubmit = (values: FormValues) => mutation.mutate(values);

  return (
    <div className="login-page">
      {/* Brand panel */}
      <div className="login-brand fade-up">
        <div className="login-brand-logo">
          <Building2 size={24} />
        </div>
        <h1>
          HR Platform<br />
          by <span>Nippon Toyota</span>
        </h1>
        <p>
          A production-grade internal HR operations platform.
          Manage employees, payroll, leaves, and WhatsApp self-service — all in one place.
        </p>
        <div className="login-brand-features">
          {features.map((f) => (
            <div key={f.label} className="feature-pill">
              <span className="dot" />
              <f.icon size={14} />
              {f.label}
            </div>
          ))}
        </div>
      </div>

      {/* Form panel */}
      <div className="login-form-panel">
        <div className="login-form-box fade-up">
          <h2>Welcome back</h2>
          <p>Sign in to your HR admin account</p>

          <form className="login-form" onSubmit={handleSubmit(onSubmit)} id="login-form">
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">Email address</label>
              <input
                id="login-email"
                type="email"
                className="form-input"
                placeholder="admin@nippontoyota.com"
                autoComplete="email"
                {...register('email')}
              />
              {errors.email && <span className="form-error">{errors.email.message}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                autoComplete="current-password"
                {...register('password')}
              />
              {errors.password && <span className="form-error">{errors.password.message}</span>}
            </div>

            {mutation.isError && (
              <p className="form-error" style={{ textAlign: 'center' }}>
                Invalid credentials. Please try again.
              </p>
            )}

            <button
              id="login-submit"
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <><span className="spinner" /> Signing in…</>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="text-sm text-muted mt-4" style={{ textAlign: 'center' }}>
            Nippon Toyota internal platform — authorised users only
          </p>
        </div>
      </div>
    </div>
  );
}
