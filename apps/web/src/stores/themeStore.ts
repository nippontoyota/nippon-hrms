import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  isDark: boolean;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      isDark: false,

      toggleTheme: () => set({ isDark: !get().isDark }),
    }),
    {
      name: 'payslip-portal-theme',
      partialize: (state) => ({ isDark: state.isDark }),
    },
  ),
);
