import { useState, useEffect } from 'react';
import { auth, User } from '@/utils/auth';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  userRole: "user" | "admin";
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    userRole: "user"
  });

  useEffect(() => {
    const checkAuth = () => {
      try {
        const isAuthenticated = auth.isAuthenticated();
        const user = auth.getCurrentUser();
        const userRole = (user?.role as "user" | "admin") || "user";

        setAuthState({
          user,
          isAuthenticated,
          isLoading: false,
          userRole
        });
      } catch (error) {
        console.error('Auth check failed:', error);
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          userRole: "user"
        });
      }
    };

    checkAuth();

    // Optional: Set up periodic auth checks
    const interval = setInterval(checkAuth, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const login = (loginResponse: any) => {
    try {
      auth.storeLoginData(loginResponse);
      setAuthState({
        user: loginResponse.user,
        isAuthenticated: true,
        isLoading: false,
        userRole: loginResponse.user.role || "user"
      });
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = () => {
    try {
      auth.logout();
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        userRole: "user"
      });
    } catch (error) {
      console.error('Logout failed:', error);
      // Still update state even if logout had issues
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        userRole: "user"
      });
    }
  };

  return {
    ...authState,
    login,
    logout,
    isAdmin: authState.userRole === "admin"
  };
};
