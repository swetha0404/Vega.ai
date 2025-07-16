import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';
import Login from './pages/LoginPage';
import Home from './pages/HomePage';
import Services from './pages/ServicesPage';
import Chat from './pages/ChatPage';
import Upload from './pages/UploadPage';
import UserManagement from './components/UserManagement';

import auth from './utils/auth.js';


function App() {
  // Updated to use the new auth system
  const isAuthenticated = auth.isAuthenticated();
  const isAdmin = auth.isAdmin();

  return (
    <Router>
      <Routes>

        <Route 
          path="/login" element={<Login />} />

        <Route
          path="/applications"
          element={isAuthenticated ? <Home /> : <Navigate to="/login" />}
        />

        <Route
          path = "/services"
          element={isAuthenticated ? <Services /> : <Navigate to="/login" />}
        />

        <Route
          path = "/chatpage"
          element={isAuthenticated ? <Chat /> : <Navigate to="/login" />}
        />

        <Route
          path="/settings"
          element={
            isAdmin
              ? <Upload />
              : <Navigate to={isAuthenticated ? "/applications" : "/login"} />
          }
        />

        <Route
          path="/avatartest"
          element={isAuthenticated ? <Chat /> : <Navigate to="/login" />}
        />

        <Route
          path="/users"
          element={
            isAdmin
              ? <UserManagement />
              : <Navigate to={isAuthenticated ? "/applications" : "/login"} />
          }
        />

        <Route
          path="/*"
          element={<Navigate to={isAuthenticated ? "/applications" : "/login"} />}
        />

      </Routes>
    </Router>
  );
}

export default App;