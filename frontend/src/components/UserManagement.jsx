import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import auth from '../utils/auth.js';
import Sidebar from './sideBar';
import Topbar from './topBar.jsx';
import './userManagement.css';

const API_BASE = import.meta.env.BACKEND_URL || "http://localhost:8000";

function UserManagement() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    email: '',
    role: 'user'
  });

  // Get auth token from localStorage
  const getAuthToken = () => {
    return auth.getToken();
  };

  // Check if user is admin
  const isAdmin = () => {
    return auth.isAdmin();
  };

  // Fetch users list
  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized - please login again');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Create new user
  const createUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newUser)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setUsers([...users, data]);
      setNewUser({ username: '', password: '', email: '', role: 'user' });
      setShowCreateForm(false);
      setSuccess('User created successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete user
  const deleteUser = async (username) => {
    if (!confirm(`Are you sure you want to delete user "${username}"?`)) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE}/users/${username}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      setUsers(users.filter(user => user.username !== username));
      setSuccess('User deleted successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  useEffect(() => {
    if (isAdmin()) {
      fetchUsers();
    }
  }, []);

  if (!isAdmin()) {
    return (
      <div className="user-management-page">
        <Topbar />
        <Sidebar />
        <main className="user-management-content">
          <div className="user-management-container">
            <div className="access-denied">
              <h2>Access Denied</h2>
              <p>You need admin privileges to access user management.</p>
              <button className="back-btn" onClick={() => navigate('/')}>
                ← Back to Home
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="user-management-page">
      <Topbar />
      <Sidebar />
      <main className="user-management-content">
        <div className="user-management-container">
          <div className="user-management-header">
            <div className="header-left">
              <button className="back-btn" onClick={() => navigate('/')}>
                ← Back to Home
              </button>
              <h2>User Management</h2>
            </div>
            <button 
              className="create-user-btn"
              onClick={() => setShowCreateForm(!showCreateForm)}
              disabled={loading}
            >
              {showCreateForm ? 'Cancel' : 'Create User'}
            </button>
          </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {showCreateForm && (
        <form onSubmit={createUser} className="create-user-form">
          <h3>Create New User</h3>
          <div className="form-group">
            <label>Username:</label>
            <input
              type="text"
              value={newUser.username}
              onChange={(e) => setNewUser({...newUser, username: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label>Password:</label>
            <input
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser({...newUser, password: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label>Email:</label>
            <input
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser({...newUser, email: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label>Role:</label>
            <select
              value={newUser.role}
              onChange={(e) => setNewUser({...newUser, role: e.target.value})}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="form-actions">
            <button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create User'}
            </button>
            <button type="button" onClick={() => setShowCreateForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="users-list">
        <h3>Users ({users.length})</h3>
        {loading && <div className="loading">Loading users...</div>}
        
        {users.length === 0 && !loading && (
          <div className="no-users">No users found.</div>
        )}

        {users.length > 0 && (
          <table className="users-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.username}>
                  <td>{user.username}</td>
                  <td>{user.email || 'N/A'}</td>
                  <td>
                    <span className={`role-badge ${user.role}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${user.is_active ? 'active' : 'inactive'}`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{formatDate(user.created_at)}</td>
                  <td>{formatDate(user.last_login)}</td>
                  <td>
                    <button 
                      className="delete-btn"
                      onClick={() => deleteUser(user.username)}
                      disabled={loading}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
        </div>
      </main>
    </div>
  );
}

export default UserManagement;
