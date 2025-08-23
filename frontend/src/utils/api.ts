import { auth, LoginResponse } from './auth';

const API_BASE = (import.meta as any).env?.VITE_BACKEND_URL || "http://localhost:8000";

export interface LoginRequest {
  username: string;
  password: string;
}

export const api = {
  // Make authenticated API request
  fetchWithAuth: async (url: string, options: RequestInit = {}): Promise<Response> => {
    const authHeader = auth.getAuthHeader();
    
    const response = await fetch(`${API_BASE}${url}`, {
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
      throw new Error('Unauthorized');
    }

    return response;
  },

  // Login API call
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Login failed');
    }

    return await response.json();
  },

  // Get current user profile
  getProfile: async () => {
    const response = await api.fetchWithAuth('/profile');
    if (!response.ok) {
      throw new Error('Failed to fetch profile');
    }
    return await response.json();
  },

  // Health check
  healthCheck: async () => {
    const response = await fetch(`${API_BASE}/health`);
    return response.ok;
  }
};

export default api;