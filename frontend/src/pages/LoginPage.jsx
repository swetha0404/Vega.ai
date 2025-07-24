import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './loginPageLayout.css';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      console.log('Login response:', res);
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Login failed');
      }
      
      const data = await res.json();
      console.log('Login data:', data);
      
      if (data.access_token) {
        // Store JWT token and user information
        localStorage.setItem('authToken', data.access_token);
        localStorage.setItem('tokenType', data.token_type);
        localStorage.setItem('username', data.user.username);
        localStorage.setItem('userRole', data.user.role);
        localStorage.setItem('userEmail', data.user.email || '');
        localStorage.setItem('tokenExpiry', new Date(Date.now() + (data.expires_in * 1000)).toISOString());
        
        console.log('Set user data in localStorage:', data.user);
        
        // Redirect based on role
        if (data.user.role === 'admin') {
          window.location.href = '/settings';
        } else {
          window.location.href = '/applications';
        }
      } else {
        setError('Invalid response from server');
      }
    } catch (err) {
      setError(err.message || 'Server error');
      console.log('Login error:', err);
    }
  };

  return (
    <div className="login-container">
      <div className="login-header">
        <img src="/Vega_Brain.png" alt="Vega Logo" className="login-logo" />
        <h1 className="cursor typewriter-animation">Welcome to Vega.ai</h1>
      </div>
      
      <form className="login-form" onSubmit={handleSubmit}>
        <h2>Your personal
          <span>Your personal</span>
          <span>Your personal</span>
          <span>IAM Assistant</span>
        </h2>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
        />
        <div className="password-input-container">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <button 
            type="button" 
            className="password-toggle-btn"
            onClick={() => setShowPassword(!showPassword)}
            title={showPassword ? "Hide password" : "Show password"}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            <img 
              src={showPassword ? "/eye-closed.png" : "/eye-open.png"} 
              alt={showPassword ? "Hide password" : "Show password"}
            />
          </button>
        </div>
        <button type="submit" className='submit-button'>
          {/*Add a subtle animation indicator*/}
          Enter <span className="login-arrow">→</span>
        </button>
        {error && <div className="error">{error}</div>}
      </form>
    </div>
  );
}

export default Login; 