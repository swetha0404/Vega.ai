import { useNavigate } from "react-router-dom";
import auth from '../utils/auth.js';
import './sideBarLayout.css'; 

function Sidebar() {
    const navigate = useNavigate();
    const isAdmin = auth.isAdmin();

    if (isAdmin) {
        return (
          <aside className="sidebar">
          <nav>
            <div className="sidebar-item" onClick={() => navigate('/applications')} style={{ cursor: 'pointer' }}>
              <span>Applications</span>
            </div>
            <div className="sidebar-item">
              <span>IAM-GPT</span>
            </div>
            <div className="sidebar-item" onClick={() => navigate('/settings')} style={{ cursor: 'pointer' }}>
              <span>Neural Archive</span>
            </div>
            <div className="sidebar-item" onClick={() => navigate('/users')} style={{ cursor: 'pointer' }}>
              <span>User Management</span>
            </div>
            {/* <div className="sidebar-item" onClick={() => navigate('/avatartest')} style={{ cursor: 'pointer' }}>
              <span>Avatar2</span>
            </div> */}
            <div className="sidebar-item">
              <span>About Us</span>
            </div>
          </nav>
        </aside>
        );
    }

    // Non-admin: show all items as before
    return (
        <aside className="sidebar">
        <nav>
          <div className="sidebar-item" onClick={() => navigate('/applications')} style={{ cursor: 'pointer' }}>
            <span>Applications</span>
          </div>
          <div className="sidebar-item" style={{ cursor: 'not-allowed', opacity: 0.6 }}>
            <span>IAM-GPT</span>
          </div>
          {/* <div className="sidebar-item" style={{ cursor: 'not-allowed', opacity: 0.6 }}>
            <span>Settings</span>
          </div> */}
          <div className="sidebar-item" style={{ cursor: 'not-allowed', opacity: 0.6 }}>
            <span>Support</span>
          </div>
          <div className="sidebar-item" style={{ cursor: 'not-allowed', opacity: 0.6 }}>
            <span>About Us</span>
          </div>
        </nav>
      </aside>
    );
}

export default Sidebar