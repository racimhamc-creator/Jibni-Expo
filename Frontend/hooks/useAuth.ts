import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';

export const useAuth = () => {
  const { user, isAuthenticated, isLoading, refreshAuth, logout } = useAuthStore();

  useEffect(() => {
    refreshAuth();
  }, []);

  return {
    user,
    isAuthenticated,
    isLoading,
    logout,
  };
};
