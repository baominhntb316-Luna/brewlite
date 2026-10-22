import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  loginSuccess: (user: User, token: string) => void;
  logout: () => void;
  addLoyaltyPoints: (points: number) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      loginSuccess: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
      addLoyaltyPoints: (points) =>
        set((state) => ({
          user: state.user
            ? { ...state.user, loyaltyPoints: state.user.loyaltyPoints + points }
            : null,
        })),
    }),
    { name: 'brewlite-auth-storage' }
  )
);