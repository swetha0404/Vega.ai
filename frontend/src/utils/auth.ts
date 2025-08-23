// Authentication utility functions for JWT token management

export interface User {
  username: string;
  email?: string;
  role: string;
  is_active: boolean;
  created_at?: string;
  last_login?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export const auth = {
  // Get authentication token
  getToken: (): string | null => {
    return localStorage.getItem('authToken');
  },

  // Get token type (usually 'Bearer')
  getTokenType: (): string => {
    return localStorage.getItem('tokenType') || 'bearer';
  },

  // Get current user info
  getCurrentUser: (): User | null => {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return null;
      
      const user = JSON.parse(userStr);
      
      // Validate user object structure
      if (!user || typeof user !== 'object' || !user.username || !user.role) {
        console.warn('Invalid user data found, clearing localStorage');
        auth.logout();
        return null;
      }
      
      return user;
    } catch (error) {
      console.error('Failed to parse user data:', error);
      auth.logout();
      return null;
    }
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    try {
      const token = auth.getToken();
      const expiry = localStorage.getItem('tokenExpiry');
      
      if (!token || !expiry) {
        // console.log('Auth check: No token or expiry found');
        return false;
      }
      
      // Check if token is expired
      const expiryDate = new Date(expiry);
      const now = new Date();
      
      // Validate expiry date
      if (isNaN(expiryDate.getTime())) {
        console.warn('Invalid expiry date, logging out');
        auth.logout();
        return false;
      }
      
      // console.log('Auth check:', {
      //   tokenExpiry: expiryDate.toISOString(),
      //   currentTime: now.toISOString(),
      //   isExpired: now >= expiryDate
      // });
      
      if (now >= expiryDate) {
        // console.log('Token expired, logging out');
        auth.logout();
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Auth check failed:', error);
      auth.logout();
      return false;
    }
  },

  // Check if user is admin
  isAdmin: (): boolean => {
    try {
      const user = auth.getCurrentUser();
      return user?.role === 'admin';
    } catch (error) {
      console.error('Failed to check admin status:', error);
      return false;
    }
  },

  // Get authorization header
  getAuthHeader: (): Record<string, string> => {
    const token = auth.getToken();
    const tokenType = auth.getTokenType();
    
    if (!token) return {};
    
    return {
      'Authorization': `${tokenType} ${token}`
    };
  },

  // Store login data
  storeLoginData: (loginResponse: LoginResponse): void => {
    try {
      localStorage.setItem('authToken', loginResponse.access_token);
      localStorage.setItem('tokenType', loginResponse.token_type);
      localStorage.setItem('user', JSON.stringify(loginResponse.user));
      localStorage.setItem('userRole', loginResponse.user.role);
      localStorage.setItem('tokenExpiry', new Date(Date.now() + (loginResponse.expires_in * 1000)).toISOString());
      
      // console.log('Login data stored successfully');
    } catch (error) {
      console.error('Failed to store login data:', error);
      throw new Error('Failed to store authentication data');
    }
  },

  // Logout user
  logout: (): void => {
    try {
      localStorage.removeItem('authToken');
      localStorage.removeItem('tokenType');
      localStorage.removeItem('user');
      localStorage.removeItem('userRole');
      localStorage.removeItem('tokenExpiry');
      
      // console.log('Logout completed successfully');
    } catch (error) {
      console.error('Error during logout:', error);
      // Continue with logout even if there's an error
    }
  }
};

export default auth;