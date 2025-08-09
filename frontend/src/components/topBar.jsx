import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './topBarLayout.css'

function Topbar({ toggleSidebar }) {
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
      <div className="header-left-group">
        <div className="header-app-name">IAM-Copilot</div> 
        <button className="hamburger" onClick={toggleSidebar}>
            ☰
        </button>
      </div>
      <div className="header-logo" onClick={() => navigate('/applications')} style={{ cursor: 'pointer' }}>
        <img 
          src="/Vega_latest.png" 
          alt="Vega Logo" 
          // className={logoLoaded ? 'flicker-in-1' : ''} 
          // style={{ visibility: logoLoaded ? 'visible' : 'hidden' }}
        />
      </div>
    </div>
  );
}

export default Topbar;