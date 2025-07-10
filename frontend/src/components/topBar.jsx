import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './topBarLayout.css'

function Topbar() {
  const [active, setActive] = useState('Applications');
  const [showDropdown, setShowDropdown] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const dropdownRef = useRef(null);
  const avatarRef = useRef(null);

  useEffect(() => {
    // Trigger logo animation after component mounts
    setLogoLoaded(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        avatarRef.current &&
        !avatarRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const username = sessionStorage.getItem('username') || 'User';
  const avatarLetter = username ? username.charAt(0).toUpperCase() : 'U';
  const navigate = useNavigate();

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('username');
    window.location.href = '/login';
  };

  return (
    <div className="top-header">
      <div className="header-logo" onClick={() => navigate('/applications')} style={{ cursor: 'pointer' }}>
        <img 
          src="/Vega_Neon.png" 
          alt="Vega Logo" 
          // className={logoLoaded ? 'flicker-in-1' : ''} 
          // style={{ visibility: logoLoaded ? 'visible' : 'hidden' }}
        />
      </div>
      <div className="header-app-name">IAM-Copilot</div> 
      <div className="header-user-info">
        <div
          className="user-avatar user-avatar-circle"
          ref={avatarRef}
          onClick={() => setShowDropdown((prev) => !prev)}
          tabIndex={0}
          title='Dropdown'
        >
          {avatarLetter}
          
        </div>
        <div className="header-user-text">
          <div className="greeting">Hi there,</div>
          <div className="username">{username}</div>
        </div>
        {showDropdown && (
          <div
            className="logout-dropdown"
            ref={dropdownRef}
            onClick={handleLogout}
            style={{ cursor: 'pointer' }}
          >
            Logout
          </div>
        )}
      </div>
    </div>
  );
}

export default Topbar;