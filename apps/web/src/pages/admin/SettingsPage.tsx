import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { useAuthStore } from '@/stores/authStore';
import { Shield, Key, Users, Trash, Plus, Spinner, Eye, EyeSlash } from '@phosphor-icons/react';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'access' | 'vault'>('vault');
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'SUPER_ADMIN';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wide">Settings & Security</h2>
      </div>

      <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-lg w-fit mb-6">
        <button
          onClick={() => setActiveTab('vault')}
          className={`px-5 py-2.5 font-bold text-xs uppercase tracking-wider flex items-center gap-2 rounded-md transition-all duration-200 ${
            activeTab === 'vault'
              ? 'bg-white dark:bg-slate-700 text-red-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
          }`}
        >
          <Shield size={18} weight={activeTab === 'vault' ? "fill" : "bold"} /> Privacy Mode
        </button>
        {isSuperAdmin && (
          <button
            onClick={() => setActiveTab('access')}
            className={`px-5 py-2.5 font-bold text-xs uppercase tracking-wider flex items-center gap-2 rounded-md transition-all duration-200 ${
              activeTab === 'access'
                ? 'bg-white dark:bg-slate-700 text-red-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
            }`}
          >
            <Users size={18} weight={activeTab === 'access' ? "fill" : "bold"} /> Access Management
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
    <div className="bg-white dark:bg-slate-900 rounded-none border border-slate-200 dark:border-slate-800 p-4 sm:p-6 w-full max-w-md mx-auto shadow-sm mt-8">
      <div className="flex sm:items-center items-start gap-2 mb-6">
        <Key size={20} weight="fill" className="text-slate-900 dark:text-white" />
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Change Privacy Mode Password</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">Current Password</label>
          <div className="relative">
            <input
              type={showCurrent ? "text" : "password"}
              className="w-full bg-slate-50 dark:bg-slate-800 rounded-none pl-3 pr-10 py-2.5 text-sm text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 focus:border-red-600 focus:outline-none transition-colors"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              placeholder="Current password"
              required
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              {showCurrent ? <EyeSlash size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">New Password</label>
          <div className="relative">
            <input
              type={showNew ? "text" : "password"}
              className="w-full bg-slate-50 dark:bg-slate-800 rounded-none pl-3 pr-10 py-2.5 text-sm text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 focus:border-red-600 focus:outline-none transition-colors"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              placeholder="New password"
              required
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              {showNew ? <EyeSlash size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">Confirm New Password</label>
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              className="w-full bg-slate-50 dark:bg-slate-800 rounded-none pl-3 pr-10 py-2.5 text-sm text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 focus:border-red-600 focus:outline-none transition-colors"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm password"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              {showConfirm ? <EyeSlash size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading || !current || !newPass || !confirm}
            className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-white font-bold py-2.5 rounded-none uppercase tracking-wider text-xs transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
          >
            {loading ? <Spinner className="animate-spin" size={14} /> : <Key size={14} weight="bold" />}
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
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<{id: string, email: string} | null>(null);
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Manage HR staff access. Only Super Admins can add or remove HR accounts.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="w-full sm:w-auto justify-center bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-5 py-2.5 rounded-md font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-sm shrink-0"
        >
          <Plus size={16} weight="bold" /> Add HR User
        </button>
      </div>

      {showCreate && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-lg shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Users size={20} weight="duotone" className="text-slate-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Add New HR User</h3>
          </div>
          <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
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
                Create User
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
        <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto bg-white dark:bg-slate-900 shadow-sm">
          <table className="w-full text-left text-sm whitespace-nowrap min-w-[600px]">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-[11px] text-slate-500 dark:text-slate-400">HR User</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-[11px] text-slate-500 dark:text-slate-400">Role</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-[11px] text-slate-500 dark:text-slate-400">Created At</th>
                <th className="px-6 py-4 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {users?.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                        {u.email.charAt(0)}
                      </div>
                      <span className="font-semibold text-slate-900 dark:text-white">{u.email}</span>
                    </div>
                  </td>
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
                        onClick={() => setDeleteConfirmUser({ id: u.id, email: u.email })}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors"
                        title="Remove Access"
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

      <ConfirmDialog
        open={!!deleteConfirmUser}
        title="Remove HR Access"
        message={`Are you sure you want to completely remove access for ${deleteConfirmUser?.email}? They will instantly lose access to the portal.`}
        confirmLabel="Remove Access"
        danger={true}
        onConfirm={() => {
          if (deleteConfirmUser) deleteMut.mutate(deleteConfirmUser.id);
          setDeleteConfirmUser(null);
        }}
        onCancel={() => setDeleteConfirmUser(null)}
      />
    </div>
  );
}
