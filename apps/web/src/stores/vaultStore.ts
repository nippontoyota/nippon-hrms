import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface VaultState {
  vaultToken: string | null;
  setVaultToken: (token: string | null) => void;
  isUnlocked: () => boolean;
}

export const useVaultStore = create<VaultState>()(
  persist(
    (set, get) => ({
      vaultToken: null,
      setVaultToken: (token) => set({ vaultToken: token }),
      isUnlocked: () => !!get().vaultToken,
    }),
    {
      name: 'vault-storage',
    }
  )
);
