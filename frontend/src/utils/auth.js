// Authentication utility functions for JWT token management

export const auth = {
  // Get authentication token
  getToken: () => {
    return localStorage.getItem('authToken');
  },

  // Get token type (usually 'Bearer')
  getTokenType: () => {
    return localStorage.getItem('tokenType') || 'Bearer';
  },

  // Get current user info
  getCurrentUser: () => {
    const username = localStorage.getItem('username');
    const role = localStorage.getItem('userRole');
    const email = localStorage.getItem('userEmail');
    
    if (!username) return null;
    
    return {
      username,
      role,
      email
    };
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    const token = auth.getToken();
    const expiry = localStorage.getItem('tokenExpiry');
    
    if (!token || !expiry) return false;
    
    // Check if token is expired
    const expiryDate = new Date(expiry);
    const now = new Date();
    
    if (now >= expiryDate) {
      auth.logout();
      return false;
    }
    
    return true;
  },

  // Check if user is admin
  isAdmin: () => {
    const user = auth.getCurrentUser();
    return user && user.role === 'admin';
  },

  // Get authorization header
  getAuthHeader: () => {
    const token = auth.getToken();
    const tokenType = auth.getTokenType();
    
    if (!token) return {};
    
    return {
      'Authorization': `${tokenType} ${token}`
    };
  },

  // Logout user
  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('tokenType');
    localStorage.removeItem('username');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('tokenExpiry');
  },

  // Make authenticated API request
  fetchWithAuth: async (url, options = {}) => {
    const authHeader = auth.getAuthHeader();
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
        ...options.headers
      }
    });

    // If unauthorized, redirect to login
    if (response.status === 401) {
      auth.logout();
      window.location.href = '/';
      return;
    }

    return response;
  }
};

export default auth;
