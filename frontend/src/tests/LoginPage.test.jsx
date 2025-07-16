import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';

// Mock the auth utilities
vi.mock('../utils/auth.js', () => ({
  default: {
    login: vi.fn(),
    isAuthenticated: vi.fn(() => false),
  }
}));

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderLoginPage = () => {
  return render(
    <BrowserRouter>
      <LoginPage />
    </BrowserRouter>
  );
};

describe('LoginPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form', () => {
    renderLoginPage();
    
    expect(screen.getByText(/login/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i) || screen.getByPlaceholderText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i) || screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('handles form submission', async () => {
    const auth = require('../utils/auth.js').default;
    auth.login.mockResolvedValue({ success: true });

    renderLoginPage();
    
    const usernameInput = screen.getByLabelText(/username/i) || screen.getByPlaceholderText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i) || screen.getByPlaceholderText(/password/i);
    const loginButton = screen.getByRole('button', { name: /login/i });

    fireEvent.change(usernameInput, { target: { value: 'test' } });
    fireEvent.change(passwordInput, { target: { value: 'password' } });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(auth.login).toHaveBeenCalledWith('test', 'password');
    });
  });

  it('displays error message on failed login', async () => {
    const auth = require('../utils/auth.js').default;
    auth.login.mockRejectedValue(new Error('Invalid credentials'));

    renderLoginPage();
    
    const usernameInput = screen.getByLabelText(/username/i) || screen.getByPlaceholderText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i) || screen.getByPlaceholderText(/password/i);
    const loginButton = screen.getByRole('button', { name: /login/i });

    fireEvent.change(usernameInput, { target: { value: 'invalid' } });
    fireEvent.change(passwordInput, { target: { value: 'invalid' } });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i) || screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('prevents submission with empty fields', () => {
    renderLoginPage();
    
    const loginButton = screen.getByRole('button', { name: /login/i });
    fireEvent.click(loginButton);

    // Should not call login with empty fields
    const auth = require('../utils/auth.js').default;
    expect(auth.login).not.toHaveBeenCalled();
  });
});
