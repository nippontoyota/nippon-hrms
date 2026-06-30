import { useState } from 'react';
import { LockKey, LockOpen } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVaultStore } from '@/stores/vaultStore';
import toast from 'react-hot-toast';

export default function VaultLock({ isCollapsed }: { isCollapsed: boolean }) {
  const { setVaultToken, isUnlocked } = useVaultStore();
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState('');

  const unlocked = isUnlocked();

  const handleToggle = () => {
    if (unlocked) {
      setVaultToken(null);
      toast.success('Vault locked. Sensitive data masked.');
    } else {
      setIsOpen(true);
    }
  };

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setVaultToken(password);
    setPassword('');
    setIsOpen(false);
    toast.success('Vault unlocked! Sensitive data visible.');
    // Force a small delay then reload to refetch without masking
    setTimeout(() => {
        window.location.reload();
    }, 500);
  };

  return (
    <>
      <button
        onClick={handleToggle}
        className={`group relative flex items-center ${
          isCollapsed ? 'justify-center' : 'gap-3'
        } px-3 py-2.5 transition-colors font-semibold text-[13px] rounded-md ${
          unlocked
            ? 'text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/30'
            : 'text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/30'
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
              {unlocked ? 'Vault Unlocked' : 'Vault Locked'}
            </motion.span>
          )}
        </AnimatePresence>

        {isCollapsed && (
          <div className="absolute left-full ml-4 px-3 py-1.5 bg-slate-800 dark:bg-slate-700 text-white text-xs font-semibold rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 translate-x-[-4px] group-hover:translate-x-0 pointer-events-none border border-slate-700 dark:border-slate-600">
            {unlocked ? 'Vault Unlocked' : 'Vault Locked'}
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
                <div className="flex items-center gap-3 mb-4 text-amber-600 dark:text-amber-500">
                  <LockKey size={24} weight="fill" />
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">Unlock Vault</h3>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                  Enter the HR Root Password to reveal sensitive payroll and employee data.
                </p>
                <form onSubmit={handleUnlock} className="space-y-4">
                  <div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Root Password"
                      autoFocus
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/50 dark:text-white"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="flex-1 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!password.trim()}
                      className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-amber-500 rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Unlock
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
