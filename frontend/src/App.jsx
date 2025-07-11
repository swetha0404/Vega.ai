import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';
import Login from './pages/LoginPage';
import Home from './pages/HomePage';
import Services from './pages/ServicesPage';
import Settings from './pages/SettingsPage';
import Chat from './pages/ChatPage';


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
          path="/*"
          element={<Navigate to={isAuthenticated ? "/applications" : "/login"} />}
        />
        
        <Route
        path="/settings"
        element={
          role === 'admin'
            ? <Settings />
            : <Navigate to={role === 'user' ? "/applications" : "/login"} />
        }
        />
      </Routes>
    </Router>
  );
}

export default App;