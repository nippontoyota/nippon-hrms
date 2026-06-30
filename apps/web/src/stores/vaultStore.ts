import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface VaultState {
  vaultToken: string | null;
  unlockedAt: number | null;
  setVaultToken: (token: string | null) => void;
  isUnlocked: () => boolean;
}

export const useVaultStore = create<VaultState>()(
  persist(
    (set, get) => ({
      vaultToken: null,
      unlockedAt: null,
      setVaultToken: (token) => set({ vaultToken: token, unlockedAt: token ? Date.now() : null }),
      isUnlocked: () => !!get().vaultToken,
    }),
    {
      name: 'vault-storage',
    }
  )
);
