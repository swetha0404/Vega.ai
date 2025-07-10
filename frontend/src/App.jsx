import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';
import Login from './pages/Login';
import HomePage from './pages/HomePage';
import Services from './pages/ServicesPage';
import SettingsPage from './pages/SettingsPage';
import ChatPage from './pages/ChatPage';


function App() {
  const role = sessionStorage.getItem('role');
  const isAuthenticated = !!sessionStorage.getItem('role');

  return (
    <Router>
      <Routes>

        <Route 
          path="/login" element={<Login />} />

        <Route
          path="/applications"
          element={isAuthenticated ? <HomePage /> : <Navigate to="/login" />}
        />

        <Route
          path = "/services"
          element={isAuthenticated ? <Services /> : <Navigate to="/login" />}
        />

        <Route
          path = "/chatpage"
          element={isAuthenticated ? <ChatPage /> : <Navigate to="/login" />}
        />

        <Route
          path="/*"
          element={<Navigate to={isAuthenticated ? "/applications" : "/login"} />}
        />
        
        <Route
        path="/settings"
        element={
          role === 'admin'
            ? <SettingsPage />
            : <Navigate to={role === 'user' ? "/applications" : "/login"} />
        }
        />
      </Routes>
    </Router>
  );
}

export default App;