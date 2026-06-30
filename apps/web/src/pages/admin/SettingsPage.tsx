import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { useAuthStore } from '@/stores/authStore';
import { Shield, Key, Users, Trash, Plus, Spinner, Eye, EyeSlash } from '@phosphor-icons/react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'access' | 'vault'>('vault');
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wide">Settings & Security</h2>
      </div>

      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('vault')}
          className={`px-4 py-2 font-semibold text-sm uppercase tracking-wider flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'vault'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Shield size={18} weight="bold" /> Privacy Mode
        </button>
        {isSuperAdmin && (
          <button
            onClick={() => setActiveTab('access')}
            className={`px-4 py-2 font-semibold text-sm uppercase tracking-wider flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'access'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Users size={18} weight="bold" /> Access Management
          </button>
        )}
      </div>

      {activeTab === 'vault' && <VaultPasswordTab />}
      {activeTab === 'access' && isSuperAdmin && <AccessManagementTab />}
    </div>
  );
}

function VaultPasswordTab() {
  const [current, setCurrent] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirm) {
      toast.error('New passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await api.patch('/vault/password', { currentPassword: current, newPassword: newPass });
      toast.success('Privacy Mode password updated successfully');
      setCurrent('');
      setNewPass('');
      setConfirm('');
    } catch (err: any) {
      toast.error(err.response?.data?.data || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-8 max-w-xl shadow-sm">
      <div className="flex items-center gap-4 mb-3">
        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-full text-red-600">
          <Key size={28} weight="duotone" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Change Privacy Mode Password</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            This password unlocks the Vault across the entire application for all HR users. 
            It protects highly sensitive salary and PF data.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 mt-8">
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Current Password</label>
          <div className="relative">
            <input
              type={showCurrent ? "text" : "password"}
              className="w-full bg-slate-50 dark:bg-slate-800 rounded-md pl-4 pr-12 py-3 text-sm text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 focus:border-red-600 focus:outline-none transition-colors"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              placeholder="Enter current password"
              required
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              {showCurrent ? <EyeSlash size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">New Password</label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                className="w-full bg-slate-50 dark:bg-slate-800 rounded-md pl-4 pr-12 py-3 text-sm text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 focus:border-red-600 focus:outline-none transition-colors"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="Enter new password"
                required
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                {showNew ? <EyeSlash size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Confirm New Password</label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                className="w-full bg-slate-50 dark:bg-slate-800 rounded-md pl-4 pr-12 py-3 text-sm text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 focus:border-red-600 focus:outline-none transition-colors"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm new password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                {showConfirm ? <EyeSlash size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="submit"
            disabled={loading || !current || !newPass || !confirm}
            className="w-full bg-[#eb0a1e] hover:bg-red-700 text-white font-bold py-3 rounded-md uppercase tracking-wider text-sm transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
          >
            {loading ? <Spinner className="animate-spin" size={18} /> : <Key size={18} weight="bold" />}
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </form>
    </div>
  );
}

function AccessManagementTab() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await api.get('/admin/users');
      return res.data as { id: string; email: string; role: string; created_at: string }[];
    },
  });

  const createMut = useMutation({
    mutationFn: async () => api.post('/admin/users', { email, password }),
    onSuccess: () => {
      toast.success('HR User created successfully');
      setShowCreate(false);
      setEmail('');
      setPassword('');
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.data || 'Failed to create user'),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => api.delete(`/admin/users/${id}`),
    onSuccess: () => {
      toast.success('HR User deleted successfully');
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: () => toast.error('Failed to delete user'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="max-w-2xl">
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Manage application access for HR staff. Only Super Admins have full access to provision and revoke HR user accounts. Passwords must be securely provided to new users out-of-band.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-5 py-2.5 rounded-md font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-sm"
        >
          <Plus size={16} weight="bold" /> Provision Account
        </button>
      </div>

      {showCreate && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-lg shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Users size={20} weight="duotone" className="text-slate-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Provision New HR Account</h3>
          </div>
          <div className="flex flex-col md:flex-row items-end gap-4">
            <div className="flex-1 w-full">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">Email Address</label>
              <input
                type="email"
                className="w-full bg-slate-50 dark:bg-slate-800 rounded-md px-4 py-2.5 text-sm border border-slate-300 dark:border-slate-700 focus:border-red-600 focus:outline-none transition-colors"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="hr@nippontoyota.com"
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">Initial Password</label>
              <input
                type="text"
                className="w-full bg-slate-50 dark:bg-slate-800 rounded-md px-4 py-2.5 text-sm border border-slate-300 dark:border-slate-700 focus:border-red-600 focus:outline-none transition-colors"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Secure initial password..."
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => createMut.mutate()}
                disabled={createMut.isPending || !email || !password}
                className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-md uppercase tracking-wider text-xs transition-colors disabled:opacity-50 flex items-center gap-2 min-w-[120px] justify-center"
              >
                {createMut.isPending ? <Spinner className="animate-spin" size={14} /> : <Plus size={14} weight="bold" />}
                Provision
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Spinner className="animate-spin text-slate-400" size={32} />
        </div>
      ) : (
        <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-[11px] text-slate-500 dark:text-slate-400">Email</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-[11px] text-slate-500 dark:text-slate-400">Role</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-[11px] text-slate-500 dark:text-slate-400">Created At</th>
                <th className="px-6 py-4 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {users?.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-[4px] text-[10px] font-bold uppercase tracking-wider ${
                      u.role === 'super_admin' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {u.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {u.role !== 'super_admin' && (
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to revoke access for ${u.email}?`)) {
                            deleteMut.mutate(u.id);
                          }
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors"
                        title="Revoke Access"
                      >
                        <Trash size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {users?.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-sm">
                    No HR users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
