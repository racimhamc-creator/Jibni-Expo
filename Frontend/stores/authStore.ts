import { create } from 'zustand';
import { User, Profile } from '@/types/user';
import { api } from '@/services/api';
import { storage } from '@/services/storage';
import { socketService } from '@/services/socket';

interface AuthState {
  user: (User & { profile?: Profile }) | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (phoneNumber: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  updateUser: (user: User & { profile?: Profile }) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (phoneNumber: string, code: string) => {
    try {
      const response = await api.verifyOTP(phoneNumber, code);
      
      if (response.status !== 'success') {
        throw new Error('OTP verification failed');
      }

      const { user, token, refreshToken } = response;
      
      await storage.setToken(token);
      await storage.setRefreshToken(refreshToken);
      await storage.setUser(user);

      // Connect sockets based on role
      if (user.role === 'driver') {
        socketService.connectServer(token);
      }
      socketService.connectMissions(token);

      set({ user, token, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await storage.clear();
      socketService.disconnect();
      set({ user: null, token: null, isAuthenticated: false });
    }
  },

  refreshAuth: async () => {
    try {
      const token = await storage.getToken();
      const refreshToken = await storage.getRefreshToken();
      const user = await storage.getUser();

      if (!token || !refreshToken || !user) {
        set({ user: null, token: null, isAuthenticated: false, isLoading: false });
        return;
      }

      // First, try to validate current token by fetching user data
      try {
        const currentUser = await api.getCurrentUser();
        // Token is still valid - use it
        await storage.setUser(currentUser);
        
        // Reconnect sockets
        if (currentUser.role === 'driver') {
          socketService.connectServer(token);
        }
        socketService.connectMissions(token);

        set({ user: currentUser, token, isAuthenticated: true, isLoading: false });
      } catch (error) {
        // Token expired or invalid - try to refresh
        try {
          const { token: newToken, refreshToken: newRefreshToken } = await api.refreshToken(refreshToken);
          await storage.setToken(newToken);
          await storage.setRefreshToken(newRefreshToken);
          
          // Fetch fresh user data
          const currentUser = await api.getCurrentUser();
          await storage.setUser(currentUser);
          
          // Reconnect sockets
          if (currentUser.role === 'driver') {
            socketService.connectServer(newToken);
          }
          socketService.connectMissions(newToken);

          set({ user: currentUser, token: newToken, isAuthenticated: true, isLoading: false });
        } catch (refreshError) {
          // Refresh failed, clear auth
          console.error('Token refresh failed:', refreshError);
          await storage.clear();
          set({ user: null, token: null, isAuthenticated: false, isLoading: false });
        }
      }
    } catch (error) {
      console.error('Auth refresh error:', error);
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },

  updateUser: (user: User & { profile?: Profile }) => {
    set({ user });
    storage.setUser(user);
  },
}));
