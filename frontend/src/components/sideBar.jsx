import { useNavigate } from "react-router-dom";
import auth from '../utils/auth.js';

import './sidebarLayout.css'; 

import { useState, useRef } from "react";

function Sidebar({ isOpen, toggleSidebar }) {
    const navigate = useNavigate();
    const isAdmin = auth.isAdmin();

    const username = sessionStorage.getItem('username') || 'User';
    const avatarLetter = username ? username.charAt(0).toUpperCase() : 'U';

    const handleLogout = () => {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('username');
        window.location.href = '/login';
    };


    return (
        <>
            <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
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
                    <div className="sidebar-item">
                        <span>About Us</span>
                    </div>
                </nav>
            <div className="user-info-footer">
                <div className="user-avatar-container">
                    <div
                        className="user-avatar user-avatar-circle"
                        title={username}
                    >
                        {avatarLetter}
                    </div>
                </div>
                <div className="user-details">
                    <span className="user-greeting">Logged in as</span>
                    <span className="user-name">{username}</span>
                </div>
                <button
                    className="logout-button"
                    onClick={handleLogout}
                    title="Logout"
                >
                    <img src="/power-off.png" alt="Logout" className="logout-icon" />
                </button>
            </div>
            </aside>
        </>
    );
}

export default Sidebar;
