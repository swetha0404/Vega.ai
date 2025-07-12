// Higher-order components for route protection
import { auth } from './auth.js';

// Higher-order component for protecting routes
export const withAuth = (Component) => {
  return function AuthenticatedComponent(props) {
    if (!auth.isAuthenticated()) {
      window.location.href = '/';
      return null;
    }
    
    return <Component {...props} />;
  };
};

// Higher-order component for admin-only routes
export const withAdminAuth = (Component) => {
  return function AdminAuthenticatedComponent(props) {
    if (!auth.isAuthenticated()) {
      window.location.href = '/';
      return null;
    }
    
    if (!auth.isAdmin()) {
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>Access Denied</h2>
          <p>You need admin privileges to access this page.</p>
        </div>
      );
    }
    
    return <Component {...props} />;
  };
};
