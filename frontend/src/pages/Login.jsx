import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('http://localhost:8000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      console.log('Login response:', res);
      const data = await res.json();
      console.log('Login data:', data);
      if (data.success) {
        sessionStorage.setItem('username', username);
        sessionStorage.setItem('role', data.role);
        console.log('Set role in sessionStorage:', data.role);
        if (data.role === 'admin') {
          window.location.href = '/settings';
        } else {
          window.location.href = '/applications';
        }
      } else {
        setError('Invalid credentials');
      }
    } catch (err) {
      setError('Server error');
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
          <span>AI Assistant</span>
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