import { create } from 'zustand';
import * as secureStore from 'expo-secure-store';
import { User } from '../types';
import { disconnectSocket } from '../services/socket';

interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  login: (token: string, user?: User) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateUser: (updatedData: Partial<User>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoading: true,

  checkAuth: async () => {
    try {
      const token = await secureStore.getItemAsync('authToken');
      const userJson = await secureStore.getItemAsync('authUser');
      let user: User | null = userJson ? JSON.parse(userJson) : null;

      // টোকেন থাকলে কিন্তু ইউজার ক্যাশ না থাকলে JWT থেকে রিকভার করুন
      if (token && !user) {
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const base64Url = parts[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
              atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
            );
            const decoded = JSON.parse(jsonPayload);
            user = {
              id: decoded.sub || decoded.id || '',
              name: decoded.name || 'User',
              email: decoded.email || '',
            };
            await secureStore.setItemAsync('authUser', JSON.stringify(user));
          }
        } catch (e) {
          console.log('JWT decode fallback error:', e);
        }
      }

      set({ token, user, isLoading: false });
    } catch (error) {
      set({ token: null, user: null, isLoading: false });
    }
  },

  login: async (token: string, user?: User) => {
    try {
      await secureStore.setItemAsync('authToken', token);
      if (user) {
        await secureStore.setItemAsync('authUser', JSON.stringify(user));
      }
      set({ token, user: user || null, isLoading: false });
    } catch (error) {
      set({ token: null, user: null, isLoading: false });
    }
  },

  updateUser: async (updatedData: Partial<User>) => {
    set((state) => {
      if (!state.user) return state;
      const updatedUser = { ...state.user, ...updatedData };
      secureStore.setItemAsync('authUser', JSON.stringify(updatedUser)).catch(console.error);
      return { user: updatedUser };
    });
  },

  logout: async () => {
    try {
      disconnectSocket();
      await secureStore.deleteItemAsync('authToken');
      await secureStore.deleteItemAsync('authUser');
      set({ token: null, user: null, isLoading: false });
    } catch (error) {
      set({ token: null, user: null, isLoading: false });
    }
  },
}));