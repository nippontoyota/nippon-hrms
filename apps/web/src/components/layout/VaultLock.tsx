import { useState, useEffect } from 'react';
import { LockKey, LockOpen, Eye, EyeSlash, CircleNotch } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVaultStore } from '@/stores/vaultStore';
import toast from 'react-hot-toast';
import api from '@/lib/axios';

export default function VaultLock({ isCollapsed }: { isCollapsed: boolean }) {
  const vaultToken = useVaultStore(s => s.vaultToken);
  const setVaultToken = useVaultStore(s => s.setVaultToken);
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const unlocked = !!vaultToken;

  useEffect(() => {
    if (!unlocked) return;
    const interval = setInterval(() => {
      const state = useVaultStore.getState();
      if (state.unlockedAt && Date.now() - state.unlockedAt > 30 * 60 * 1000) {
        state.setVaultToken(null);
        toast.error('Privacy Mode auto-enabled for security (session expired).');
        setTimeout(() => window.location.reload(), 500);
      }
    }, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [unlocked]);

  const handleToggle = () => {
    if (unlocked) {
      setVaultToken(null);
      toast.success('Privacy mode enabled. Sensitive data masked.');
    } else {
      setIsOpen(true);
    }
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || isLoading) return;
    
    setIsLoading(true);
    try {
      await api.post('/vault/verify', {}, {
        headers: { 'X-Vault-Token': password }
      });
      setVaultToken(password);
      setPassword('');
      setIsOpen(false);
      toast.success('Privacy mode disabled. Sensitive data visible.');
      // Force a small delay then reload to refetch without masking
      setTimeout(() => {
          window.location.reload();
      }, 500);
    } catch {
      setPassword('');
      toast.error('Invalid Administrator Password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleToggle}
        className={`group relative flex items-center ${
          isCollapsed ? 'justify-center' : 'gap-3'
        } px-3 py-2.5 transition-colors font-semibold text-[13px] rounded-md ${
          unlocked
            ? 'text-[#eb0a1e] hover:bg-red-50 dark:text-[#eb0a1e] dark:hover:bg-red-900/30'
            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
        }`}
      >
        {unlocked ? (
          <LockOpen size={20} weight="bold" className="shrink-0" />
        ) : (
          <LockKey size={20} weight="bold" className="shrink-0" />
        )}
        
        <AnimatePresence>
          {!isCollapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="truncate whitespace-nowrap"
            >
              {unlocked ? 'Privacy Mode: Off' : 'Privacy Mode: On'}
            </motion.span>
          )}
        </AnimatePresence>

        {isCollapsed && (
          <div className="absolute left-full ml-4 px-3 py-1.5 bg-slate-800 dark:bg-slate-700 text-white text-xs font-semibold rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 translate-x-[-4px] group-hover:translate-x-0 pointer-events-none border border-slate-700 dark:border-slate-600">
            {unlocked ? 'Privacy Mode: Off' : 'Privacy Mode: On'}
            <div className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-2 bg-slate-800 dark:bg-slate-700 rotate-45 border-l border-b border-slate-700 dark:border-slate-600"></div>
          </div>
        )}
      </button>

      {/* Unlock Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-700"
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4 text-slate-800 dark:text-slate-200">
                  <LockKey size={24} weight="fill" />
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">Disable Privacy Mode</h3>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                  Enter the Administrator Password to reveal sensitive payroll and employee data.
                </p>
                <form onSubmit={handleUnlock} className="space-y-4">
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Administrator Password"
                      autoFocus
                      disabled={isLoading}
                      className="w-full px-4 py-2.5 pr-10 bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-500/50 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors focus:outline-none"
                    >
                      {showPassword ? <EyeSlash size={18} weight="bold" /> : <Eye size={18} weight="bold" />}
                    </button>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      disabled={isLoading}
                      className="flex-1 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!password.trim() || isLoading}
                      className="flex flex-1 items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isLoading ? (
                        <>
                          <CircleNotch size={16} weight="bold" className="animate-spin" />
                          Authenticating...
                        </>
                      ) : (
                        'Authenticate'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
